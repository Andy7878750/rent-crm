CREATE TABLE "meters" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" uuid NOT NULL,
	"tenant_id" uuid,
	"resource" text NOT NULL,
	"number" text DEFAULT '' NOT NULL,
	"place" text DEFAULT '' NOT NULL,
	"day_night" boolean DEFAULT false NOT NULL,
	"verify_until" date,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "object_id" uuid;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN "category" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "meters" ADD CONSTRAINT "meters_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "meters_object_idx" ON "meters" USING btree ("object_id");--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "services_object_idx" ON "services" USING btree ("object_id");--> statement-breakpoint
-- Квитанции принадлежат объекту: каждую старую услугу аккаунта копируем на те объекты, где она действовала
-- (тариф «Все», арендаторы объекта в списке, суммы или показания), и переносим туда суммы, показания и тарифы.
DO $$
DECLARE s record; o record; tr record; nid uuid; ntr uuid; cat text;
BEGIN
  CREATE TEMP TABLE svc_map (old_id uuid, object_id uuid, new_id uuid) ON COMMIT DROP;
  FOR s IN SELECT * FROM services WHERE object_id IS NULL LOOP
    cat := CASE
      WHEN s.name ILIKE '%электр%' OR s.name ILIKE '%свет%' THEN 'el'
      WHEN s.name ILIKE '%водоотвед%' OR s.name ILIKE '%канализ%' THEN 'dr'
      WHEN s.name ILIKE '%горяч%' OR s.name ILIKE '%гвс%' THEN 'hw'
      WHEN s.name ILIKE '%холодн%' OR s.name ILIKE '%хвс%' OR s.name ILIKE '%вода%' THEN 'cw'
      WHEN s.name ILIKE '%отоплен%' OR s.name ILIKE '%тепло%' THEN 'heat'
      WHEN s.name ILIKE '%газ%' THEN 'gas'
      WHEN s.name ILIKE '%мусор%' OR s.name ILIKE '%тко%' THEN 'trash'
      WHEN s.name ILIKE '%капрем%' OR s.name ILIKE '%капитальн%' THEN 'kr'
      WHEN s.name ILIKE '%содержан%' THEN 'uk'
      WHEN s.name ILIKE '%интернет%' THEN 'net'
      WHEN s.name ILIKE '%домофон%' THEN 'dom'
      ELSE '' END;
    FOR o IN SELECT ob.id FROM objects ob WHERE ob.account_id = s.account_id AND (
        (ob.archived_at IS NULL AND EXISTS (SELECT 1 FROM tariffs t WHERE t.service_id = s.id AND t.who_all))
        OR EXISTS (SELECT 1 FROM tariffs t JOIN tariff_tenants tt ON tt.tariff_id = t.id JOIN tenants te ON te.id = tt.tenant_id
                   WHERE t.service_id = s.id AND te.object_id = ob.id)
        OR EXISTS (SELECT 1 FROM object_bills b WHERE b.service_id = s.id AND b.object_id = ob.id)
        OR EXISTS (SELECT 1 FROM readings r JOIN tenants te ON te.id = r.tenant_id WHERE r.service_id = s.id AND te.object_id = ob.id))
    LOOP
      INSERT INTO services (account_id, object_id, category, supplier, name, unit, kind, sort, created_at)
        VALUES (s.account_id, o.id, cat, s.supplier, s.name, s.unit, s.kind, s.sort, s.created_at) RETURNING id INTO nid;
      INSERT INTO svc_map VALUES (s.id, o.id, nid);
      FOR tr IN SELECT * FROM tariffs WHERE service_id = s.id LOOP
        IF tr.who_all OR EXISTS (SELECT 1 FROM tariff_tenants tt JOIN tenants te ON te.id = tt.tenant_id
                                 WHERE tt.tariff_id = tr.id AND te.object_id = o.id) THEN
          INSERT INTO tariffs (service_id, logic, price, price2, norm, norm_price, extra_name, sources, who_all, valid_from, created_at)
            VALUES (nid, tr.logic, tr.price, tr.price2, tr.norm, tr.norm_price, tr.extra_name, tr.sources, tr.who_all, tr.valid_from, tr.created_at)
            RETURNING id INTO ntr;
          INSERT INTO tariff_tenants (tariff_id, tenant_id)
            SELECT ntr, tt.tenant_id FROM tariff_tenants tt JOIN tenants te ON te.id = tt.tenant_id
            WHERE tt.tariff_id = tr.id AND te.object_id = o.id;
        END IF;
      END LOOP;
      UPDATE object_bills SET service_id = nid WHERE service_id = s.id AND object_id = o.id;
      UPDATE readings SET service_id = nid WHERE service_id = s.id AND tenant_id IN (SELECT id FROM tenants WHERE object_id = o.id);
    END LOOP;
  END LOOP;
  -- «От других услуг»: источники — копии на том же объекте.
  UPDATE tariffs t SET sources = ARRAY(
      SELECT m.new_id FROM unnest(t.sources) WITH ORDINALITY u(x, n)
      JOIN svc_map m ON m.old_id = u.x AND m.object_id = sv.object_id ORDER BY u.n)
    FROM services sv WHERE sv.id = t.service_id AND cardinality(t.sources) > 0 AND sv.object_id IS NOT NULL;
  DELETE FROM services WHERE object_id IS NULL;
END $$;

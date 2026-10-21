CREATE TABLE "accounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"requisites" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	"month" char(7) NOT NULL,
	"number" text NOT NULL,
	"issued_on" date NOT NULL,
	"total" numeric(14, 2) NOT NULL,
	"lines" jsonb NOT NULL,
	"paid_on" date,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "object_bills" (
	"object_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"month" char(7) NOT NULL,
	"amount" numeric(14, 2) NOT NULL,
	CONSTRAINT "object_bills_object_id_service_id_month_pk" PRIMARY KEY("object_id","service_id","month")
);
--> statement-breakpoint
CREATE TABLE "objects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"type" text DEFAULT 'nonres' NOT NULL,
	"short" text NOT NULL,
	"address" text DEFAULT '' NOT NULL,
	"floor" text DEFAULT '' NOT NULL,
	"uk_name" text DEFAULT '' NOT NULL,
	"uk_phone" text DEFAULT '' NOT NULL,
	"cabinet_url" text DEFAULT '' NOT NULL,
	"cabinet_login" text DEFAULT '' NOT NULL,
	"cabinet_hint" text DEFAULT '' NOT NULL,
	"is_owner" boolean DEFAULT false NOT NULL,
	"is_example" boolean DEFAULT false NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "readings" (
	"tenant_id" uuid NOT NULL,
	"service_id" uuid NOT NULL,
	"zone" text DEFAULT '' NOT NULL,
	"month" char(7) NOT NULL,
	"prev" numeric(14, 3),
	"cur" numeric(14, 3),
	"usage" numeric(14, 3),
	CONSTRAINT "readings_tenant_id_service_id_zone_month_pk" PRIMARY KEY("tenant_id","service_id","zone","month")
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"supplier" text NOT NULL,
	"name" text NOT NULL,
	"unit" text NOT NULL,
	"kind" text NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_payments" (
	"object_id" uuid NOT NULL,
	"supplier" text NOT NULL,
	"month" char(7) NOT NULL,
	"amount" numeric(14, 2),
	"paid_on" date,
	"enabled" boolean,
	CONSTRAINT "supplier_payments_object_id_supplier_month_pk" PRIMARY KEY("object_id","supplier","month")
);
--> statement-breakpoint
CREATE TABLE "tariff_tenants" (
	"tariff_id" uuid NOT NULL,
	"tenant_id" uuid NOT NULL,
	CONSTRAINT "tariff_tenants_tariff_id_tenant_id_pk" PRIMARY KEY("tariff_id","tenant_id")
);
--> statement-breakpoint
CREATE TABLE "tariffs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"service_id" uuid NOT NULL,
	"logic" text NOT NULL,
	"price" numeric(14, 4),
	"price2" numeric(14, 4),
	"norm" numeric(14, 6),
	"norm_price" numeric(14, 4),
	"extra_name" text DEFAULT '' NOT NULL,
	"sources" uuid[] DEFAULT '{}' NOT NULL,
	"who_all" boolean DEFAULT true NOT NULL,
	"valid_from" date NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"object_id" uuid NOT NULL,
	"name" text NOT NULL,
	"share" numeric(5, 2) NOT NULL,
	"phone" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"contract" text DEFAULT '' NOT NULL,
	"contract_end" date,
	"sort" integer DEFAULT 0 NOT NULL,
	"archived_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_id" uuid NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text,
	"role" text DEFAULT 'owner' NOT NULL,
	"email_verified_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_bills" ADD CONSTRAINT "object_bills_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "object_bills" ADD CONSTRAINT "object_bills_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "objects" ADD CONSTRAINT "objects_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readings" ADD CONSTRAINT "readings_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "readings" ADD CONSTRAINT "readings_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_tenants" ADD CONSTRAINT "tariff_tenants_tariff_id_tariffs_id_fk" FOREIGN KEY ("tariff_id") REFERENCES "public"."tariffs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariff_tenants" ADD CONSTRAINT "tariff_tenants_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tariffs" ADD CONSTRAINT "tariffs_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_object_id_objects_id_fk" FOREIGN KEY ("object_id") REFERENCES "public"."objects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_tenant_month_uq" ON "invoices" USING btree ("tenant_id","month");--> statement-breakpoint
CREATE INDEX "objects_account_idx" ON "objects" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "services_account_idx" ON "services" USING btree ("account_id");--> statement-breakpoint
CREATE INDEX "tariffs_service_idx" ON "tariffs" USING btree ("service_id");--> statement-breakpoint
CREATE INDEX "tenants_object_idx" ON "tenants" USING btree ("object_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");
-- Собственник работает как арендатор с долей 100%: у каждого объекта-собственника — одна такая запись.
INSERT INTO "tenants" ("object_id", "name", "share", "sort")
SELECT o."id", 'Собственник', 100, 0 FROM "objects" o
WHERE o."is_owner" = true
  AND NOT EXISTS (SELECT 1 FROM "tenants" t WHERE t."object_id" = o."id" AND t."archived_at" IS NULL);

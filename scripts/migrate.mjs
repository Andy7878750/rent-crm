// Применяет SQL-миграции из папки drizzle/ (только библиотека pg — работает на сервере без dev-зависимостей).
// Запуск: DATABASE_URL=... node scripts/migrate.mjs [папка с миграциями]
import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

const dir = process.argv[2] || path.join(process.cwd(), 'drizzle');
const journal = JSON.parse(fs.readFileSync(path.join(dir, 'meta', '_journal.json'), 'utf8'));
const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  await client.query('create table if not exists app_migrations (tag text primary key, applied_at timestamptz not null default now())');
  // База, созданная раньше через drizzle-kit, уже содержит таблицы: отмечаем её миграции как применённые.
  const kit = await client.query("select to_regclass('drizzle.__drizzle_migrations') as t");
  const done = new Set((await client.query('select tag from app_migrations')).rows.map((r) => r.tag));
  for (const e of journal.entries) {
    if (done.has(e.tag)) continue;
    const exists = kit.rows[0].t && (await client.query("select to_regclass('public.accounts') as t")).rows[0].t;
    await client.query('begin');
    if (!(exists && e.idx === 0)) {
      const sql = fs.readFileSync(path.join(dir, `${e.tag}.sql`), 'utf8');
      for (const stmt of sql.split('--> statement-breakpoint')) if (stmt.trim()) await client.query(stmt);
    }
    await client.query('insert into app_migrations(tag) values ($1)', [e.tag]);
    await client.query('commit');
    console.log('applied', e.tag);
  }
  console.log('migrations up to date');
} catch (err) {
  await client.query('rollback').catch(() => {});
  console.error(err);
  process.exitCode = 1;
} finally {
  await client.end();
}

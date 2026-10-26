import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { getUser } from '@/lib/auth/session';

/** Файл подсказки «?» (картинка или PDF). Только для вошедших пользователей. */
export async function GET(_req: Request, ctx: RouteContext<'/help-file/[key]'>) {
  if (!(await getUser())) return new Response('Нужно войти', { status: 401 });
  const { key } = await ctx.params;
  const [row] = await db.select({ name: schema.helpTips.fileName, type: schema.helpTips.fileType, data: schema.helpTips.fileData })
    .from(schema.helpTips).where(eq(schema.helpTips.key, key)).limit(1);
  if (!row?.data || !row.name) return new Response('Нет файла', { status: 404 });
  return new Response(new Uint8Array(row.data), {
    headers: {
      'Content-Type': row.type || 'application/octet-stream',
      'Content-Disposition': `inline; filename*=UTF-8''${encodeURIComponent(row.name)}`,
      'X-Content-Type-Options': 'nosniff',
      'Cache-Control': 'private, no-cache',
    },
  });
}

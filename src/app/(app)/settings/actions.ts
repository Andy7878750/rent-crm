'use server';

import { revalidatePath } from 'next/cache';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth/session';
import { isServiceAdmin } from '@/lib/auth/admin';
import { HELP_KEYS } from '@/lib/help';

const MAX = 5 * 1024 * 1024;
const TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];

export type HelpState = { ok?: boolean; error?: string };

/** Сохранить подсказку «?»: текст, новый файл или удаление файла. Только администратор сервиса. */
export async function saveHelpTip(key: string, _prev: HelpState, fd: FormData): Promise<HelpState> {
  const user = await requireUser();
  if (!isServiceAdmin(user.email) || !HELP_KEYS.includes(key)) return { error: 'Нет доступа' };
  const text = String(fd.get('text') ?? '').trim().slice(0, 2000);
  const file = fd.get('file');
  const drop = fd.get('dropFile') === 'on';
  const set: Partial<typeof schema.helpTips.$inferInsert> = { text, updatedAt: new Date() };
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX) return { error: 'Файл больше 5 МБ' };
    if (!TYPES.includes(file.type)) return { error: 'Можно картинку (PNG, JPG, WebP, GIF) или PDF' };
    Object.assign(set, { fileName: file.name.slice(0, 200), fileType: file.type, fileData: Buffer.from(await file.arrayBuffer()) });
  } else if (drop) {
    Object.assign(set, { fileName: null, fileType: null, fileData: null });
  }
  await db.insert(schema.helpTips).values({ key, ...set }).onConflictDoUpdate({ target: schema.helpTips.key, set });
  revalidatePath('/', 'layout');
  return { ok: true };
}

import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { and, desc, eq, gt } from 'drizzle-orm';
import { db, schema } from '@/db';
import { appUrl, sendLetter } from '@/lib/mail';

type Kind = 'reset' | 'verify';
const HOUR = 60 * 60 * 1000;
const TTL: Record<Kind, number> = { reset: HOUR, verify: 7 * 24 * HOUR };
const hash = (t: string) => createHash('sha256').update(t).digest('hex');

/** Можно ли отправить ещё одно письмо: не чаще раза в минуту на пользователя. */
async function tooSoon(userId: string, kind: Kind) {
  const [last] = await db.select({ at: schema.emailTokens.createdAt }).from(schema.emailTokens)
    .where(and(eq(schema.emailTokens.userId, userId), eq(schema.emailTokens.kind, kind)))
    .orderBy(desc(schema.emailTokens.createdAt)).limit(1);
  return !!last && Date.now() - last.at.getTime() < 60_000;
}

async function issue(userId: string, kind: Kind) {
  const token = randomBytes(32).toString('base64url');
  // Старые ссылки того же вида перестают работать — действует только последняя.
  await db.delete(schema.emailTokens).where(and(eq(schema.emailTokens.userId, userId), eq(schema.emailTokens.kind, kind)));
  await db.insert(schema.emailTokens).values({ tokenHash: hash(token), userId, kind, expiresAt: new Date(Date.now() + TTL[kind]) });
  return token;
}

/** Проверить ссылку и погасить её. Возвращает id пользователя или null. */
export async function consumeToken(token: string, kind: Kind): Promise<string | null> {
  if (!token || token.length > 100) return null;
  const [row] = await db.delete(schema.emailTokens)
    .where(and(eq(schema.emailTokens.tokenHash, hash(token)), eq(schema.emailTokens.kind, kind), gt(schema.emailTokens.expiresAt, new Date())))
    .returning({ userId: schema.emailTokens.userId });
  return row?.userId ?? null;
}

/** Проверить ссылку, не погашая (для показа формы нового пароля). */
export async function peekToken(token: string, kind: Kind): Promise<boolean> {
  if (!token || token.length > 100) return false;
  const [row] = await db.select({ u: schema.emailTokens.userId }).from(schema.emailTokens)
    .where(and(eq(schema.emailTokens.tokenHash, hash(token)), eq(schema.emailTokens.kind, kind), gt(schema.emailTokens.expiresAt, new Date()))).limit(1);
  return !!row;
}

export type SendResult = 'sent' | 'soon' | 'failed';

export async function sendResetLetter(user: { id: string; email: string }): Promise<SendResult> {
  if (await tooSoon(user.id, 'reset')) return 'soon';
  const token = await issue(user.id, 'reset');
  const ok = await sendLetter({
    to: user.email, subject: 'Восстановление пароля — Расчётка',
    title: 'Новый пароль', text: 'Кто-то (надеемся, вы) запросил восстановление пароля. Нажмите кнопку и задайте новый пароль.',
    button: 'Задать новый пароль', url: `${appUrl()}/reset?t=${token}`,
    note: 'Ссылка действует 1 час. Если вы не запрашивали восстановление — просто удалите письмо, пароль не изменится.',
  });
  return ok ? 'sent' : 'failed';
}

export async function sendVerifyLetter(user: { id: string; email: string; name: string }): Promise<SendResult> {
  if (await tooSoon(user.id, 'verify')) return 'soon';
  const token = await issue(user.id, 'verify');
  const ok = await sendLetter({
    to: user.email, subject: 'Подтвердите почту — Расчётка',
    title: `${user.name}, подтвердите почту`, text: 'Это нужно, чтобы вы могли восстановить пароль и получать от нас важные письма.',
    button: 'Подтвердить почту', url: `${appUrl()}/verify?t=${token}`,
    note: 'Ссылка действует 7 дней. Если вы не регистрировались в Расчётке — просто удалите письмо.',
  });
  return ok ? 'sent' : 'failed';
}

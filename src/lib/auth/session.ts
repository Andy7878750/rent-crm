import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';
import { and, eq, gt } from 'drizzle-orm';
import { db, schema } from '@/db';

export const SESSION_COOKIE = 'rc_session';
const DAY = 24 * 60 * 60 * 1000;

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

/** Создать сессию после входа или регистрации. Вызывать только из Server Action. */
export async function createSession(userId: string, remember: boolean) {
  const token = randomBytes(32).toString('base64url');
  const ttl = remember ? 30 * DAY : DAY;
  const expiresAt = new Date(Date.now() + ttl);
  await db.insert(schema.sessions).values({ tokenHash: hashToken(token), userId, expiresAt });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    expires: remember ? expiresAt : undefined,
  });
}

export async function destroySession() {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) await db.delete(schema.sessions).where(eq(schema.sessions.tokenHash, hashToken(token)));
  store.delete(SESSION_COOKIE);
}

export type CurrentUser = { id: string; name: string; email: string; role: 'owner' | 'staff'; accountId: string; accountName: string };

/** Текущий пользователь или null. Кешируется в пределах одного запроса. */
export const getUser = cache(async (): Promise<CurrentUser | null> => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const rows = await db
    .select({
      id: schema.users.id, name: schema.users.name, email: schema.users.email, role: schema.users.role,
      accountId: schema.users.accountId, accountName: schema.accounts.name,
    })
    .from(schema.sessions)
    .innerJoin(schema.users, eq(schema.users.id, schema.sessions.userId))
    .innerJoin(schema.accounts, eq(schema.accounts.id, schema.users.accountId))
    .where(and(eq(schema.sessions.tokenHash, hashToken(token)), gt(schema.sessions.expiresAt, new Date())))
    .limit(1);
  return rows[0] ?? null;
});

/** Для страниц и действий за логином: пользователь или переход на /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getUser();
  if (!user) redirect('/login');
  return user;
}

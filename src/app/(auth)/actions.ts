'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSession, destroySession } from '@/lib/auth/session';
import { createExample } from '@/lib/example';
import { consumeToken, sendResetLetter, sendVerifyLetter } from '@/lib/auth/tokens';
import { getUser } from '@/lib/auth/session';
import { defaultMonth } from '@/lib/month';

export type FormState = {
  errors?: Record<string, string>;
  values?: Record<string, string>;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const str = (fd: FormData, k: string) => String(fd.get(k) ?? '').trim();

export async function login(_prev: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, 'email').toLowerCase();
  const password = String(fd.get('password') ?? '');
  const errors: Record<string, string> = {};
  if (!EMAIL_RE.test(email)) errors.email = email ? 'Проверьте адрес почты' : 'Введите почту';
  if (!password) errors.password = 'Введите пароль';
  if (Object.keys(errors).length) return { errors, values: { email } };

  const [user] = await db.select().from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { errors: { form: 'Неверная почта или пароль' }, values: { email } };
  }
  await createSession(user.id, fd.get('remember') === 'on');
  redirect('/objects');
}

export async function register(_prev: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, 'name');
  const email = str(fd, 'email').toLowerCase();
  const password = String(fd.get('password') ?? '');
  const errors: Record<string, string> = {};
  if (!name) errors.name = 'Введите имя';
  if (!EMAIL_RE.test(email)) errors.email = email ? 'Проверьте адрес почты' : 'Введите почту';
  if (password.length < 8) errors.password = 'Пароль должен быть не короче 8 символов';
  if (fd.get('consent') !== 'on') errors.consent = 'Нужно согласие на обработку персональных данных';
  if (Object.keys(errors).length) return { errors, values: { name, email } };

  const [exists] = await db.select({ id: schema.users.id }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (exists) return { errors: { email: 'Эта почта уже зарегистрирована. Войдите или восстановите пароль.' }, values: { name, email } };

  const passwordHash = await hashPassword(password);
  const userId = await db.transaction(async (tx) => {
    const [acc] = await tx.insert(schema.accounts).values({ name }).returning({ id: schema.accounts.id });
    const [u] = await tx.insert(schema.users).values({ accountId: acc.id, email, name, passwordHash, role: 'owner' }).returning({ id: schema.users.id });
    await createExample(tx, acc.id, defaultMonth());
    return u.id;
  });
  // Письмо — после создания аккаунта; если почта не ушла, регистрация всё равно состоялась.
  await sendVerifyLetter({ id: userId, email, name });
  await createSession(userId, true);
  redirect('/objects');
}

export async function logout() {
  await destroySession();
  redirect('/login');
}

export type ForgotState = { sent?: string; error?: string; email?: string };

/** «Забыли пароль?» — всегда один и тот же ответ, чтобы по форме нельзя было узнать, есть ли такая почта. */
export async function requestReset(_prev: ForgotState, fd: FormData): Promise<ForgotState> {
  const email = str(fd, 'email').toLowerCase();
  if (!EMAIL_RE.test(email)) return { error: email ? 'Проверьте адрес почты' : 'Введите почту', email };
  const [user] = await db.select({ id: schema.users.id, email: schema.users.email }).from(schema.users).where(eq(schema.users.email, email)).limit(1);
  if (user && (await sendResetLetter(user)) === 'failed') return { error: 'Не удалось отправить письмо. Попробуйте через несколько минут.', email };
  return { sent: email };
}

export type ResetState = { error?: string };

/** Новый пароль по ссылке из письма. Все прежние входы завершаются. */
export async function resetPassword(_prev: ResetState, fd: FormData): Promise<ResetState> {
  const password = String(fd.get('password') ?? '');
  if (password.length < 8) return { error: 'Пароль должен быть не короче 8 символов' };
  const userId = await consumeToken(String(fd.get('t') ?? ''), 'reset');
  if (!userId) return { error: 'Ссылка устарела или уже использована. Запросите новую.' };
  const passwordHash = await hashPassword(password);
  const [u] = await db.select({ v: schema.users.emailVerifiedAt }).from(schema.users).where(eq(schema.users.id, userId)).limit(1);
  // Раз человек открыл письмо — почта его, заодно считаем её подтверждённой.
  await db.update(schema.users).set({ passwordHash, emailVerifiedAt: u?.v ?? new Date() }).where(eq(schema.users.id, userId));
  await db.delete(schema.sessions).where(eq(schema.sessions.userId, userId));
  await createSession(userId, true);
  redirect('/objects');
}

/** Отправить письмо подтверждения ещё раз (из плашки в приложении). */
export async function resendVerify(): Promise<'sent' | 'soon' | 'failed' | 'done'> {
  const user = await getUser();
  if (!user) redirect('/login');
  if (user.emailVerified) return 'done';
  return sendVerifyLetter(user);
}

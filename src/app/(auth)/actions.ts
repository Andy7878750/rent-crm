'use server';

import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { hashPassword, verifyPassword } from '@/lib/auth/password';
import { createSession, destroySession } from '@/lib/auth/session';
import { createExample } from '@/lib/example';
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
  await createSession(userId, true);
  redirect('/objects');
}

export async function logout() {
  await destroySession();
  redirect('/login');
}

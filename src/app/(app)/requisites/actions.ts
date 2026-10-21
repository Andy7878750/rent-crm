'use server';

import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth/session';
import { readRequisites } from '@/lib/requisites';

export type ReqState = { ok?: boolean; errors?: Record<string, string> };

const digits = (s: string) => s.replace(/\s/g, '');

export async function saveRequisites(_prev: ReqState, fd: FormData): Promise<ReqState> {
  const user = await requireUser();
  const g = (k: string) => String(fd.get(k) ?? '').trim();
  const r = readRequisites({
    kind: g('kind'), name: g('name'), inn: digits(g('inn')), ogrn: digits(g('ogrn')), address: g('address'), phone: g('phone'), email: g('email'),
    noVat: fd.get('noVat') === 'on', bank: g('bank'), bik: digits(g('bik')), ks: digits(g('ks')), rs: digits(g('rs')), sbp: g('sbp'), showPay: fd.get('showPay') === 'on',
  }, user.name);

  const errors: Record<string, string> = {};
  if (r.inn && !/^\d{10}$|^\d{12}$/.test(r.inn)) errors.inn = 'ИНН — 10 или 12 цифр';
  if (r.ogrn && !/^\d{15}$/.test(r.ogrn)) errors.ogrn = 'ОГРНИП — 15 цифр';
  if (r.bik && !/^\d{9}$/.test(r.bik)) errors.bik = 'БИК — 9 цифр';
  if (r.ks && !/^\d{20}$/.test(r.ks)) errors.ks = 'Корр. счёт — 20 цифр';
  if (r.rs && !/^\d{20}$/.test(r.rs)) errors.rs = 'Расчётный счёт — 20 цифр';
  if (r.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email)) errors.email = 'Проверьте почту';
  if (Object.keys(errors).length) return { errors };

  await db.update(schema.accounts).set({ requisites: r }).where(eq(schema.accounts.id, user.accountId));
  revalidatePath('/requisites');
  return { ok: true };
}

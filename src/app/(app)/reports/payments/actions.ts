'use server';

import { revalidatePath } from 'next/cache';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth/session';
import { isMonth } from '@/lib/month';

const toNum = (s: string) => {
  const n = Number(String(s).replace(/\s/g, '').replace(',', '.'));
  return String(s).trim() !== '' && Number.isFinite(n) ? n : null;
};

async function ownObject(accountId: string, objectId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(objectId)) return false;
  const [o] = await db.select({ id: schema.objects.id }).from(schema.objects)
    .where(and(eq(schema.objects.id, objectId), eq(schema.objects.accountId, accountId))).limit(1);
  return !!o;
}

const key = (objectId: string, supplier: string, month: string) =>
  and(eq(schema.supplierPayments.objectId, objectId), eq(schema.supplierPayments.supplier, supplier), eq(schema.supplierPayments.month, month));

async function upsertPayment(objectId: string, supplier: string, month: string, set: Partial<typeof schema.supplierPayments.$inferInsert>) {
  await db.insert(schema.supplierPayments).values({ objectId, supplier, month, ...set })
    .onConflictDoUpdate({ target: [schema.supplierPayments.objectId, schema.supplierPayments.supplier, schema.supplierPayments.month], set });
}

/**
 * Сумма в ячейке. Если у поставщика есть «Счёт на помещение» (linkedServiceId) — пишем туда,
 * это то же число, что в «Вводе данных». Иначе — своя сумма оплаты.
 */
export async function savePaymentAmount(objectId: string, supplier: string, month: string, linkedServiceId: string | null, value: string) {
  const user = await requireUser();
  if (!isMonth(month) || !(await ownObject(user.accountId, objectId))) return;
  const n = toNum(value);
  if (linkedServiceId) {
    const [svc] = await db.select({ id: schema.services.id }).from(schema.services)
      .where(and(eq(schema.services.id, linkedServiceId), eq(schema.services.accountId, user.accountId))).limit(1);
    if (!svc) return;
    const k = and(eq(schema.objectBills.objectId, objectId), eq(schema.objectBills.serviceId, linkedServiceId), eq(schema.objectBills.month, month));
    if (n === null) await db.delete(schema.objectBills).where(k);
    else await db.insert(schema.objectBills).values({ objectId, serviceId: linkedServiceId, month, amount: n.toFixed(2) })
      .onConflictDoUpdate({ target: [schema.objectBills.objectId, schema.objectBills.serviceId, schema.objectBills.month], set: { amount: n.toFixed(2) } });
  } else {
    await upsertPayment(objectId, supplier, month, { amount: n === null ? null : n.toFixed(2) });
  }
  revalidatePath('/', 'layout');
}

/** Отметить оплату поставщику сегодняшней датой (или снять). */
export async function togglePaymentPaid(objectId: string, supplier: string, month: string) {
  const user = await requireUser();
  if (!isMonth(month) || !(await ownObject(user.accountId, objectId))) return;
  const [row] = await db.select({ paidOn: schema.supplierPayments.paidOn }).from(schema.supplierPayments).where(key(objectId, supplier, month)).limit(1);
  await upsertPayment(objectId, supplier, month, { paidOn: row?.paidOn ? null : new Date().toISOString().slice(0, 10) });
  revalidatePath('/reports/payments');
}

/** Добавить поставщика объекту вручную («+») или убрать добавленного («×»). Хранится в настройках аккаунта. */
export async function setPaymentColumn(objectId: string, supplier: string, on: boolean | null) {
  const user = await requireUser();
  if (!(await ownObject(user.accountId, objectId))) return;
  const [acc] = await db.select({ settings: schema.accounts.settings }).from(schema.accounts).where(eq(schema.accounts.id, user.accountId)).limit(1);
  const settings = { ...(acc?.settings ?? {}) } as { payCols?: Record<string, boolean> };
  const cols = { ...(settings.payCols ?? {}) };
  if (on === null) delete cols[`${objectId}|${supplier}`]; else cols[`${objectId}|${supplier}`] = on;
  await db.update(schema.accounts).set({ settings: { ...settings, payCols: cols } }).where(eq(schema.accounts.id, user.accountId));
  revalidatePath('/reports/payments');
}

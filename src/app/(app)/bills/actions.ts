'use server';

import { revalidatePath } from 'next/cache';
import { and, eq, like } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth/session';
import { loadMonthInput, type InvoiceSnapshot } from '@/lib/data';
import { calculateMonth } from '@/lib/calc/engine';
import { isMonth } from '@/lib/month';

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Отметить счета выставленными. Сохраняется снимок расчёта: если потом поменяют тариф или показания,
 * выставленный счёт не изменится. Номер — сквозной в пределах года: 2026-0001.
 */
export async function issueInvoices(month: string, tenantIds: string[]) {
  const user = await requireUser();
  if (!isMonth(month) || !tenantIds.length) return { issued: 0 };
  const { input, objects } = await loadMonthInput(user.accountId, month);
  const res = calculateMonth(input);
  const year = today().slice(0, 4);

  let issued = 0;
  await db.transaction(async (tx) => {
    const existing = await tx.select({ number: schema.invoices.number }).from(schema.invoices)
      .where(and(eq(schema.invoices.accountId, user.accountId), like(schema.invoices.number, `${year}-%`)));
    let seq = existing.reduce((m, r) => Math.max(m, Number(r.number.split('-')[1]) || 0), 0);
    const already = new Set((await tx.select({ t: schema.invoices.tenantId }).from(schema.invoices)
      .where(and(eq(schema.invoices.accountId, user.accountId), eq(schema.invoices.month, month)))).map((r) => r.t));

    for (const tid of tenantIds) {
      const bill = res.tenants[tid];
      if (!bill || already.has(tid) || !bill.serviceCount || bill.missing.length) continue; // только готовые
      const obj = objects.find((o) => o.id === bill.objectId)!;
      if (obj.isOwner) continue; // собственнику счёт не выставляется
      const ten = obj.tenants.find((t) => t.id === tid)!;
      const snap: InvoiceSnapshot = { tenantName: ten.name, objectName: obj.short, share: Number(ten.share), lines: bill.lines, meters: bill.meters };
      seq += 1;
      await tx.insert(schema.invoices).values({
        accountId: user.accountId, tenantId: tid, month, number: `${year}-${String(seq).padStart(4, '0')}`,
        issuedOn: today(), total: bill.total.toFixed(2), lines: snap,
      });
      issued += 1;
    }
  });
  revalidatePath('/', 'layout');
  return { issued };
}

async function ownInvoice(accountId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const [r] = await db.select({ id: schema.invoices.id, paidOn: schema.invoices.paidOn }).from(schema.invoices)
    .where(and(eq(schema.invoices.id, id), eq(schema.invoices.accountId, accountId))).limit(1);
  return r ?? null;
}

/** Отметить оплату арендатора (или снять отметку). */
export async function togglePaid(invoiceId: string) {
  const user = await requireUser();
  const inv = await ownInvoice(user.accountId, invoiceId);
  if (!inv) return;
  await db.update(schema.invoices).set({ paidOn: inv.paidOn ? null : today() }).where(eq(schema.invoices.id, invoiceId));
  revalidatePath('/', 'layout');
}

/** Отменить выставление (счёт вернётся в «К выставлению»). Оплаченный отменить нельзя. */
export async function cancelInvoice(invoiceId: string) {
  const user = await requireUser();
  const inv = await ownInvoice(user.accountId, invoiceId);
  if (!inv || inv.paidOn) return;
  await db.delete(schema.invoices).where(eq(schema.invoices.id, invoiceId));
  revalidatePath('/', 'layout');
}

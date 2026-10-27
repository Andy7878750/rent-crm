'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, asc, eq, inArray, lte } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth/session';
import { isMonth } from '@/lib/month';
import { readAccountList, writeAccountList } from '@/lib/data';
import { METHODS, kindOf, type Method } from '@/lib/receipts';

export type ReadingIn = { prev: string; cur: string; usage: string; dayPrev: string; dayCur: string; nightPrev: string; nightCur: string };
export type ReceiptIn = {
  category: string; supplier: string; name: string; unit: string; logic: Method; amount: string;
  price: string; price2: string; hasNorm: boolean; norm: string; normPrice: string; extraName: string;
  sources: string[]; whoAll: boolean; who: string[]; fixed: Record<string, string>; readings: Record<string, ReadingIn>;
};
export type ReceiptState = { errors?: Record<string, string> };

const toNum = (s: string | undefined) => {
  const t = String(s ?? '').replace(/\s/g, '').replace(',', '.');
  const n = Number(t);
  return t !== '' && Number.isFinite(n) ? n : null;
};
const dec = (s: string | undefined) => { const n = toNum(s); return n === null ? null : String(n); };

/** Объект аккаунта с арендаторами (без архивных) и квитанциями. Каждое действие проверяет принадлежность само. */
async function ownObject(accountId: string, objectId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(objectId)) return null;
  const [o] = await db.select().from(schema.objects)
    .where(and(eq(schema.objects.id, objectId), eq(schema.objects.accountId, accountId))).limit(1);
  if (!o) return null;
  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.objectId, objectId));
  const services = await db.select({ id: schema.services.id }).from(schema.services).where(eq(schema.services.objectId, objectId));
  return { o, tenants: new Set(tenants.map((t) => t.id)), services: new Set(services.map((s) => s.id)) };
}

type TariffRow = { logic: Method; price: string | null; price2: string | null; norm: string | null; normPrice: string | null; extraName: string; sources: string[]; whoAll: boolean; who: string[] };

/** Набор тарифов как строка — чтобы не плодить одинаковые тарифы, если способ не менялся. */
const sig = (rows: TariffRow[]) => JSON.stringify(rows.map((r) => ({ ...r, price: r.price === null ? null : Number(r.price), price2: r.price2 === null ? null : Number(r.price2),
  norm: r.norm === null ? null : Number(r.norm), normPrice: r.normPrice === null ? null : Number(r.normPrice), who: [...r.who].sort() }))
  .sort((a, b) => a.who.join().localeCompare(b.who.join())));

export async function saveReceipt(objectId: string, serviceId: string | null, month: string, _prev: ReceiptState, fd: FormData): Promise<ReceiptState> {
  const user = await requireUser();
  let d: ReceiptIn;
  try { d = JSON.parse(String(fd.get('data') ?? '')); } catch { return { errors: { form: 'Не удалось прочитать форму' } }; }
  const own = await ownObject(user.accountId, objectId);
  if (!own || !isMonth(month)) return { errors: { form: 'Объект не найден' } };
  if (serviceId && !own.services.has(serviceId)) return { errors: { form: 'Квитанция не найдена' } };

  const M = METHODS[d.logic];
  const errors: Record<string, string> = {};
  if (!M) errors.logic = 'Выберите, как делить';
  if (!d.name?.trim()) errors.name = 'Назовите квитанцию';
  const allTenants = own.o.isOwner || d.logic === 'whole' || d.whoAll;
  const who = allTenants ? [] : (d.who ?? []).filter((t) => own.tenants.has(t));
  if (!allTenants && !who.length) errors.who = 'Отметьте, кто платит';
  if (M?.bill && d.amount.trim() && toNum(d.amount) === null) errors.amount = 'Введите сумму числом';
  if (M?.price && toNum(d.price) === null) errors.price = 'Введите цену из квитанции';
  if (d.logic === 'dn' && toNum(d.price2) === null) errors.price2 = 'Введите ночную цену';
  if (d.logic === 'meterRest' && d.hasNorm && (toNum(d.norm) === null || toNum(d.normPrice) === null)) errors.norm = 'Норматив и его цену заполняют вместе';
  const sources = (d.sources ?? []).filter((s) => own.services.has(s) && s !== serviceId);
  if (d.logic === 'derived' && !sources.length) errors.sources = 'Отметьте квитанции воды';
  if (d.logic === 'fixed') {
    const payers = allTenants ? [...own.tenants] : who;
    if (payers.some((t) => toNum(d.fixed?.[t]) === null)) errors.fixed = 'Введите сумму для каждого, кто платит';
  }
  if (Object.keys(errors).length) return { errors };

  // Тарифы: «фиксированно» — свой тариф на каждого (своя сумма), остальное — один тариф на «всех» или на список.
  const base = {
    logic: d.logic, price: M.price ? dec(d.price) : null, price2: d.logic === 'dn' ? dec(d.price2) : null,
    norm: d.logic === 'meterRest' && d.hasNorm ? dec(d.norm) : null, normPrice: d.logic === 'meterRest' && d.hasNorm ? dec(d.normPrice) : null,
    extraName: d.logic === 'meterRest' && d.hasNorm ? (d.extraName.trim() || 'Доп. начисление') : '', sources: d.logic === 'derived' ? sources : [],
  };
  const rows: TariffRow[] = d.logic === 'fixed'
    ? (allTenants ? [...own.tenants] : who).map((t) => ({ ...base, price: dec(d.fixed[t]), whoAll: false, who: [t] }))
    : [{ ...base, whoAll: allTenants, who: allTenants ? [] : who }];
  const from = `${month}-01`;

  const sid = await db.transaction(async (tx) => {
    const values = { category: d.category ?? '', supplier: d.supplier?.trim() || d.name.trim(), name: d.name.trim(), unit: d.unit.trim() || '₽', kind: kindOf(d.logic) };
    let id = serviceId;
    if (id) await tx.update(schema.services).set(values).where(eq(schema.services.id, id));
    else {
      const last = await tx.select({ sort: schema.services.sort }).from(schema.services).where(eq(schema.services.objectId, objectId)).orderBy(asc(schema.services.sort));
      id = (await tx.insert(schema.services).values({ ...values, accountId: user.accountId, objectId, sort: last.length ? last[last.length - 1].sort + 1 : 0 })
        .returning({ id: schema.services.id }))[0].id;
    }

    // Действующий набор тарифов на этот месяц: если способ не менялся — ничего не трогаем, иначе — новый набор с 1-го числа месяца.
    const existing = await tx.select().from(schema.tariffs).where(and(eq(schema.tariffs.serviceId, id), lte(schema.tariffs.validFrom, from)));
    const lastFrom = existing.reduce((a, t) => (t.validFrom > a ? t.validFrom : a), '');
    const cur = existing.filter((t) => t.validFrom === lastFrom);
    const links = cur.length ? await tx.select().from(schema.tariffTenants).where(inArray(schema.tariffTenants.tariffId, cur.map((t) => t.id))) : [];
    const curRows: TariffRow[] = cur.map((t) => ({ logic: t.logic as Method, price: t.price, price2: t.price2, norm: t.norm, normPrice: t.normPrice, extraName: t.extraName,
      sources: t.sources, whoAll: t.whoAll, who: links.filter((l) => l.tariffId === t.id).map((l) => l.tenantId) }));
    if (!cur.length || sig(curRows) !== sig(rows)) {
      await tx.delete(schema.tariffs).where(and(eq(schema.tariffs.serviceId, id), eq(schema.tariffs.validFrom, from)));
      for (const r of rows) {
        const [t] = await tx.insert(schema.tariffs).values({ serviceId: id, logic: r.logic, price: r.price, price2: r.price2, norm: r.norm, normPrice: r.normPrice,
          extraName: r.extraName, sources: r.sources, whoAll: r.whoAll, validFrom: from }).returning({ id: schema.tariffs.id });
        if (!r.whoAll && r.who.length) await tx.insert(schema.tariffTenants).values(r.who.map((tenantId) => ({ tariffId: t.id, tenantId })));
      }
    }

    // Сумма квитанции за месяц.
    const amount = M.bill ? dec(d.amount) : null;
    await tx.delete(schema.objectBills).where(and(eq(schema.objectBills.objectId, objectId), eq(schema.objectBills.serviceId, id), eq(schema.objectBills.month, month)));
    if (amount !== null) await tx.insert(schema.objectBills).values({ objectId, serviceId: id, month, amount });

    // Показания платящих арендаторов за месяц.
    if (M.read) {
      for (const [tenantId, r] of Object.entries(d.readings ?? {})) {
        if (!own.tenants.has(tenantId)) continue;
        const zones: Array<[string, string | null, string | null, string | null]> = M.read === 'usage' ? [['', null, null, dec(r.usage)]]
          : M.read === 'meter' ? [['', dec(r.prev), dec(r.cur), null]]
          : [['day', dec(r.dayPrev), dec(r.dayCur), null], ['night', dec(r.nightPrev), dec(r.nightCur), null]];
        for (const [zone, prev, cur2, usage] of zones) {
          const key = and(eq(schema.readings.tenantId, tenantId), eq(schema.readings.serviceId, id), eq(schema.readings.zone, zone), eq(schema.readings.month, month));
          await tx.delete(schema.readings).where(key);
          if (prev !== null || cur2 !== null || usage !== null) await tx.insert(schema.readings).values({ tenantId, serviceId: id, zone, month, prev, cur: cur2, usage });
        }
      }
    }
    return id;
  });

  // Нового поставщика запоминаем для выпадающего списка.
  const sup = d.supplier?.trim();
  const list = await readAccountList(user.accountId, 'suppliers');
  if (sup && !list.some((x) => x.toLowerCase() === sup.toLowerCase())) await writeAccountList(user.accountId, 'suppliers', [...list, sup]);

  revalidatePath('/', 'layout');
  redirect(`/objects/${objectId}?m=${month}#r-${sid}`);
}

/** Удалить квитанцию со всеми месяцами (выставленные счета не меняются — в них снимок). */
export async function deleteReceipt(objectId: string, serviceId: string, month: string) {
  const user = await requireUser();
  const own = await ownObject(user.accountId, objectId);
  if (!own || !own.services.has(serviceId)) return;
  await db.delete(schema.services).where(eq(schema.services.id, serviceId));
  revalidatePath('/', 'layout');
  redirect(`/objects/${objectId}?m=${isMonth(month) ? month : ''}`);
}

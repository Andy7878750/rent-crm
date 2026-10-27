'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth/session';
import { readAccountList, writeAccountList } from '@/lib/data';
import { KINDS, LOGICS } from '@/lib/calc/logics';
import type { Logic, ServiceKind } from '@/lib/calc/types';

export type TariffIn = {
  logic: Logic; price: string; price2: string; norm: string; normPrice: string; extraName: string;
  sources: string[]; whoAll: boolean; who: string[]; validFrom: string;
};
export type ServiceIn = { supplier: string; name: string; unit: string; kind: ServiceKind; tariffs: TariffIn[] };
export type ServiceFormState = { errors?: Record<string, string> };

const toNum = (s: string) => {
  const n = Number(String(s ?? '').replace(/\s/g, '').replace(',', '.'));
  return String(s ?? '').trim() !== '' && Number.isFinite(n) ? n : null;
};

async function ownService(accountId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return false;
  const [s] = await db.select({ id: schema.services.id }).from(schema.services)
    .where(and(eq(schema.services.id, id), eq(schema.services.accountId, accountId))).limit(1);
  return !!s;
}

export async function saveService(serviceId: string | null, _prev: ServiceFormState, fd: FormData): Promise<ServiceFormState> {
  const user = await requireUser();
  let data: ServiceIn;
  try { data = JSON.parse(String(fd.get('data') ?? '')); } catch { return { errors: { form: 'Не удалось прочитать форму' } }; }
  if (serviceId && !(await ownService(user.accountId, serviceId))) return { errors: { form: 'Услуга не найдена' } };

  // Арендаторы и услуги аккаунта — чтобы нельзя было подставить чужие.
  const myTenants = new Set((await db.select({ id: schema.tenants.id }).from(schema.tenants)
    .innerJoin(schema.objects, eq(schema.objects.id, schema.tenants.objectId))
    .where(eq(schema.objects.accountId, user.accountId))).map((t) => t.id));
  const myServices = new Set((await db.select({ id: schema.services.id }).from(schema.services)
    .where(eq(schema.services.accountId, user.accountId))).map((s) => s.id));

  const errors: Record<string, string> = {};
  if (!data.supplier?.trim()) errors.supplier = 'Укажите поставщика';
  if (!data.name?.trim()) errors.name = 'Укажите название';
  if (!data.unit?.trim()) errors.unit = 'Укажите единицу';
  if (!KINDS[data.kind]) errors.kind = 'Выберите вид счёта';
  if (!data.tariffs?.length) errors.form = 'Добавьте хотя бы один тариф';

  const seen = new Map<string, number>(); // `${validFrom}|${tenant|all}` → номер тарифа
  (data.tariffs ?? []).forEach((t, i) => {
    const L = LOGICS[t.logic];
    if (!L || !KINDS[data.kind]?.logics.includes(t.logic)) { errors[`t${i}.logic`] = 'Выберите логику расчёта'; return; }
    for (const f of L.required) {
      if (f === 'sources') { if (!t.sources?.length) errors[`t${i}.sources`] = 'Выберите хотя бы одну услугу'; continue; }
      const n = toNum(t[f]);
      if (n === null || n < 0) errors[`t${i}.${f}`] = 'Введите число';
    }
    if (L.fields.includes('norm') && !L.required.includes('norm') && (toNum(t.norm) === null) !== (toNum(t.normPrice) === null)) {
      errors[`t${i}.norm`] = 'Норматив и его цену заполняют вместе';
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t.validFrom ?? '')) errors[`t${i}.validFrom`] = 'Укажите дату начала';
    if (data.kind !== 'owner' && !t.whoAll && !t.who?.length) errors[`t${i}.who`] = 'Отметьте, для кого услуга, или «Все»';
    // У арендатора по услуге с одной даты — один тариф.
    const keys = t.whoAll || data.kind === 'owner' ? ['all'] : t.who;
    for (const k of keys) {
      const clash = [...seen.entries()].find(([sk]) => {
        const [d, who] = sk.split('|');
        return d === t.validFrom && (who === k || who === 'all' || k === 'all');
      });
      if (clash) errors[`t${i}.who`] = `Пересекается с тарифом №${clash[1] + 1}: у арендатора с одной даты может быть только один тариф`;
      seen.set(`${t.validFrom}|${k}`, i);
    }
    if (t.who?.some((id) => !myTenants.has(id)) || t.sources?.some((id) => !myServices.has(id) || id === serviceId)) errors.form = 'Обновите страницу и попробуйте снова';
  });
  if (Object.keys(errors).length) return { errors };

  const dec = (s: string) => { const n = toNum(s); return n === null ? null : String(n); };
  const id = await db.transaction(async (tx) => {
    const values = { supplier: data.supplier.trim(), name: data.name.trim(), unit: data.unit.trim(), kind: data.kind };
    let sid = serviceId;
    if (sid) {
      await tx.update(schema.services).set(values).where(eq(schema.services.id, sid));
      await tx.delete(schema.tariffs).where(eq(schema.tariffs.serviceId, sid));
    } else {
      const last = await tx.select({ sort: schema.services.sort }).from(schema.services)
        .where(eq(schema.services.accountId, user.accountId)).orderBy(asc(schema.services.sort));
      const sort = last.length ? last[last.length - 1].sort + 1 : 0;
      sid = (await tx.insert(schema.services).values({ ...values, accountId: user.accountId, sort }).returning({ id: schema.services.id }))[0].id;
    }
    for (const t of data.tariffs) {
      const f = LOGICS[t.logic].fields;
      const whoAll = data.kind === 'owner' || t.whoAll;
      const [row] = await tx.insert(schema.tariffs).values({
        serviceId: sid, logic: t.logic, validFrom: t.validFrom, whoAll,
        price: f.includes('price') ? dec(t.price) : null,
        price2: f.includes('price2') ? dec(t.price2) : null,
        norm: f.includes('norm') ? dec(t.norm) : null,
        normPrice: f.includes('normPrice') ? dec(t.normPrice) : null,
        extraName: f.includes('extraName') ? t.extraName.trim() : '',
        sources: f.includes('sources') ? t.sources : [],
      }).returning({ id: schema.tariffs.id });
      if (!whoAll && t.who.length) await tx.insert(schema.tariffTenants).values(t.who.map((tenantId) => ({ tariffId: row.id, tenantId })));
    }
    return sid;
  });
  revalidatePath('/', 'layout');
  redirect(`/tariffs#s-${id}`);
}

export async function deleteService(serviceId: string) {
  const user = await requireUser();
  if (!(await ownService(user.accountId, serviceId))) return;
  await db.delete(schema.services).where(eq(schema.services.id, serviceId));
  revalidatePath('/', 'layout');
  redirect('/tariffs');
}

/** Поменять услугу местами с соседней из видимого списка (стрелки ↑ ↓). */
export async function swapServices(a: string, b: string) {
  const user = await requireUser();
  const rows = await db.select({ id: schema.services.id, sort: schema.services.sort }).from(schema.services)
    .where(and(eq(schema.services.accountId, user.accountId), inArray(schema.services.id, [a, b])));
  if (rows.length !== 2) return;
  // Нормализуем порядок всех услуг, чтобы не было одинаковых номеров.
  const all = await db.select({ id: schema.services.id }).from(schema.services)
    .where(eq(schema.services.accountId, user.accountId)).orderBy(asc(schema.services.sort), asc(schema.services.createdAt));
  const ids = all.map((r) => r.id);
  const ia = ids.indexOf(a), ib = ids.indexOf(b);
  [ids[ia], ids[ib]] = [ids[ib], ids[ia]];
  await db.transaction(async (tx) => {
    for (const [i, id] of ids.entries()) await tx.update(schema.services).set({ sort: i }).where(eq(schema.services.id, id));
  });
  revalidatePath('/', 'layout');
}

/** Добавить своего поставщика в выпадающий список (сразу, без сохранения услуги). */
export async function addSupplier(label: string) {
  const user = await requireUser();
  const t = String(label ?? '').trim().replace(/\s+/g, ' ').slice(0, 80);
  if (!t) return;
  const list = await readAccountList(user.accountId, 'suppliers');
  if (!list.some((x) => x.toLowerCase() === t.toLowerCase())) await writeAccountList(user.accountId, 'suppliers', [...list, t]);
}

/** Убрать своего поставщика из списка (услуги с ним не меняются). */
export async function removeSupplier(label: string) {
  const user = await requireUser();
  const list = await readAccountList(user.accountId, 'suppliers');
  if (list.includes(label)) await writeAccountList(user.accountId, 'suppliers', list.filter((x) => x !== label));
}

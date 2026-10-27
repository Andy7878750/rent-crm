'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { and, asc, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth/session';
import { isMonth } from '@/lib/month';
import { RESOURCES, type Resource } from '@/lib/receipts';

export type MeterState = { errors?: Record<string, string> };

async function ownObject(accountId: string, objectId: string) {
  if (!/^[0-9a-f-]{36}$/i.test(objectId)) return null;
  const [o] = await db.select({ id: schema.objects.id }).from(schema.objects)
    .where(and(eq(schema.objects.id, objectId), eq(schema.objects.accountId, accountId))).limit(1);
  if (!o) return null;
  const tenants = await db.select({ id: schema.tenants.id }).from(schema.tenants).where(eq(schema.tenants.objectId, objectId));
  const meters = await db.select({ id: schema.meters.id }).from(schema.meters).where(eq(schema.meters.objectId, objectId));
  return { tenants: new Set(tenants.map((t) => t.id)), meters: new Set(meters.map((m) => m.id)) };
}

export async function saveMeter(objectId: string, meterId: string | null, month: string, _prev: MeterState, fd: FormData): Promise<MeterState> {
  const user = await requireUser();
  const own = await ownObject(user.accountId, objectId);
  if (!own || (meterId && !own.meters.has(meterId))) return { errors: { form: 'Счётчик не найден' } };
  const g = (k: string) => String(fd.get(k) ?? '').trim();
  const resource = g('resource') as Resource;
  const tenantId = g('tenantId');
  const verify = g('verifyUntil');
  const errors: Record<string, string> = {};
  if (!RESOURCES[resource]) errors.resource = 'Выберите ресурс';
  if (tenantId && !own.tenants.has(tenantId)) errors.tenantId = 'Выберите, чей счётчик';
  if (verify && !/^\d{4}-\d{2}-\d{2}$/.test(verify)) errors.verifyUntil = 'Дата в формате ДД.ММ.ГГГГ';
  if (Object.keys(errors).length) return { errors };

  const values = { resource, tenantId: tenantId || null, number: g('number').slice(0, 40), place: g('place').slice(0, 120), dayNight: fd.get('dayNight') === '1', verifyUntil: verify || null };
  if (meterId) await db.update(schema.meters).set(values).where(eq(schema.meters.id, meterId));
  else {
    const last = await db.select({ sort: schema.meters.sort }).from(schema.meters).where(eq(schema.meters.objectId, objectId)).orderBy(asc(schema.meters.sort));
    await db.insert(schema.meters).values({ ...values, objectId, sort: last.length ? last[last.length - 1].sort + 1 : 0 });
  }
  revalidatePath('/', 'layout');
  redirect(`/objects/${objectId}${isMonth(month) ? `?m=${month}` : ''}`);
}

export async function deleteMeter(objectId: string, meterId: string, month: string) {
  const user = await requireUser();
  const own = await ownObject(user.accountId, objectId);
  if (!own || !own.meters.has(meterId)) return;
  await db.delete(schema.meters).where(eq(schema.meters.id, meterId));
  revalidatePath('/', 'layout');
  redirect(`/objects/${objectId}${isMonth(month) ? `?m=${month}` : ''}`);
}

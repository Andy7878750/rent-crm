import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { getObject, listMeters } from '@/lib/data';
import { defaultMonth, isMonth } from '@/lib/month';
import { RESOURCES, type Resource } from '@/lib/receipts';
import { MeterForm } from './meter-form';

export const metadata = { title: 'Счётчик' };

export default async function MeterPage({ params, searchParams }: PageProps<'/objects/[id]/meter'>) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const obj = await getObject(user.accountId, id);
  if (!obj) notFound();
  const month = isMonth(sp.m) ? sp.m : defaultMonth();
  const mid = typeof sp.id === 'string' ? sp.id : null;
  const meter = mid ? (await listMeters(user.accountId, id)).find((m) => m.id === mid) : undefined;
  if (mid && !meter) notFound();
  const r = typeof sp.r === 'string' && sp.r in RESOURCES ? (sp.r as Resource) : 'el';
  return (
    <MeterForm objectId={obj.id} objectName={obj.short} month={month} meterId={meter?.id ?? null} isOwner={obj.isOwner}
      tenants={obj.tenants.map((t) => ({ id: t.id, name: t.name }))}
      init={meter ? { resource: meter.resource as Resource, tenantId: meter.tenantId ?? '', number: meter.number, place: meter.place, dayNight: meter.dayNight, verifyUntil: meter.verifyUntil ?? '' }
        : { resource: r, tenantId: '', number: '', place: '', dayNight: false, verifyUntil: '' }} />
  );
}

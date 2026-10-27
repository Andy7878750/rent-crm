import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { listMeters, loadMonthInput, objectBillsOf, readAccountList } from '@/lib/data';
import { activeTariff } from '@/lib/calc/engine';
import { defaultMonth, isMonth, monthLabel, shiftMonth } from '@/lib/month';
import { CATEGORIES, category, type Method } from '@/lib/receipts';
import { ReceiptForm, type ReceiptInit } from './receipt-form';

export const metadata = { title: 'Квитанция' };

const s = (n?: number) => (n === undefined ? '' : String(n).replace('.', ','));

export default async function ReceiptPage({ params, searchParams }: PageProps<'/objects/[id]/receipt'>) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const month = isMonth(sp.m) ? sp.m : defaultMonth();
  const [{ input, objects }, meters, saved, prevBills] = await Promise.all([
    loadMonthInput(user.accountId, month), listMeters(user.accountId, id), readAccountList(user.accountId, 'suppliers'), objectBillsOf(id, shiftMonth(month, -1)),
  ]);
  const obj = objects.find((o) => o.id === id);
  if (!obj) notFound();
  const services = input.services.filter((x) => x.objectId === obj.id);
  const sid = typeof sp.s === 'string' ? sp.s : null;
  const svc = sid ? services.find((x) => x.id === sid) : undefined;
  if (sid && !svc) notFound();

  // Начальные значения: существующая квитанция или новый вид (?c=el).
  let init: ReceiptInit;
  if (svc) {
    const trs = obj.tenants.map((t) => [t.id, activeTariff(svc, t.id, month)] as const).filter(([, tr]) => tr);
    const tr = trs[0]?.[1] ?? svc.tariffs.sort((a, b) => b.from.localeCompare(a.from))[0];
    const logic = (tr?.logic === 'norm' ? 'meter' : tr?.logic ?? 'share') as Method;
    const whoAll = tr?.who === 'all';
    const rd = (t: string, k: string) => input.readings[t]?.[k];
    init = {
      category: svc.category ?? '', supplier: svc.supplier, name: svc.name, unit: svc.unit, logic,
      amount: input.bills[obj.id]?.[svc.id] === undefined ? '' : (input.bills[obj.id][svc.id] as number).toFixed(2).replace('.', ','),
      price: s(tr?.price), price2: s(tr?.price2), hasNorm: tr?.norm !== undefined, norm: s(tr?.norm), normPrice: s(tr?.normPrice), extraName: tr?.extraName ?? '',
      sources: tr?.sources ?? [], whoAll: logic === 'fixed' ? false : whoAll || !tr,
      who: logic === 'fixed' ? trs.map(([t]) => t) : whoAll ? obj.tenants.map((t) => t.id) : trs.map(([t]) => t),
      fixed: Object.fromEntries(trs.map(([t, x]) => [t, s(x!.price)])),
      readings: Object.fromEntries(obj.tenants.map((t) => [t.id, {
        prev: s(rd(t.id, svc.id)?.prev), cur: s(rd(t.id, svc.id)?.cur), usage: s(rd(t.id, svc.id)?.usage),
        dayPrev: s(rd(t.id, svc.id + ':day')?.prev), dayCur: s(rd(t.id, svc.id + ':day')?.cur),
        nightPrev: s(rd(t.id, svc.id + ':night')?.prev), nightCur: s(rd(t.id, svc.id + ':night')?.cur),
      }])),
    };
  } else {
    const c = category(typeof sp.c === 'string' ? sp.c : CATEGORIES.find((x) => !services.some((y) => y.category === x.id))?.id ?? '');
    init = {
      category: c.id, supplier: c.supplier, name: c.name, unit: c.unit, logic: obj.isOwner && c.def === 'whole' ? 'whole' : c.def as Method, amount: '',
      price: c.price ?? '', price2: '', hasNorm: false, norm: '', normPrice: '', extraName: '',
      sources: c.id === 'dr' ? services.filter((x) => x.category === 'cw' || x.category === 'hw').map((x) => x.id) : [],
      whoAll: true, who: obj.tenants.map((t) => t.id), fixed: {},
      readings: Object.fromEntries(obj.tenants.map((t) => [t.id, { prev: '', cur: '', usage: '', dayPrev: '', dayCur: '', nightPrev: '', nightCur: '' }])),
    };
  }

  const suppliers = [...new Set([...saved, ...services.map((x) => x.supplier), ...CATEGORIES.map((c) => c.supplier).filter(Boolean)])];
  return (
    <ReceiptForm
      objectId={obj.id} objectName={obj.short} isOwner={obj.isOwner} month={month} monthText={monthLabel(month)}
      serviceId={svc?.id ?? null} init={init} suppliers={suppliers}
      prevAmount={svc ? prevBills[svc.id] : undefined}
      tenants={obj.tenants.map((t) => ({ id: t.id, name: t.name, share: Number(t.share), email: t.email }))}
      others={services.filter((x) => x.id !== svc?.id).map((x) => ({ id: x.id, name: x.name, category: x.category ?? '' }))}
      meters={meters.map((m) => ({ id: m.id, resource: m.resource, number: m.number, tenantId: m.tenantId, dayNight: m.dayNight }))}
      input={{ ...input, objects: input.objects.filter((o) => o.id === obj.id), services }}
    />
  );
}

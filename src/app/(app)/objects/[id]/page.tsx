import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Building2, FileText } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { listInvoices, loadMonthInput } from '@/lib/data';
import { activeTariff, calculateMonth } from '@/lib/calc/engine';
import { fmtMoney, rubWords } from '@/lib/calc/format';
import type { BillLine } from '@/lib/calc/types';
import { defaultMonth, isMonth, monthLabel } from '@/lib/month';
import { MonthNav } from '@/components/month-nav';
import { InputCard, type BillField, type MeterField } from './input-card';

const pctTxt = (v: number) => String(v).replace('.', ',') + '%';

export default async function ObjectPage({ params, searchParams }: PageProps<'/objects/[id]'>) {
  const { id } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const month = isMonth(sp.m) ? sp.m : defaultMonth();
  const [{ input, objects }, invoices] = await Promise.all([loadMonthInput(user.accountId, month), listInvoices(user.accountId, month)]);
  const issued = new Set(invoices.map((i) => i.tenantId));
  const obj = objects.find((o) => o.id === id);
  if (!obj) notFound();
  const res = calculateMonth(input);

  const tenant = obj.tenants.find((t) => t.id === sp.t) ?? obj.tenants[0];
  const bill = tenant ? res.tenants[tenant.id] : null;
  const total = obj.tenants.reduce((a, t) => a + (res.tenants[t.id]?.total ?? 0), 0);
  const filled = obj.tenants.filter((t) => res.tenants[t.id] && !res.tenants[t.id].missing.length).length;
  const own = res.owner[obj.id];
  const statusOf = (tid: string) => {
    const b = res.tenants[tid];
    if (obj.isOwner) {
      if (!b || !b.serviceCount) return { text: 'Нет услуг', cls: 'bg-[#eef0f3] text-[#4d5f71]' };
      return b.missing.length ? { text: 'Нет показаний', cls: 'bg-bad-soft text-bad' } : { text: 'Внесено', cls: 'bg-ok-soft text-ok' };
    }
    if (issued.has(tid)) return { text: 'Счёт выставлен', cls: 'bg-ok-soft text-ok' };
    if (!b || !b.serviceCount) return { text: 'Нет услуг', cls: 'bg-[#eef0f3] text-[#4d5f71]' };
    return b.missing.length ? { text: 'Нет показаний', cls: 'bg-bad-soft text-bad' } : { text: 'Готов к счёту', cls: 'bg-[#e8edf2] text-[#2c3e50]' };
  };

  // Поля «Ввода данных» для выбранного арендатора.
  const billFields: BillField[] = [];
  const meterFields: MeterField[] = [];
  if (tenant && bill) {
    for (const s of input.services) {
      const tr = activeTariff(s, tenant.id, month, obj.isOwner);
      if (!tr || s.kind === 'owner') continue;
      if (tr.logic === 'share' || tr.logic === 'split' || tr.logic === 'meterRest') {
        billFields.push({ serviceId: s.id, supplier: s.supplier, name: s.name, value: input.bills[obj.id]?.[s.id] });
      }
      const rd = input.readings[tenant.id] || {};
      if (tr.logic === 'split') meterFields.push({ serviceId: s.id, zone: '', label: s.name, unit: s.unit, direct: true, cur: rd[s.id]?.usage });
      if (tr.logic === 'meter' || tr.logic === 'meterRest') meterFields.push({ serviceId: s.id, zone: '', label: s.name, unit: s.unit, direct: false, prev: rd[s.id]?.prev, cur: rd[s.id]?.cur });
      if (tr.logic === 'dn') for (const [z, zl] of [['day', 'день'], ['night', 'ночь']] as const) {
        const r = rd[`${s.id}:${z}`];
        meterFields.push({ serviceId: s.id, zone: z, label: `${s.name} — ${zl}`, unit: s.unit, direct: false, prev: r?.prev, cur: r?.cur });
      }
    }
  }
  const idx = tenant ? obj.tenants.findIndex((t) => t.id === tenant.id) : -1;
  const next = idx >= 0 ? obj.tenants[idx + 1] : undefined;

  const groups: Array<[string, BillLine[]]> = bill ? ([
    ['Общие', bill.lines.filter((l) => l.group === 'common')],
    ['Индивидуальные — по счётчикам', bill.lines.filter((l) => l.group === 'indiv')],
    ['Фиксированные', bill.lines.filter((l) => l.group === 'fixed')],
  ] as Array<[string, BillLine[]]>).filter(([, ls]) => ls.length) : [];

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <nav aria-label="Навигация" className="flex items-center gap-2 text-[24px] font-bold">
          <Link href={`/objects?m=${month}`} className="text-accent hover:underline">Объекты</Link>
          <span className="text-faint">/</span><span>{obj.short}</span>
        </nav>
        <MonthNav month={month} path={`/objects/${obj.id}`} extra={tenant ? `&t=${tenant.id}` : ''} />
        <div className="flex-1" />
        <Link href={`/objects/${obj.id}/edit`} className="btn">Изменить объект</Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        {obj.isOwner ? (
          <>
            <Kpi label="За месяц — на вас" value={`${fmtMoney(total + (own?.total ?? 0))} ₽`} />
            <Kpi label="Квитанции и показания" value={filled ? 'внесены' : 'не внесены'} />
          </>
        ) : (
          <>
            <Kpi label="К выставлению" value={`${fmtMoney(total)} ₽`} />
            <Kpi label="Арендаторы" value={String(obj.tenants.length)} note={`· готовы ${filled}`} />
            <Kpi label="Квитанции и показания" value={`${filled} из ${obj.tenants.length}`} />
            <Kpi label="Остаётся на вас" value={`${fmtMoney(own?.total ?? 0)} ₽`} note={own?.lines.map((l) => l.label).join(', ') || 'нет расходов'} small />
          </>
        )}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        {/* 1. Объект и арендаторы */}
        <section aria-label="Объект" className="card flex flex-col">
          <div className="flex gap-3 p-[18px]">
            <span className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-accent-soft text-accent"><Building2 size={20} /></span>
            <span><b className="block text-[17px] font-semibold">{obj.short}</b><span className="hint">{obj.address || 'Адрес не указан'}</span></span>
          </div>
          <div className="border-t border-[#edf0f5] p-[18px]">
            {(
              <>
                <div className="eyebrow mb-2">{obj.isOwner ? 'Пользуется собственник' : `Арендаторы · ${obj.tenants.length}`}</div>
                <div className="flex flex-col gap-2">
                  {obj.tenants.map((t) => {
                    const st = statusOf(t.id); const on = tenant?.id === t.id;
                    return (
                      <Link key={t.id} href={`/objects/${obj.id}?m=${month}&t=${t.id}`} aria-current={on ? 'true' : undefined}
                        className={`rounded-[10px] border px-3.5 py-3 ${on ? 'border-2 border-accent bg-[#f2f5f8]' : 'border-line hover:border-line-strong'}`}>
                        <span className="flex items-baseline justify-between gap-2"><b className="truncate text-[15px] font-semibold">{t.name}</b>{!obj.isOwner && <span className="hint">доля {pctTxt(Number(t.share))}</span>}</span>
                        <span className="mt-1.5 flex items-center justify-between gap-2"><span className="hint">{t.phone}</span><span className={`pill ${st.cls}`}>{st.text}</span></span>
                      </Link>
                    );
                  })}
                </div>
                {!obj.isOwner && <Link href={`/objects/${obj.id}/edit`} className="mt-2.5 block rounded-lg border border-dashed border-[#bcc5cf] px-2.5 py-2 font-semibold text-accent">+ Добавить арендатора</Link>}
              </>
            )}
          </div>
        </section>

        {/* 2. Ввод данных */}
        {tenant && bill ? (
          <InputCard key={`${tenant.id}-${month}`} objectId={obj.id} tenantId={tenant.id} tenantName={tenant.name} month={month} monthText={monthLabel(month)}
            objectName={obj.short} bills={billFields} meters={meterFields} missing={bill.missing.length} serviceCount={bill.serviceCount}
            nextHref={next ? `/objects/${obj.id}?m=${month}&t=${next.id}` : null} nextName={next?.name ?? ''} />
        ) : (
          <section className="card p-[18px] text-ink-2">Добавьте арендатора, чтобы вносить показания.</section>
        )}

        {/* 3. Расчёт */}
        {bill && tenant ? (
          <section aria-label="Расчёт" className="card flex flex-col">
            <div className="flex items-start justify-between gap-2 p-[18px] pb-2">
              <div><div className="eyebrow">Расчёт</div><div className="mt-1 text-[16px] font-bold">{tenant.name}</div></div>
              <span className={`pill ${statusOf(tenant.id).cls}`}>{statusOf(tenant.id).text}</span>
            </div>
            <div className="flex flex-col gap-3 px-[18px] pb-4">
              {groups.map(([title, ls]) => (
                <div key={title} className="overflow-hidden rounded-[10px] border border-[#e6eaee]">
                  <div className="flex justify-between bg-[#f3f5f9] px-3 py-2 font-semibold"><span>{title}</span><span>{fmtMoney(ls.reduce((a, l) => a + (l.amount ?? 0), 0))}</span></div>
                  {ls.map((l, i) => (
                    <div key={i} className="flex justify-between gap-3 border-t border-[#f0f2f6] px-3 py-2">
                      <span className="min-w-0"><span className="block">{l.label}</span>
                        {l.formula !== 'фиксированная сумма' && <span className="block text-[12px] text-muted">{l.formula}</span>}
                        {l.note && <span className="block text-[12px] text-faint">{l.note}</span>}</span>
                      <span className="whitespace-nowrap font-semibold">{l.amount === null ? '—' : fmtMoney(l.amount)}</span>
                    </div>
                  ))}
                </div>
              ))}
              <div className="mt-1 flex items-baseline justify-between border-t-2 border-nav pt-2.5">
                <b className="font-bold">Итого к оплате</b><span className="text-[22px] font-bold">{fmtMoney(bill.total)} ₽</span>
              </div>
              <div className="hint">{rubWords(bill.total)}. Без НДС.</div>
            </div>
            <div className="mt-auto flex flex-wrap gap-2 border-t border-line px-[18px] py-3.5">
              <Link href={`/report/${tenant.id}?m=${month}`} target="_blank" className="btn btn-primary"><FileText size={16} /> Отчёт PDF</Link>
              {obj.isOwner ? null : issued.has(tenant.id) ? <Link href="/bills/issued" className="btn">Счёт выставлен →</Link> : <Link href={`/bills?m=${month}`} className="btn">К выставлению →</Link>}
            </div>
          </section>
        ) : <div />}
      </div>
    </>
  );
}

function Kpi({ label, value, note, small }: { label: string; value: string; note?: string; small?: boolean }) {
  return (
    <div className="card px-4 py-3.5">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-0.5 text-[22px] font-bold">{value} {note && !small && <span className="text-[13px] font-medium text-muted">{note}</span>}</div>
      {note && small && <div className="hint truncate">{note}</div>}
    </div>
  );
}

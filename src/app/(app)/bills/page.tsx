import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { listInvoices, loadMonthInput } from '@/lib/data';
import { calculateMonth } from '@/lib/calc/engine';
import { fmtMoney, sumMoney } from '@/lib/calc/format';
import { defaultMonth, isMonth, monthLabel } from '@/lib/month';
import { MonthNav } from '@/components/month-nav';
import { IssueAllButton, IssueButton } from './issue-buttons';

export const metadata = { title: 'К выставлению' };

export default async function ToIssuePage({ searchParams }: PageProps<'/bills'>) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = isMonth(sp.m) ? sp.m : defaultMonth();
  const [{ input, objects }, invoices] = await Promise.all([loadMonthInput(user.accountId, month), listInvoices(user.accountId, month)]);
  const res = calculateMonth(input);
  const issued = new Set(invoices.map((i) => i.tenantId));

  const rows = objects.filter((o) => !o.isOwner).flatMap((o) => o.tenants.map((t) => ({ t, o, bill: res.tenants[t.id] })))
    .filter((r) => r.bill && !issued.has(r.t.id));
  const ready = rows.filter((r) => r.bill.serviceCount && !r.bill.missing.length);
  const missing = rows.filter((r) => !r.bill.serviceCount || r.bill.missing.length);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-bold">К выставлению</h1>
        <MonthNav month={month} path="/bills" />
        <div className="flex-1" />
        <IssueAllButton month={month} tenantIds={ready.map((r) => r.t.id)} />
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <div className="card px-4 py-3.5"><div className="text-[12px] text-muted">Готовы к счёту</div>
          <div className="text-[22px] font-bold">{ready.length} <span className="text-[13px] font-medium text-muted">на {fmtMoney(sumMoney(ready.map((r) => r.bill.total)))} ₽</span></div></div>
        <div className="card px-4 py-3.5"><div className="text-[12px] text-muted">Нет показаний</div><div className="text-[22px] font-bold text-bad">{missing.length}</div></div>
        <div className="card px-4 py-3.5"><div className="text-[12px] text-muted">Уже выставлено за {monthLabel(month).toLowerCase()}</div>
          <div className="text-[22px] font-bold">{invoices.length} <Link href="/bills/issued" className="text-[13px] font-semibold text-accent">открыть →</Link></div></div>
      </div>

      <div className="card overflow-x-auto">
        <div role="table" aria-label="Счета к выставлению" className="min-w-[760px]">
          <div role="row" className="grid grid-cols-[minmax(200px,1.4fr)_150px_130px_minmax(300px,1.4fr)] gap-3 rounded-t-xl bg-[#f6f8fb] px-4 py-2.5 text-[12px] font-semibold text-muted">
            <span role="columnheader">Арендатор</span><span role="columnheader">Статус</span><span role="columnheader" className="text-right">Сумма, ₽</span><span role="columnheader" />
          </div>
          {rows.length === 0 && <div className="px-4 py-7 text-center text-muted">Все счета за {monthLabel(month).toLowerCase()} выставлены. Они в разделе «Выставленные».</div>}
          {rows.map(({ t, o, bill }) => {
            const ok = bill.serviceCount && !bill.missing.length;
            return (
              <div key={t.id} role="row" className="grid grid-cols-[minmax(200px,1.4fr)_150px_130px_minmax(300px,1.4fr)] items-center gap-3 border-t border-[#eef1f5] px-4 py-2.5">
                <Link role="cell" href={`/objects/${o.id}?m=${month}&t=${t.id}`} className="group min-w-0" title={ok ? 'Открыть объект' : bill.missing.join('\n')}>
                  <b className="block truncate font-semibold group-hover:text-accent group-hover:underline">{t.name}</b><span className="hint">{o.short}</span>
                </Link>
                <span role="cell"><span className={`pill ${ok ? 'bg-[#e8edf2] text-[#2c3e50]' : 'bg-bad-soft text-bad'}`}>{!bill.serviceCount ? 'Нет услуг' : ok ? 'Готов к счёту' : 'Нет показаний'}</span></span>
                <span role="cell" className={`text-right font-semibold ${ok ? '' : 'text-faint'}`} title={ok ? undefined : 'Предварительно: не все данные внесены'}>{bill.serviceCount ? fmtMoney(bill.total) : '—'}</span>
                <span role="cell" className="flex flex-wrap justify-end gap-2">
                  <Link href={`/report/${t.id}?m=${month}`} target="_blank" className="btn px-3 py-1.5 text-[13px]">Отчёт PDF</Link>
                  <IssueButton month={month} tenantId={t.id} disabled={!ok} />
                </span>
              </div>
            );
          })}
        </div>
      </div>
      <p className="text-[13px] text-muted">«Нет показаний» — нажмите на арендатора, откроется объект, где можно дозаполнить данные. Выставленный счёт переходит в «Выставленные», там отмечается оплата.</p>
    </>
  );
}

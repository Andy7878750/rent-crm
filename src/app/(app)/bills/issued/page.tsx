import Link from 'next/link';
import { requireUser } from '@/lib/auth/session';
import { listInvoices } from '@/lib/data';
import { fmtMoney, sumMoney } from '@/lib/calc/format';
import { defaultMonth, monthLabel } from '@/lib/month';
import { CancelButton, PaidToggle } from '../issue-buttons';

export const metadata = { title: 'Выставленные счета' };

const FILTERS = [['all', 'Все'], ['unpaid', 'Не оплачены'], ['paid', 'Оплачены']] as const;
const d = (s: string) => s.split('-').reverse().join('.');

export default async function IssuedPage({ searchParams }: PageProps<'/bills/issued'>) {
  const user = await requireUser();
  const sp = await searchParams;
  const f = FILTERS.some(([k]) => k === sp.f) ? (sp.f as string) : 'all';
  const all = await listInvoices(user.accountId);
  const cur = defaultMonth();
  const late = (i: (typeof all)[number]) => !i.paidOn && i.month < cur;
  const rows = all.filter((i) => f === 'all' || (f === 'paid' ? !!i.paidOn : !i.paidOn));
  const total = sumMoney(all.map((i) => Number(i.total)));
  const paid = sumMoney(all.filter((i) => i.paidOn).map((i) => Number(i.total)));
  const unpaid = all.filter((i) => !i.paidOn);

  return (
    <>
      <h1 className="text-[22px] font-bold">Выставленные счета</h1>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-3">
        <div className="card px-4 py-3.5"><div className="text-[12px] text-muted">Выставлено</div><div className="text-[22px] font-bold">{fmtMoney(total)} ₽</div></div>
        <div className="card px-4 py-3.5"><div className="text-[12px] text-muted">Оплачено арендаторами</div><div className="text-[22px] font-bold text-ok">{fmtMoney(paid)} ₽</div></div>
        <div className="card px-4 py-3.5"><div className="text-[12px] text-muted">Должны вам</div><div className="text-[22px] font-bold text-bad">{fmtMoney(total - paid)} ₽</div>
          <div className="hint">не оплачено: {unpaid.length}{unpaid.filter(late).length ? ` · просрочено: ${unpaid.filter(late).length}` : ''}</div></div>
      </div>
      <div role="group" aria-label="Фильтр по оплате" className="flex flex-wrap gap-2">
        {FILTERS.map(([k, l]) => (
          <Link key={k} href={k === 'all' ? '/bills/issued' : `/bills/issued?f=${k}`} aria-pressed={f === k}
            className={`rounded-full border px-3.5 py-1.5 font-semibold ${f === k ? 'border-nav bg-nav text-white' : 'border-line-strong bg-white text-[#4d5f71]'}`}>{l}</Link>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <div role="table" aria-label="Выставленные счета" className="min-w-[860px]">
          <div role="row" className="grid grid-cols-[130px_minmax(180px,1.4fr)_120px_120px_170px_minmax(160px,1fr)] gap-3 rounded-t-xl bg-[#f6f8fb] px-4 py-2.5 text-[12px] font-semibold text-muted">
            <span>№ · выставлен</span><span>Арендатор</span><span>Месяц</span><span className="text-right">Сумма, ₽</span><span>Оплата</span><span />
          </div>
          {rows.length === 0 && <div className="px-4 py-7 text-center text-muted">{all.length ? 'Нет счетов по этому фильтру.' : 'Выставленных счетов пока нет. Их отмечают в «К выставлению».'}</div>}
          {rows.map((i) => (
            <div key={i.id} role="row" className="grid grid-cols-[130px_minmax(180px,1.4fr)_120px_120px_170px_minmax(160px,1fr)] items-center gap-3 border-t border-[#eef1f5] px-4 py-2.5">
              <span><b className="font-semibold">{i.number}</b><span className="block hint">{d(i.issuedOn)}</span></span>
              <span className="min-w-0"><b className="block truncate font-semibold">{i.tenantName}</b><span className="hint">{i.objectName}</span></span>
              <span>{monthLabel(i.month)}</span>
              <span className="text-right font-semibold">{fmtMoney(Number(i.total))}</span>
              <span><PaidToggle id={i.id} paidOn={i.paidOn} late={late(i)} /></span>
              <span className="flex justify-end gap-2">
                <Link href={`/report/${i.tenantId}?m=${i.month}`} target="_blank" className="btn px-3 py-1.5 text-[13px]">PDF</Link>
                {!i.paidOn && <CancelButton id={i.id} />}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

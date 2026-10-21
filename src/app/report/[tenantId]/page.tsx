import { notFound } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth/session';
import { loadMonthInput, type InvoiceSnapshot } from '@/lib/data';
import { calculateMonth } from '@/lib/calc/engine';
import { fmtMoney, rubWords } from '@/lib/calc/format';
import type { BillLine, MeterUse } from '@/lib/calc/types';
import { defaultMonth, isMonth, monthLabel } from '@/lib/month';
import { PrintBar } from './print-bar';

export const metadata = { title: 'Отчёт для арендатора' };

const q = (n: number) => String(Math.round(n * 1000) / 1000).replace('.', ',');
const GROUPS: Array<[BillLine['group'], string]> = [['common', 'Общие'], ['indiv', 'Индивидуальные — по счётчикам'], ['fixed', 'Фиксированные']];

/** Отчёт для арендатора (ТЗ, раздел 9): одна страница A4, минимализм, итог в конце. */
export default async function ReportPage({ params, searchParams }: PageProps<'/report/[tenantId]'>) {
  const { tenantId } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const month = isMonth(sp.m) ? sp.m : defaultMonth();
  if (!/^[0-9a-f-]{36}$/i.test(tenantId)) notFound();

  const [inv] = await db.select().from(schema.invoices)
    .where(and(eq(schema.invoices.accountId, user.accountId), eq(schema.invoices.tenantId, tenantId), eq(schema.invoices.month, month))).limit(1);
  const [acc] = await db.select().from(schema.accounts).where(eq(schema.accounts.id, user.accountId)).limit(1);

  let snap: InvoiceSnapshot; let total: number; let number: string | null = null; let date: string | null = null;
  if (inv) {
    snap = inv.lines as InvoiceSnapshot; total = Number(inv.total); number = inv.number; date = inv.issuedOn;
  } else {
    const { input, objects } = await loadMonthInput(user.accountId, month);
    const bill = calculateMonth(input).tenants[tenantId];
    if (!bill) notFound();
    const obj = objects.find((o) => o.id === bill.objectId)!;
    const ten = obj.tenants.find((t) => t.id === tenantId)!;
    snap = { tenantName: ten.name, objectName: obj.short, share: Number(ten.share), lines: bill.lines, meters: bill.meters };
    total = bill.total;
  }

  // Показания «643 → 647» в строке услуги.
  const readings = (l: BillLine) => (snap.meters as MeterUse[])
    .filter((m) => m.serviceId === l.serviceId && (m.label === l.label || m.label.startsWith(l.label + ' — ')))
    .filter((m) => m.prev !== undefined && m.cur !== undefined)
    .map((m) => (m.label === l.label ? '' : m.label.slice(l.label.length + 3) + ' ') + `${q(m.prev!)} → ${q(m.cur!)}`).join(', ');

  const req = (acc?.requisites ?? {}) as Record<string, string | boolean | undefined>;
  const footer = [req.name || acc?.name, req.inn ? `ИНН ${req.inn}` : '', [req.phone, req.email].filter(Boolean).join(', '), req.noVat === false ? '' : 'без НДС']
    .filter(Boolean).join(' · ');

  return (
    <div className="min-h-screen bg-[#e9edf3] print:bg-white">
      <PrintBar title={`Отчёт для арендатора · ${snap.tenantName}`} />
      <article aria-label="Расчёт коммунальных платежей"
        className="mx-auto my-6 max-w-[800px] bg-white px-6 py-10 text-[13px] leading-normal shadow-card sm:px-16 sm:py-14 print:my-0 print:max-w-none print:p-0 print:shadow-none">
        <header className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
          <h1 className="text-[20px] font-semibold">Коммунальные платежи · {monthLabel(month)}</h1>
          <span className="text-faint">{number ? `№ ${number} от ${date!.split('-').reverse().join('.')}` : 'Предварительный расчёт'}</span>
        </header>
        <div className="mt-7 pb-1.5">
          <div className="text-[15px] font-semibold">{snap.tenantName}</div>
          <div className="text-muted">{snap.objectName}, доля {String(snap.share).replace('.', ',')}%</div>
        </div>

        {GROUPS.map(([g, title]) => {
          const ls = snap.lines.filter((l) => l.group === g);
          if (!ls.length) return null;
          return (
            <div key={g}>
              <div className="mt-6 text-[12px] text-faint">{title}</div>
              {ls.map((l, i) => {
                const rd = readings(l);
                const how = l.formula === 'фиксированная сумма' ? '' : (rd ? `показания ${rd} · ` : '') + l.formula;
                return (
                  <div key={i} className="flex justify-between gap-4 border-b border-[#f0f2f5] py-2.5 [break-inside:avoid]">
                    <span>{l.label}{how && <span className="block text-[12px] text-faint">{how}</span>}</span>
                    <span className="whitespace-nowrap">{l.amount === null ? '—' : fmtMoney(l.amount)}</span>
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t border-ink pt-4">
          <span className="font-semibold">Итого к оплате</span>
          <span className="whitespace-nowrap text-[28px] font-semibold">{fmtMoney(total)} ₽</span>
          <span className="basis-full text-right text-[12px] text-faint">{rubWords(total)}</span>
        </div>
        <footer className="mt-11 text-[11px] text-faint">{footer}</footer>
      </article>
    </div>
  );
}

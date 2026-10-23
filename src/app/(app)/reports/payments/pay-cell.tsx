'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { savePaymentAmount, setPaymentColumn, togglePaymentPaid } from './actions';

export type PayCellData = {
  objectId: string; supplier: string; month: string; on: boolean; auto: boolean; manual?: boolean;
  linkedServiceId?: string | null; amount?: number; paidOn?: string | null;
};

const money = (n?: number) => (n === undefined ? '' : n.toFixed(2).replace('.', ','));
const parse = (s: string) => { const n = Number(s.replace(/\s/g, '').replace(',', '.')); return s.trim() && Number.isFinite(n) ? n : null; };

export function PayCell({ c }: { c: PayCellData }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<unknown>) => start(async () => { await fn(); router.refresh(); });

  if (!c.on) {
    return (
      <span role="cell">
        <button onClick={() => run(() => setPaymentColumn(c.objectId, c.supplier, c.auto ? null : true))} aria-label={`Добавить ${c.supplier}`}
          className="group flex h-11 w-full items-center justify-center rounded-lg border border-dashed border-transparent bg-[#f4f6f9] text-[#b6bfc9] hover:border-[#bcc5cf] hover:bg-white">
          <span className="group-hover:hidden">—</span><b className="hidden text-[18px] text-accent group-hover:inline">+</b>
        </button>
      </span>
    );
  }
  const paid = !!c.paidOn;
  return (
    <span role="cell" className={`group relative flex flex-col gap-0.5 rounded-lg border py-1 pl-2 pr-1 ${paid ? 'border-[#a9d8bc] bg-ok-soft' : 'border-[#dbe1e7] bg-white'} ${pending ? 'opacity-60' : ''} focus-within:border-accent focus-within:ring-[3px] focus-within:ring-accent/15`}>
      <span className="flex items-center gap-1">
        <input inputMode="decimal" aria-label={`${c.supplier}, сумма`} defaultValue={money(c.amount)} placeholder={paid ? 'без суммы' : 'сумма'}
          className="min-w-0 flex-1 border-0 bg-transparent py-1 text-right outline-none"
          onBlur={(e) => { if (parse(e.target.value) !== (c.amount ?? null)) run(() => savePaymentAmount(c.objectId, c.supplier, c.month, c.linkedServiceId ?? null, e.target.value)); }} />
        <button onClick={() => run(() => togglePaymentPaid(c.objectId, c.supplier, c.month))} aria-pressed={paid}
          aria-label={`${c.supplier}: ${paid ? 'снять отметку об оплате' : 'отметить оплату'}`} title={paid ? 'Снять отметку об оплате' : 'Отметить: оплачено сегодня'}
          className={`flex size-6 flex-none items-center justify-center rounded-full border-[1.5px] text-[13px] font-bold ${paid ? 'border-[#1f8a55] bg-[#1f8a55] text-white' : 'border-[#bcc5cf] bg-white text-transparent hover:border-ok hover:text-[#a9d8bc]'}`}>✓</button>
      </span>
      <span className={`pr-7 text-right text-[11px] ${paid ? 'text-ok' : 'text-muted'}`}>
        {paid ? `оплачено ${c.paidOn!.slice(8, 10)}.${c.paidOn!.slice(5, 7)}` : c.amount === undefined ? 'нет счёта' : ''}
      </span>
      {c.manual && (
        <button onClick={() => run(() => setPaymentColumn(c.objectId, c.supplier, null))} aria-label={`Убрать ${c.supplier}`} title="Убрать"
          className="absolute -left-2 -top-2 hidden size-[18px] items-center justify-center rounded-full border border-line-strong bg-white text-[12px] text-muted group-hover:flex">×</button>
      )}
    </span>
  );
}

'use client';

import { useTransition } from 'react';
import { cancelInvoice, issueInvoices, togglePaid } from './actions';

export function IssueButton({ month, tenantId, disabled }: { month: string; tenantId: string; disabled: boolean }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn px-3 py-1.5 text-[13px]" disabled={disabled || pending}
      title={disabled ? 'Сначала внесите все показания' : 'Счёт уйдёт в «Выставленные»'}
      onClick={() => start(async () => { await issueInvoices(month, [tenantId]); })}>
      {pending ? 'Отмечаем…' : 'Отметить выставленным'}
    </button>
  );
}

export function IssueAllButton({ month, tenantIds }: { month: string; tenantIds: string[] }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn btn-primary" disabled={!tenantIds.length || pending}
      onClick={() => start(async () => { await issueInvoices(month, tenantIds); })}>
      {pending ? 'Отмечаем…' : `Отметить выставленными все готовые · ${tenantIds.length}`}
    </button>
  );
}

export function PaidToggle({ id, paidOn, late }: { id: string; paidOn: string | null; late: boolean }) {
  const [pending, start] = useTransition();
  const cls = paidOn ? 'border-[#a9d8bc] bg-ok-soft text-ok' : late ? 'border-[#ebc0b4] bg-bad-soft text-bad' : 'border-line-strong bg-white text-ink-2';
  return (
    <button aria-pressed={!!paidOn} disabled={pending} onClick={() => start(() => togglePaid(id))}
      title={paidOn ? 'Снять отметку об оплате' : 'Отметить: оплачен сегодня'}
      className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border py-1 pl-1 pr-2.5 text-[13px] ${cls}`}>
      <span aria-hidden className={`flex size-[22px] items-center justify-center rounded-full border-[1.5px] text-[12px] font-bold ${paidOn ? 'border-[#1f8a55] bg-[#1f8a55] text-white' : 'border-[#bcc5cf] bg-white text-transparent'}`}>✓</span>
      {paidOn ? `оплачен ${paidOn.slice(8, 10)}.${paidOn.slice(5, 7)}` : late ? 'просрочен' : 'ждём оплату'}
    </button>
  );
}

export function CancelButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button className="btn px-3 py-1.5 text-[13px]" disabled={pending} title="Вернуть в «К выставлению»"
      onClick={() => start(() => cancelInvoice(id))}>Отменить</button>
  );
}

'use client';

import { useTransition } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { swapServices } from './actions';

export function MoveButtons({ id, name, pos, up, down, compact = false }: { id: string; name: string; pos: number; up?: string; down?: string; compact?: boolean }) {
  const [pending, start] = useTransition();
  const btn = 'flex size-7 items-center justify-center rounded-md border border-line-strong bg-white hover:border-accent hover:text-accent disabled:cursor-default disabled:opacity-35';
  if (compact) {
    const b = 'flex size-6 items-center justify-center rounded-md text-faint hover:bg-white hover:text-ink disabled:invisible';
    return (
      <span className="flex items-center gap-0.5">
        <button className={b} disabled={!up || pending} onClick={() => up && start(() => swapServices(id, up))} aria-label={`Поднять «${name}» выше`} title="Выше"><ArrowUp size={14} /></button>
        <button className={b} disabled={!down || pending} onClick={() => down && start(() => swapServices(id, down))} aria-label={`Опустить «${name}» ниже`} title="Ниже"><ArrowDown size={14} /></button>
      </span>
    );
  }
  return (
    <div className="flex items-center gap-1.5 rounded-b-xl border-t border-[#edf0f5] bg-[#fafbfc] py-1.5 pl-[18px] pr-2.5">
      <span className="flex-1 text-[12px] text-muted">Порядок в счёте: <b className="text-ink">{pos}</b></span>
      <button className={btn} disabled={!up || pending} onClick={() => up && start(() => swapServices(id, up))} aria-label={`Поднять «${name}» выше`} title="Выше"><ArrowUp size={15} /></button>
      <button className={btn} disabled={!down || pending} onClick={() => down && start(() => swapServices(id, down))} aria-label={`Опустить «${name}» ниже`} title="Ниже"><ArrowDown size={15} /></button>
    </div>
  );
}

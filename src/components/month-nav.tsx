import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { monthLabel, shiftMonth } from '@/lib/month';

/** Листание расчётного месяца: ‹ Август 2026 ›. Месяц хранится в адресе (?m=2026-08). */
export function MonthNav({ month, path, extra = '' }: { month: string; path: string; extra?: string }) {
  const href = (m: string) => `${path}?m=${m}${extra}`;
  return (
    <div className="flex items-center gap-1 text-accent">
      <Link href={href(shiftMonth(month, -1))} aria-label="Предыдущий месяц" className="flex size-8 items-center justify-center rounded-lg hover:bg-white"><ChevronLeft size={20} /></Link>
      <span className="min-w-[150px] text-center text-[22px] font-semibold">{monthLabel(month)}</span>
      <Link href={href(shiftMonth(month, 1))} aria-label="Следующий месяц" className="flex size-8 items-center justify-center rounded-lg hover:bg-white"><ChevronRight size={20} /></Link>
    </div>
  );
}

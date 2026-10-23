'use client';

import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Floating } from './floating';

const MONTHS = ['Январь', 'Февраль', 'Март', 'Апрель', 'Май', 'Июнь', 'Июль', 'Август', 'Сентябрь', 'Октябрь', 'Ноябрь', 'Декабрь'];
const DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const pad = (n: number) => String(n).padStart(2, '0');
const iso = (y: number, m: number, d: number) => `${y}-${pad(m + 1)}-${pad(d)}`;
const toRu = (v: string) => (/^\d{4}-\d{2}-\d{2}$/.test(v) ? `${v.slice(8, 10)}.${v.slice(5, 7)}.${v.slice(0, 4)}` : '');
function fromRu(s: string): string | null {
  const m = s.trim().match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (!m) return null;
  const [d, mo, y] = [Number(m[1]), Number(m[2]) - 1, Number(m[3])];
  const dt = new Date(y, mo, d);
  return dt.getFullYear() === y && dt.getMonth() === mo && dt.getDate() === d ? iso(y, mo, d) : null;
}

/** Поле даты: ввод с клавиатуры «дд.мм.гггг» или выбор в календаре. Значение — «гггг-мм-дд» или пусто. */
export function DateInput({ value, onChange, error, placeholder = 'дд.мм.гггг' }: { value: string; onChange: (v: string) => void; error?: boolean; placeholder?: string }) {
  const [text, setText] = useState(toRu(value));
  const [seen, setSeen] = useState(value);
  if (seen !== value) { setSeen(value); setText(toRu(value)); }
  const [open, setOpen] = useState(false);
  const base = value ? new Date(`${value}T00:00:00`) : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { const t = e.target as Node; if (!box.current?.contains(t) && !panel.current?.contains(t)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); setOpen(false); } };
    document.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc, true);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc, true); };
  }, [open]);

  const commit = () => {
    if (!text.trim()) { if (value) onChange(''); return; }
    const v = fromRu(text);
    if (v) { if (v !== value) onChange(v); setText(toRu(v)); } else setText(toRu(value));
  };
  const toggle = () => {
    if (!open) { const b = value ? new Date(`${value}T00:00:00`) : new Date(); setView({ y: b.getFullYear(), m: b.getMonth() }); }
    setOpen(!open);
  };
  const shift = (d: number) => setView(({ y, m }) => ({ y: m + d < 0 ? y - 1 : m + d > 11 ? y + 1 : y, m: (m + d + 12) % 12 }));
  const pick = (v: string) => { onChange(v); setText(toRu(v)); setOpen(false); };

  const first = (new Date(view.y, view.m, 1).getDay() + 6) % 7;
  const count = new Date(view.y, view.m + 1, 0).getDate();
  const now = new Date();
  const today = iso(now.getFullYear(), now.getMonth(), now.getDate());

  return (
    <div ref={box} className="relative">
      <span className={`field ${error ? 'field-err' : ''}`}>
        <input value={text} placeholder={placeholder} inputMode="numeric" maxLength={10}
          onChange={(e) => setText(e.target.value.replace(/[^\d.]/g, ''))} onBlur={commit}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(); } }} />
        <button type="button" onClick={toggle} aria-label="Открыть календарь" aria-expanded={open}
          className="flex size-[30px] flex-none items-center justify-center rounded-md text-muted hover:bg-[#f1f4f7] hover:text-ink">
          <CalendarDays size={18} />
        </button>
      </span>
      {open && (
        <Floating anchor={box} width={288} panelRef={panel}>
        <div role="dialog" aria-label="Календарь" className="rounded-xl border border-line bg-white p-3 shadow-card">
          <div className="mb-2 flex items-center justify-between">
            <button type="button" onClick={() => shift(-1)} aria-label="Предыдущий месяц" className="flex size-8 items-center justify-center rounded-lg text-ink-2 hover:bg-[#f1f4f7]"><ChevronLeft size={18} /></button>
            <b className="text-[14px] font-semibold">{MONTHS[view.m]} {view.y}</b>
            <button type="button" onClick={() => shift(1)} aria-label="Следующий месяц" className="flex size-8 items-center justify-center rounded-lg text-ink-2 hover:bg-[#f1f4f7]"><ChevronRight size={18} /></button>
          </div>
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {DAYS.map((d) => <span key={d} className="pb-1 text-[11px] font-semibold text-faint">{d}</span>)}
            {Array.from({ length: first }, (_, i) => <span key={`e${i}`} />)}
            {Array.from({ length: count }, (_, i) => {
              const v = iso(view.y, view.m, i + 1);
              const sel = v === value;
              return (
                <button key={v} type="button" onClick={() => pick(v)}
                  className={`h-9 rounded-lg text-[13px] ${sel ? 'bg-accent font-semibold text-white' : v === today ? 'font-semibold text-cta-ink ring-1 ring-inset ring-cta/50 hover:bg-accent-soft' : 'text-ink hover:bg-accent-soft'}`}>
                  {i + 1}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between border-t border-line pt-2 text-[13px] font-semibold">
            <button type="button" onClick={() => pick(today)} className="rounded-md px-2 py-1 text-ink-2 hover:bg-[#f1f4f7]">Сегодня</button>
            {value && <button type="button" onClick={() => { onChange(''); setText(''); setOpen(false); }} className="rounded-md px-2 py-1 text-muted hover:bg-[#f1f4f7]">Очистить</button>}
          </div>
        </div>
        </Floating>
      )}
    </div>
  );
}

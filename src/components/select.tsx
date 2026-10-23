'use client';

import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Floating } from './floating';

type Opt = { value: string; label: string };

/** Выпадающий список в стиле приложения (вместо системного). Значение уходит в форму через скрытое поле name. */
export function Select({ name, options, defaultValue, onChange }: { name: string; options: Opt[]; defaultValue?: string; onChange?: (v: string) => void }) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? '');
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { const t = e.target as Node; if (!box.current?.contains(t) && !panel.current?.contains(t)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = (v: string) => { setValue(v); setOpen(false); onChange?.(v); };
  const show = () => { setHi(Math.max(0, options.findIndex((o) => o.value === value))); setOpen(true); };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return show();
      setHi((h) => (h + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) pick(options[hi].value); else show();
    } else if (e.key === 'Escape' && open) {
      e.preventDefault(); e.stopPropagation(); setOpen(false);
    } else if (e.key === 'Tab') setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      <input type="hidden" name={name} value={value} />
      <button type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={id}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}
        className={`field w-full py-2.5 text-left text-[14px] outline-none ${open ? 'border-accent ring-[3px] ring-accent/15' : ''}`}>
        <span className="flex-1 truncate">{current?.label}</span>
        <ChevronDown size={18} className={`text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <Floating anchor={box} panelRef={panel}>
        <ul id={id} role="listbox" className="rounded-xl border border-line bg-white p-1.5 shadow-card">
          {options.map((o, i) => (
            <li key={o.value} role="option" aria-selected={o.value === value}
              onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
              className={`flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-[14px] ${i === hi ? 'bg-accent-soft' : ''} ${o.value === value ? 'font-semibold text-ink' : 'text-ink-2'}`}>
              {o.label}{o.value === value && <Check size={16} className="text-accent" />}
            </li>
          ))}
        </ul>
        </Floating>
      )}
    </div>
  );
}

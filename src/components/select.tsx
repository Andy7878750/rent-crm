'use client';

import { Check, ChevronDown, Plus, X } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { Floating } from './floating';

export type Opt = { value: string; label: string; removable?: boolean };

/**
 * Выпадающий список в стиле приложения (вместо системного).
 * name — скрытое поле для формы. create — строка «+ свой вариант…» внизу списка; onRemove — крестик у своих пунктов.
 */
export function Select({ name, options, value: controlled, defaultValue, onChange, create, onRemove }: {
  name?: string; options: Opt[]; value?: string; defaultValue?: string; onChange?: (v: string) => void;
  create?: { placeholder: string; onCreate: (label: string) => string | null }; onRemove?: (value: string) => void;
}) {
  const [inner, setInner] = useState(defaultValue ?? options[0]?.value ?? '');
  const value = controlled ?? inner;
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(0);
  const [draft, setDraft] = useState('');
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const id = useId();
  const current = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { const t = e.target as Node; if (!box.current?.contains(t) && !panel.current?.contains(t)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  const pick = (v: string) => { setInner(v); setOpen(false); onChange?.(v); button.current?.focus(); };
  const show = () => { setHi(Math.max(0, options.findIndex((o) => o.value === value))); setDraft(''); setOpen(true); };
  const add = () => {
    const label = draft.trim().replace(/\s+/g, ' ');
    if (!label || !create) return;
    const v = create.onCreate(label);
    if (v) { setDraft(''); pick(v); }
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) return show();
      setHi((h) => (h + (e.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open && options[hi]) pick(options[hi].value); else show();
    } else if (e.key === 'Escape' && open) {
      e.preventDefault(); e.stopPropagation(); setOpen(false);
    } else if (e.key === 'Tab' && !create) setOpen(false);
  };

  return (
    <div ref={box} className="relative">
      {name && <input type="hidden" name={name} value={value} />}
      <button ref={button} type="button" role="combobox" aria-haspopup="listbox" aria-expanded={open} aria-controls={id}
        onClick={() => (open ? setOpen(false) : show())} onKeyDown={onKey}
        className={`field w-full py-2.5 text-left text-[14px] outline-none ${open ? 'border-accent ring-[3px] ring-accent/15' : ''}`}>
        <span className="flex-1 truncate">{current?.label}</span>
        <ChevronDown size={18} className={`text-muted transition ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <Floating anchor={box} panelRef={panel}>
          <div className="rounded-xl border border-line bg-white p-1.5 shadow-card">
            <ul id={id} role="listbox" className="max-h-[260px] overflow-y-auto">
              {options.map((o, i) => (
                <li key={o.value} role="option" aria-selected={o.value === value}
                  onMouseEnter={() => setHi(i)} onMouseDown={(e) => { e.preventDefault(); pick(o.value); }}
                  className={`group flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-[14px] ${i === hi ? 'bg-accent-soft' : ''} ${o.value === value ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                  <span className="flex-1 truncate">{o.label}</span>
                  {o.value === value && <Check size={16} className="text-accent" />}
                  {o.removable && onRemove && (
                    <button type="button" aria-label={`Удалить «${o.label}» из списка`} title="Удалить из списка"
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onRemove(o.value); }}
                      className="flex size-6 items-center justify-center rounded-md text-faint opacity-0 hover:bg-white hover:text-bad group-hover:opacity-100">
                      <X size={14} />
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {create && (
              <div className="mt-1 flex items-center gap-1 border-t border-line pt-1.5">
                <Plus size={16} className="ml-2 flex-none text-cta-ink" />
                <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={40} placeholder={create.placeholder}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') { e.preventDefault(); add(); }
                    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); setOpen(false); button.current?.focus(); }
                  }}
                  className="min-w-0 flex-1 rounded-md bg-transparent px-1.5 py-1.5 text-[14px] text-ink placeholder:text-cta-ink/80" style={{ outline: "none" }} />
                {draft.trim() && (
                  <button type="button" onMouseDown={(e) => { e.preventDefault(); add(); }}
                    className="rounded-md px-2.5 py-1 text-[13px] font-semibold text-cta-ink hover:bg-cta-soft">Добавить</button>
                )}
              </div>
            )}
          </div>
        </Floating>
      )}
    </div>
  );
}

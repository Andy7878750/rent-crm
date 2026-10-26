'use client';

import Link from 'next/link';
import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { FileText, Paperclip } from 'lucide-react';
import type { HelpTip } from '@/lib/help';
import { Floating } from './floating';

const Ctx = createContext<{ tips: Record<string, HelpTip>; admin: boolean }>({ tips: {}, admin: false });

export function HelpProvider({ tips, admin, children }: { tips: Record<string, HelpTip>; admin: boolean; children: React.ReactNode }) {
  return <Ctx.Provider value={{ tips, admin }}>{children}</Ctx.Provider>;
}

/** Значок «?» рядом с подписью поля: при наведении — подсказка и приложенный файл. */
export function Help({ k }: { k: string }) {
  const { tips, admin } = useContext(Ctx);
  const tip = tips[k];
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLSpanElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  if (!tip || !tip.on || (!tip.text && !tip.file)) return null;

  const show = () => { clearTimeout(timer.current); setOpen(true); };
  const hide = () => { clearTimeout(timer.current); timer.current = setTimeout(() => setOpen(false), 150); };
  const url = `/help-file/${encodeURIComponent(k)}`;
  const isImage = tip.file?.type.startsWith('image/');

  return (
    <span ref={box} className="inline-flex align-middle" onMouseEnter={show} onMouseLeave={hide}>
      <span role="button" tabIndex={0} aria-label={`Подсказка: ${tip.label}`} aria-expanded={open}
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open); }}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(!open); } if (e.key === 'Escape') setOpen(false); }}
        onFocus={show} onBlur={hide}
        className={`ml-1 inline-flex size-4 cursor-help items-center justify-center rounded-full border text-[10px] font-bold leading-none ${open ? 'border-cta bg-cta text-white' : 'border-[#b6bfc9] text-muted hover:border-cta hover:text-cta-ink'}`}>?</span>
      {open && (
        <Floating anchor={box} width={300} panelRef={panel}>
          <div role="tooltip" onMouseEnter={show} onMouseLeave={hide}
            className="rounded-xl border border-line bg-white p-3.5 text-[13px] font-normal leading-relaxed text-ink-2 shadow-card">
            <div className="mb-1 font-semibold text-ink">{tip.label}</div>
            {tip.text ? <p className="whitespace-pre-line">{tip.text}</p> : <p className="text-muted">Подсказки пока нет.</p>}
            {tip.file && (isImage ? (
              <a href={url} target="_blank" rel="noreferrer" className="mt-2.5 block overflow-hidden rounded-lg border border-line hover:border-cta">
                {/* eslint-disable-next-line @next/next/no-img-element -- файл из базы, размеры заранее неизвестны */}
                <img src={url} alt={tip.file.name} className="max-h-[180px] w-full object-contain" />
              </a>
            ) : (
              <a href={url} target="_blank" rel="noreferrer" className="mt-2.5 flex items-center gap-2 rounded-lg border border-line px-2.5 py-2 hover:border-cta hover:text-cta-ink">
                {tip.file.type === 'application/pdf' ? <FileText size={16} /> : <Paperclip size={16} />}<span className="truncate">{tip.file.name}</span>
              </a>
            ))}
            {admin && <Link href={`/settings/help#${k}`} className="mt-2.5 block border-t border-line pt-2 text-[12px] font-semibold text-cta-ink hover:underline">Изменить подсказку</Link>}
          </div>
        </Floating>
      )}
    </span>
  );
}

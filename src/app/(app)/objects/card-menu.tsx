'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { Floating } from '@/components/floating';
import { archiveObject } from './actions';

/** Меню «⋯» на карточке объекта: посмотреть, изменить, удалить (в архив, с подтверждением). */
export function CardMenu({ objectId, name, month }: { objectId: string; name: string; month: string }) {
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [pending, start] = useTransition();
  const box = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { const t = e.target as Node; if (!box.current?.contains(t) && !panel.current?.contains(t)) { setOpen(false); setConfirm(false); } };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') { setOpen(false); setConfirm(false); } };
    document.addEventListener('mousedown', close);
    window.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); window.removeEventListener('keydown', esc); };
  }, [open]);

  const item = 'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] text-ink-2 hover:bg-accent-soft hover:text-ink';
  return (
    <div ref={box} className="relative z-10 flex-none">
      <button type="button" onClick={() => { setOpen(!open); setConfirm(false); }} aria-label={`Действия: ${name}`} aria-expanded={open} aria-haspopup="menu"
        className={`flex size-8 items-center justify-center rounded-lg border bg-white text-muted hover:border-line-strong hover:text-ink ${open ? 'border-line-strong text-ink' : 'border-line'}`}>
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <Floating anchor={box} width={236} panelRef={panel} align="right">
          <div role="menu" className="rounded-xl border border-line bg-white p-1.5 shadow-card">
            {confirm ? (
              <div className="p-2">
                <div className="text-[14px] font-semibold">Удалить «{name}»?</div>
                <p className="mt-1 text-[12px] leading-snug text-muted">Объект уйдёт в архив. Выставленные счета и история сохранятся.</p>
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={pending} onClick={() => start(() => archiveObject(objectId))}
                    className="btn flex-1 border-bad/40 px-3 py-1.5 text-[13px] text-bad hover:bg-bad-soft">{pending ? 'Удаляем…' : 'Удалить'}</button>
                  <button type="button" onClick={() => setConfirm(false)} className="btn flex-1 px-3 py-1.5 text-[13px]">Отмена</button>
                </div>
              </div>
            ) : (
              <>
                <Link role="menuitem" href={`/objects/${objectId}?m=${month}`} className={item}><Eye size={16} /> Посмотреть</Link>
                <Link role="menuitem" href={`/objects/${objectId}/edit`} onClick={() => setOpen(false)} className={item}><Pencil size={16} /> Изменить</Link>
                <button role="menuitem" type="button" onClick={() => setConfirm(true)} className={`${item} text-bad hover:bg-bad-soft hover:text-bad`}><Trash2 size={16} /> Удалить</button>
              </>
            )}
          </div>
        </Floating>
      )}
    </div>
  );
}

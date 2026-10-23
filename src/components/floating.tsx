'use client';

import { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

/**
 * Всплывающая карточка поверх всей страницы (через portal), привязанная к полю anchor.
 * Не обрезается карточками с overflow: hidden; если снизу мало места — открывается вверх.
 */
export function Floating({ anchor, width, children, panelRef }: {
  anchor: React.RefObject<HTMLElement | null>; width?: number; children: React.ReactNode; panelRef?: React.RefObject<HTMLDivElement | null>;
}) {
  const [pos, setPos] = useState<{ left: number; top?: number; bottom?: number; width: number } | null>(null);
  useLayoutEffect(() => {
    const place = () => {
      const r = anchor.current?.getBoundingClientRect();
      if (!r) return;
      const w = width ?? r.width;
      const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
      const below = window.innerHeight - r.bottom;
      const h = panelRef?.current?.offsetHeight ?? 340;
      setPos(below < h + 12 && r.top > below
        ? { left, bottom: window.innerHeight - r.top + 6, width: w }
        : { left, top: r.bottom + 6, width: w });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => { window.removeEventListener('resize', place); window.removeEventListener('scroll', place, true); };
  }, [anchor, width, panelRef]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div ref={panelRef} style={{ position: 'fixed', zIndex: 60, left: pos?.left ?? -9999, top: pos?.top, bottom: pos?.bottom, width: pos?.width, visibility: pos ? 'visible' : 'hidden' }}>
      {children}
    </div>,
    document.body,
  );
}

'use client';

import { useLayoutEffect, useRef, useState } from 'react';

/** Текст в одну строку: если не помещается, конец плавно растворяется (без «…» и без переноса). */
export function FadeText({ children, className = '', title }: { children: React.ReactNode; className?: string; title?: string }) {
  const el = useRef<HTMLSpanElement>(null);
  const [over, setOver] = useState(false);
  useLayoutEffect(() => {
    const node = el.current;
    if (!node) return;
    const check = () => setOver(node.scrollWidth > node.clientWidth + 1);
    check();
    const ro = new ResizeObserver(check);
    ro.observe(node);
    return () => ro.disconnect();
  }, [children]);
  return (
    <span ref={el} title={over ? title : undefined}
      className={`block min-w-0 overflow-hidden whitespace-nowrap ${className}`}
      style={over ? { maskImage: 'linear-gradient(to right, #000 calc(100% - 40px), transparent)', WebkitMaskImage: 'linear-gradient(to right, #000 calc(100% - 40px), transparent)' } : undefined}>
      {children}
    </span>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createContext, useContext, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const InModal = createContext(false);

/** «Отмена»: в окне — закрыть его, на отдельной странице — перейти по ссылке. */
export function CancelButton({ href }: { href: string }) {
  const router = useRouter();
  return useContext(InModal)
    ? <button type="button" className="btn" onClick={() => router.back()}>Отмена</button>
    : <Link href={href} className="btn">Отмена</Link>;
}

/** Всплывающее окно поверх страницы. Закрывается крестиком, Esc или кликом по фону — возвратом назад. */
export function Modal({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') router.back(); };
    window.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', onKey); };
  }, [router]);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2c3e50]/40 px-3 py-6 sm:py-10" onMouseDown={(e) => { if (e.target === e.currentTarget) router.back(); }}>
      <div ref={panel} role="dialog" aria-modal="true"
        className={`relative mx-auto flex w-full flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl sm:p-6 ${wide ? 'max-w-[920px]' : 'max-w-[820px]'}`}>
        <button type="button" onClick={() => router.back()} aria-label="Закрыть" title="Закрыть (Esc)"
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-[#f1f4f7] hover:text-ink">
          <X size={20} />
        </button>
        <InModal.Provider value={true}>{children}</InModal.Provider>
      </div>
    </div>
  );
}

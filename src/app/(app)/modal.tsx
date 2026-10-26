'use client';

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createContext, useContext, useEffect, useRef } from 'react';
import { X } from 'lucide-react';

const InModal = createContext(false);

/** «Отмена»: в окне — закрыть его, на отдельной странице — перейти по ссылке. */
export function CancelButton({ href, label = 'Отмена' }: { href: string; label?: string }) {
  const router = useRouter();
  return useContext(InModal)
    ? <button type="button" className="btn" onClick={() => router.back()}>{label}</button>
    : <Link href={href} className="btn">{label}</Link>;
}

/** Всплывающее окно поверх страницы. Закрывается только крестиком или кнопкой «Отмена» — случайный клик мимо или Esc ввод не теряют. */
export function Modal({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const router = useRouter();
  const panel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.querySelector<HTMLElement>('input, select, textarea')?.focus();
    return () => { document.body.style.overflow = prev; };
  }, []);
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#2c3e50]/40 px-3 py-6 sm:py-10">
      <div ref={panel} role="dialog" aria-modal="true"
        className={`relative mx-auto flex w-full flex-col gap-4 rounded-2xl bg-white p-5 shadow-xl sm:p-6 ${wide ? 'max-w-[920px]' : 'max-w-[820px]'}`}>
        <button type="button" onClick={() => router.back()} aria-label="Закрыть" title="Закрыть"
          className="absolute right-3 top-3 flex size-9 items-center justify-center rounded-lg text-muted hover:bg-[#f1f4f7] hover:text-ink">
          <X size={20} />
        </button>
        <InModal.Provider value={true}>{children}</InModal.Provider>
      </div>
    </div>
  );
}

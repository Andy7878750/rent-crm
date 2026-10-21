'use client';

import { Download } from 'lucide-react';

export function PrintBar({ title }: { title: string }) {
  return (
    <div className="print:hidden sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-line bg-white px-4 py-2.5">
      <b className="flex-1 font-semibold">{title}</b>
      <button className="btn btn-primary" onClick={() => window.print()}><Download size={16} /> Скачать PDF</button>
      <button className="btn" onClick={() => window.close()}>Закрыть</button>
      <span className="basis-full hint">В окне печати выберите «Сохранить как PDF».</span>
    </div>
  );
}

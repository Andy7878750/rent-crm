'use client';

import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

/** Скрытое значение (подсказка к паролю) с «глазом». */
export function Secret({ value }: { value: string }) {
  const [show, setShow] = useState(false);
  if (!value) return <>—</>;
  return (
    <span className="inline-flex items-center gap-2">
      <span>{show ? value : '••••••••'}</span>
      <button type="button" onClick={() => setShow(!show)} aria-label={show ? 'Скрыть подсказку' : 'Показать подсказку'}
        className="flex size-7 items-center justify-center rounded-md text-faint hover:bg-[#f1f4f7] hover:text-ink">
        {show ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </span>
  );
}

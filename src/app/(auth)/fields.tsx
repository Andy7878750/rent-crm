'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

export function Field({ label, name, error, right, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: React.ReactNode; name: string; error?: string; right?: React.ReactNode }) {
  return (
    <label className="label">
      <span className="flex justify-between">{label}{right}</span>
      <span className={`field ${error ? 'field-err' : ''}`}>
        <input name={name} aria-invalid={!!error} {...props} />
      </span>
      {error && <span className="text-[12px] text-[#b4362b]">{error}</span>}
    </label>
  );
}

export function PasswordField({ label, error, autoComplete, onValue, value, right }: { label: string; error?: string; autoComplete: string; onValue?: (v: string) => void; value?: string; right?: React.ReactNode }) {
  const [peek, setPeek] = useState(false);
  return (
    <label className="label">
      <span className="flex justify-between">{label}{right}</span>
      <span className={`field ${error ? 'field-err' : ''}`}>
        <input name="password" type={peek ? 'text' : 'password'} autoComplete={autoComplete} placeholder="••••••••" aria-invalid={!!error}
          value={value} onChange={(e) => onValue?.(e.target.value)} />
        <button type="button" onClick={() => setPeek(!peek)} aria-label={peek ? 'Скрыть пароль' : 'Показать пароль'}
          className="flex size-[30px] items-center justify-center rounded-md text-faint hover:bg-[#f1f4f7]">
          {peek ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </span>
      {error && <span className="text-[12px] text-[#b4362b]">{error}</span>}
    </label>
  );
}

export function Or() {
  return (
    <div className="flex items-center gap-3 text-[12px] text-faint before:h-px before:flex-1 before:bg-line after:h-px after:flex-1 after:bg-line">или</div>
  );
}

export function OAuthButtons({ verb }: { verb: string }) {
  const [note, setNote] = useState(false);
  return (
    <>
      <button type="button" className="btn w-full" onClick={() => setNote(true)}>{verb} Яндекс ID</button>
      <button type="button" className="btn w-full" onClick={() => setNote(true)}>{verb} VK ID</button>
      {note && <p role="status" className="hint">Вход через Яндекс ID и VK ID подключим после регистрации приложения в этих сервисах. Пока — по почте и паролю.</p>}
    </>
  );
}

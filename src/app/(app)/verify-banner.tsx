'use client';

import { useState, useTransition } from 'react';
import { resendVerify } from '../(auth)/actions';

const MSG = { sent: 'Отправили. Проверьте почту и «Спам».', soon: 'Письмо только что ушло — подождите минуту.', failed: 'Не удалось отправить, попробуйте позже.', done: 'Почта уже подтверждена — обновите страницу.' };

export function VerifyBanner({ email }: { email: string }) {
  const [msg, setMsg] = useState('');
  const [pending, start] = useTransition();
  return (
    <div role="status" className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-[#ecd9a6] bg-[#fdf6e3] px-4 py-2.5 text-[13px] text-ink-2">
      <span>Подтвердите почту <b>{email}</b> — мы отправили письмо со ссылкой. Без этого не получится восстановить пароль.</span>
      {msg ? <span className="font-semibold">{msg}</span> : (
        <button className="font-semibold text-accent hover:underline disabled:opacity-50" disabled={pending}
          onClick={() => start(async () => setMsg(MSG[await resendVerify()]))}>{pending ? 'Отправляем…' : 'Отправить ещё раз'}</button>
      )}
    </div>
  );
}

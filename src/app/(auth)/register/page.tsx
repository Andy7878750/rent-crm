'use client';

import Link from 'next/link';
import { useActionState, useState } from 'react';
import { register, type FormState } from '../actions';
import { Field, OAuthButtons, Or, PasswordField } from '../fields';

function strength(p: string) {
  if (!p) return 0;
  return Math.min(4, (p.length >= 8 ? 1 : 0) + (/[A-ZА-Я]/.test(p) && /[a-zа-я]/.test(p) ? 1 : 0) + (/\d/.test(p) ? 1 : 0) + (/[^\wА-Яа-я]/.test(p) || p.length >= 12 ? 1 : 0));
}
const COLORS = ['#e6eaf0', '#d4553a', '#e2a23b', '#7fb069', '#2e9e62'];
const TEXT = ['Не короче 8 символов', 'Слабый пароль', 'Средний пароль', 'Хороший пароль', 'Надёжный пароль'];

export default function RegisterPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(register, {});
  const [pw, setPw] = useState('');
  const e = state.errors ?? {};
  const s = strength(pw);
  return (
    <section aria-label="Регистрация" className="card w-full max-w-[420px] p-8 shadow-card">
      <h1 className="text-[22px] font-bold">Регистрация</h1>
      <p className="mb-6 mt-1.5 text-muted">Займёт минуту. Сразу после входа вас ждёт пример объекта.</p>
      <form action={action} noValidate className="flex flex-col gap-3.5">
        <Field label="Как к вам обращаться" name="name" autoComplete="name" placeholder="Имя и фамилия" defaultValue={state.values?.name} error={e.name} />
        <Field label="Почта" name="email" type="email" autoComplete="email" placeholder="name@mail.ru" defaultValue={state.values?.email} error={e.email} />
        <div className="flex flex-col gap-1.5">
          <PasswordField label="Пароль" autoComplete="new-password" error={e.password} onValue={setPw} />
          <span aria-hidden className="flex gap-1">{[1, 2, 3, 4].map((i) => <i key={i} className="h-1 flex-1 rounded" style={{ background: i <= s ? COLORS[s] : COLORS[0] }} />)}</span>
          {!e.password && <span className={`text-[12px] ${s >= 3 ? 'text-ok' : 'text-muted'}`}>{TEXT[s]}</span>}
        </div>
        <label className={`flex cursor-pointer items-start gap-2 text-[13px] leading-snug ${e.consent ? 'text-[#b4362b]' : 'text-ink-2'}`}>
          <input type="checkbox" name="consent" className="mt-0.5" />
          <span>Согласен с <Link href="/privacy" className="font-semibold text-accent">политикой конфиденциальности</Link> и даю <Link href="/privacy#consent" className="font-semibold text-accent">согласие на обработку персональных данных</Link></span>
        </label>
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? 'Создаём…' : 'Создать аккаунт'}</button>
        <Or />
        <OAuthButtons verb="Через" />
      </form>
      <p className="mt-5 text-center text-muted">Уже есть аккаунт? <Link href="/login" className="font-semibold text-accent hover:underline">Войти</Link></p>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { requestReset, type ForgotState } from '../actions';
import { Field } from '../fields';

export function ForgotForm() {
  const [state, action, pending] = useActionState<ForgotState, FormData>(requestReset, {});
  return (
    <section aria-label="Восстановление пароля" className="card w-full max-w-[420px] p-8 shadow-card">
      <h1 className="text-[22px] font-bold">Забыли пароль?</h1>
      {state.sent ? (
        <>
          <p role="status" className="mb-6 mt-1.5 leading-relaxed text-ink-2">
            Если <b>{state.sent}</b> зарегистрирована в Расчётке, мы отправили на неё ссылку для нового пароля. Ссылка действует 1 час.
          </p>
          <p className="hint mb-6">Письма нет? Проверьте «Спам» или запросите ещё раз через минуту.</p>
          <Link href="/login" className="btn w-full">← Вернуться ко входу</Link>
        </>
      ) : (
        <>
          <p className="mb-6 mt-1.5 leading-relaxed text-muted">Укажите почту, с которой регистрировались, — пришлём ссылку для нового пароля.</p>
          <form action={action} noValidate className="flex flex-col gap-3.5">
            <Field label="Почта" name="email" type="email" autoComplete="email" placeholder="name@mail.ru" defaultValue={state.email} error={state.error} autoFocus />
            <button className="btn btn-primary w-full" disabled={pending}>{pending ? 'Отправляем…' : 'Прислать ссылку'}</button>
            <Link href="/login" className="btn w-full">← Вернуться ко входу</Link>
          </form>
        </>
      )}
    </section>
  );
}

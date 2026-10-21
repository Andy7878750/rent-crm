'use client';

import Link from 'next/link';
import { useActionState } from 'react';
import { login, type FormState } from '../actions';
import { Field, OAuthButtons, Or, PasswordField } from '../fields';

export default function LoginPage() {
  const [state, action, pending] = useActionState<FormState, FormData>(login, {});
  const e = state.errors ?? {};
  return (
    <section aria-label="Вход" className="card w-full max-w-[420px] p-8 shadow-card">
      <h1 className="text-[22px] font-bold">Вход</h1>
      <p className="mb-6 mt-1.5 text-muted">Рады видеть снова.</p>
      <form action={action} noValidate className="flex flex-col gap-3.5">
        {e.form && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">{e.form}</p>}
        <Field label="Почта" name="email" type="email" autoComplete="email" placeholder="name@mail.ru" defaultValue={state.values?.email} error={e.email} />
        <PasswordField label="Пароль" autoComplete="current-password" error={e.password}
          right={<Link href="/forgot" className="font-semibold text-accent hover:underline">Забыли пароль?</Link>} />
        <label className="flex cursor-pointer items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" name="remember" defaultChecked /> Запомнить меня на этом устройстве
        </label>
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? 'Входим…' : 'Войти'}</button>
        <Or />
        <OAuthButtons verb="Войти с" />
      </form>
      <p className="mt-5 text-center text-muted">Нет аккаунта? <Link href="/register" className="font-semibold text-accent hover:underline">Зарегистрироваться</Link></p>
    </section>
  );
}

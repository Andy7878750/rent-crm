'use client';

import { useActionState } from 'react';
import { resetPassword, type ResetState } from '../actions';
import { PasswordField } from '../fields';

export function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ResetState, FormData>(resetPassword, {});
  return (
    <section aria-label="Новый пароль" className="card w-full max-w-[420px] p-8 shadow-card">
      <h1 className="text-[22px] font-bold">Новый пароль</h1>
      <p className="mb-6 mt-1.5 leading-relaxed text-muted">Не короче 8 символов. После сохранения вы войдёте, а на других устройствах вход сбросится.</p>
      <form action={action} noValidate className="flex flex-col gap-3.5">
        <input type="hidden" name="t" value={token} />
        <PasswordField label="Новый пароль" autoComplete="new-password" error={state.error} />
        <button className="btn btn-primary w-full" disabled={pending}>{pending ? 'Сохраняем…' : 'Сохранить и войти'}</button>
      </form>
    </section>
  );
}

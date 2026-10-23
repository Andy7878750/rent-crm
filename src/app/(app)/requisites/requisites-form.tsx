'use client';

import { useActionState, useState } from 'react';
import { formatPhone } from '@/lib/phone';
import { reportFooter, type Requisites } from '@/lib/requisites';
import { saveRequisites, type ReqState } from './actions';

const KINDS = [['ip', 'ИП'], ['self', 'Самозанятый'], ['person', 'Физлицо']] as const;

export function RequisitesForm({ initial }: { initial: Requisites }) {
  const [state, action, pending] = useActionState<ReqState, FormData>(saveRequisites, {});
  const [r, setR] = useState<Requisites>(initial);
  const e = state.errors ?? {};
  const set = <K extends keyof Requisites>(k: K, v: Requisites[K]) => setR({ ...r, [k]: v });
  const foot = reportFooter(r);

  const f = (k: keyof Requisites, label: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="label"><span>{label}</span>
      <span className={`field ${e[k] ? 'field-err' : ''}`}>
        <input name={k} value={r[k] as string} onChange={(ev) => set(k, (k === 'phone' ? formatPhone(ev.target.value) : ev.target.value) as never)} {...extra} />
      </span>
      {e[k] && <span className="text-[12px] text-[#b4362b]">{e[k]}</span>}
    </label>
  );

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="kind" value={r.kind} />
      <div className="grid items-start gap-4 lg:grid-cols-2">
        <section className="card flex flex-col gap-3 p-[18px]">
          <div className="eyebrow">Арендодатель</div>
          <div role="radiogroup" className="flex flex-wrap gap-2">
            {KINDS.map(([k, l]) => (
              <button key={k} type="button" role="radio" aria-checked={r.kind === k} onClick={() => set('kind', k)}
                className={`btn ${r.kind === k ? 'border-accent bg-[#e8edf2]' : ''}`}>{l}</button>
            ))}
          </div>
          {f('name', 'Как подписывать отчёт', { placeholder: 'ИП Иванов И. И.' })}
          <div className="grid gap-3 sm:grid-cols-2">
            {f('inn', 'ИНН', { inputMode: 'numeric', placeholder: '10 или 12 цифр' })}
            {r.kind === 'ip' && f('ogrn', 'ОГРНИП', { inputMode: 'numeric', placeholder: '15 цифр' })}
          </div>
          {f('address', 'Адрес', { placeholder: 'для отчёта не обязателен' })}
          <div className="grid gap-3 sm:grid-cols-2">
            {f('phone', 'Телефон для вопросов', { type: 'tel', inputMode: 'tel', placeholder: '+7 (___) ___-__-__' })}
            {f('email', 'Почта', { type: 'email', placeholder: 'name@mail.ru' })}
          </div>
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" name="noVat" checked={r.noVat} onChange={() => set('noVat', !r.noVat)} /> Работаю без НДС — писать «без НДС» в отчёте</label>
        </section>

        <section className="card flex flex-col gap-3 p-[18px]">
          <div className="eyebrow">Куда платить</div>
          {f('bank', 'Банк', { placeholder: 'ПАО Сбербанк' })}
          <div className="grid gap-3 sm:grid-cols-2">
            {f('bik', 'БИК', { inputMode: 'numeric', placeholder: '9 цифр' })}
            {f('ks', 'Корр. счёт', { inputMode: 'numeric', placeholder: '20 цифр' })}
          </div>
          {f('rs', 'Расчётный счёт', { inputMode: 'numeric', placeholder: '20 цифр' })}
          {f('sbp', 'Или перевод по номеру телефона (СБП)', { placeholder: '+7 · банк получателя' })}
          <label className="flex cursor-pointer items-center gap-2"><input type="checkbox" name="showPay" checked={r.showPay} onChange={() => set('showPay', !r.showPay)} /> Показывать «Куда платить» в отчёте</label>
        </section>
      </div>

      <section className="card p-[18px]">
        <div className="eyebrow mb-2.5">Так будет внизу отчёта</div>
        <div className="rounded-lg border border-dashed border-[#c9d1da] px-4 py-3.5 text-[12px] leading-relaxed text-muted">
          {foot.pay && <div className="mb-1 text-ink">{foot.pay}</div>}
          <div>{foot.line}</div>
        </div>
      </section>

      <div className="flex items-center gap-3">
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Сохраняем…' : 'Сохранить'}</button>
        <span className="hint" aria-live="polite">{state.ok && !pending ? 'Сохранено' : Object.keys(e).length ? 'Исправьте поля, отмеченные красным' : ''}</span>
      </div>
    </form>
  );
}

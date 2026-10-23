'use client';

import { CancelButton } from '../modal';
import { Select } from '@/components/select';
import { useActionState, useState } from 'react';
import { X } from 'lucide-react';
import { saveObject, type ObjectFormState } from './actions';

export type ObjectFormValues = {
  type: 'nonres' | 'flat' | 'other'; short: string; address: string; floor: string;
  ukName: string; ukPhone: string; cabinetUrl: string; cabinetLogin: string; cabinetHint: string; isOwner: boolean;
  tenants: Array<{ id?: string; name: string; share: string; phone: string; email: string; contract: string; contractEnd: string }>;
};

const blank = () => ({ name: '', share: '', phone: '', email: '', contract: '', contractEnd: '' });

export function ObjectForm({ objectId, initial, cancelHref }: { objectId: string | null; initial: ObjectFormValues; cancelHref: string }) {
  const [state, action, pending] = useActionState<ObjectFormState, FormData>(saveObject.bind(null, objectId), {});
  const [owner, setOwner] = useState(initial.isOwner);
  const [rows, setRows] = useState(initial.tenants.length ? initial.tenants : [blank()]);
  const e = state.errors ?? {};
  const sum = rows.reduce((a, r) => a + (Number(String(r.share).replace(',', '.')) || 0), 0);
  const set = (i: number, k: keyof ReturnType<typeof blank>, v: string) => setRows(rows.map((r, j) => (j === i ? { ...r, [k]: v } : r)));

  const input = (name: string, label: React.ReactNode, def: string, extra: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="label"><span>{label}</span>
      <span className={`field ${e[name] ? 'field-err' : ''}`}><input name={name} defaultValue={def} {...extra} /></span>
      {e[name] && <span className="text-[12px] text-[#b4362b]">{e[name]}</span>}
    </label>
  );

  return (
    <form action={action} noValidate className="flex max-w-[760px] flex-col gap-4">
      {e.form && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-bad">{e.form}</p>}
      <section className="card overflow-hidden">
        <div className="border-b border-line bg-[#f6f8fb] px-4 py-2.5 eyebrow">Объект и УК / ТСЖ</div>
        <div className="grid gap-3.5 p-4 sm:grid-cols-2">
          <div className="label"><span>Тип <span className="text-[#b4362b]">*</span></span>
            <Select name="type" defaultValue={initial.type}
              options={[{ value: 'nonres', label: 'Нежилое помещение' }, { value: 'flat', label: 'Квартира' }, { value: 'other', label: 'Другое' }]} />
          </div>
          {input('short', <>Короткое название <span className="text-[#b4362b]">*</span></>, initial.short, { placeholder: 'Например, Королёва 61' })}
          <div className="sm:col-span-2 grid gap-3.5 sm:grid-cols-[1fr_120px]">
            {input('address', 'Адрес', initial.address)}
            {input('floor', 'Этаж', initial.floor)}
          </div>
          {input('ukName', 'УК / ТСЖ', initial.ukName, { placeholder: 'Название управляющей компании' })}
          {input('ukPhone', 'Телефон УК / ТСЖ', initial.ukPhone, { type: 'tel', placeholder: '+7' })}
          {input('cabinetUrl', 'Личный кабинет (ссылка)', initial.cabinetUrl, { placeholder: 'https://' })}
          {input('cabinetLogin', 'Логин', initial.cabinetLogin)}
          <div className="sm:col-span-2">{input('cabinetHint', 'Подсказка к паролю (сам пароль не храним)', initial.cabinetHint, { autoComplete: 'off' })}</div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex justify-between border-b border-line bg-[#f6f8fb] px-4 py-2.5">
          <span className="eyebrow">Кто пользуется объектом</span>
          {!owner && <span className={`text-[12px] ${sum > 100 ? 'text-bad' : 'text-muted'}`}>занято {String(Math.round(sum * 100) / 100).replace('.', ',')}%</span>}
        </div>
        <input type="hidden" name="owner" value={owner ? '1' : '0'} />
        <input type="hidden" name="tenants" value={JSON.stringify(rows)} />
        <div role="radiogroup" className="flex flex-wrap gap-2 px-4 pt-3">
          {[[false, 'Арендаторы'], [true, 'Собственник — я сам']].map(([v, l]) => (
            <button key={String(v)} type="button" role="radio" aria-checked={owner === v} onClick={() => setOwner(v as boolean)}
              className={`btn ${owner === v ? 'border-accent bg-[#e8edf2]' : ''}`}>{l as string}</button>
          ))}
        </div>
        {owner ? (
          <p className="hint px-4 py-3.5 text-[13px]">Арендаторов нет, все счета по объекту оплачиваете вы. Объект появится в «Оплатах поставщикам».</p>
        ) : (
          <div className="flex flex-col">
            {e.shares && <p className="mx-4 mt-3 rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">{e.shares}</p>}
            {rows.map((r, i) => (
              <div key={i} className="grid gap-3 border-b border-[#edf0f5] px-4 py-3.5 sm:grid-cols-[1fr_90px_1fr_34px]">
                <TField label="Имя или название *" value={r.name} onChange={(v) => set(i, 'name', v)} error={e[`t${i}.name`]} />
                <TField label="Доля, % *" value={r.share} onChange={(v) => set(i, 'share', v)} error={e[`t${i}.share`]} inputMode="decimal" />
                <TField label="Телефон" value={r.phone} onChange={(v) => set(i, 'phone', v)} type="tel" />
                <button type="button" aria-label="Убрать арендатора" onClick={() => setRows(rows.filter((_, j) => j !== i))}
                  className="mt-6 flex size-[34px] items-center justify-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad"><X size={16} /></button>
                <TField label="Почта (для счёта)" value={r.email} onChange={(v) => set(i, 'email', v)} type="email" />
                <TField label="Договор" value={r.contract} onChange={(v) => set(i, 'contract', v)} />
                <TField label="Договор до" value={r.contractEnd} onChange={(v) => set(i, 'contractEnd', v)} type="date" />
              </div>
            ))}
            <div className="px-4 py-3">
              <button type="button" className="btn border-dashed text-accent" onClick={() => setRows([...rows, blank()])}>+ Добавить арендатора</button>
            </div>
          </div>
        )}
      </section>

      <p className="hint">После сохранения привяжите арендаторов к услугам в «Тарифах и услугах» — тогда на странице объекта появятся нужные поля.</p>
      <div className="flex gap-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Сохраняем…' : objectId ? 'Сохранить изменения' : 'Создать объект'}</button>
        <CancelButton href={cancelHref} />
      </div>
    </form>
  );
}

function TField({ label, value, onChange, error, ...rest }: { label: string; value: string; onChange: (v: string) => void; error?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <label className="label"><span>{label}</span>
      <span className={`field ${error ? 'field-err' : ''}`}><input value={value} onChange={(ev) => onChange(ev.target.value)} {...rest} /></span>
      {error && <span className="text-[12px] text-[#b4362b]">{error}</span>}
    </label>
  );
}

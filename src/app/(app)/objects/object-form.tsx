'use client';

import { CancelButton } from '../modal';
import { Select } from '@/components/select';
import { DateInput } from '@/components/date-input';
import { formatPhone } from '@/lib/phone';
import { Help } from '@/components/help';
import { useActionState, useState, useTransition } from 'react';
import { Eye, EyeOff, X } from 'lucide-react';
import { addObjectType, removeObjectType, saveObject, type ObjectFormState } from './actions';

export type ObjectFormValues = {
  type: 'nonres' | 'flat' | 'other'; typeLabel: string; short: string; address: string; floor: string;
  ukName: string; ukPhone: string; cabinetUrl: string; cabinetLogin: string; cabinetHint: string; isOwner: boolean;
  tenants: Array<{ id?: string; name: string; share: string; phone: string; email: string; contract: string; contractEnd: string }>;
};

const blank = () => ({ name: '', share: '', phone: '', email: '', contract: '', contractEnd: '' });

export function ObjectForm({ objectId, initial, cancelHref, customTypes = [], archive }: { objectId: string | null; initial: ObjectFormValues; cancelHref: string; customTypes?: string[]; archive?: () => Promise<void> }) {
  const [state, action, pending] = useActionState<ObjectFormState, FormData>(saveObject.bind(null, objectId), {});
  const [owner, setOwner] = useState(initial.isOwner);
  const [peekHint, setPeekHint] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [archiving, startArchive] = useTransition();
  const [ukPhone, setUkPhone] = useState(formatPhone(initial.ukPhone));
  const [custom, setCustom] = useState(() => initial.typeLabel && !customTypes.includes(initial.typeLabel) ? [...customTypes, initial.typeLabel] : customTypes);
  const [typeValue, setTypeValue] = useState(initial.type === 'other' && initial.typeLabel ? `c:${initial.typeLabel}` : initial.type);
  const [rows, setRows] = useState(initial.tenants.length ? initial.tenants.map((t) => ({ ...t, phone: formatPhone(t.phone) })) : [blank()]);
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
          <div className="label"><span>Тип <span className="text-[#b4362b]">*</span><Help k="object.type" /></span>
            <input type="hidden" name="type" value={typeValue.startsWith('c:') ? 'other' : typeValue} />
            <input type="hidden" name="typeLabel" value={typeValue.startsWith('c:') ? typeValue.slice(2) : ''} />
            <Select value={typeValue} onChange={setTypeValue}
              options={[
                { value: 'flat', label: 'Квартира' }, { value: 'nonres', label: 'Нежилое помещение' },
                ...custom.map((c) => ({ value: `c:${c}`, label: c, removable: true })),
                { value: 'other', label: 'Другое' },
              ]}
              create={{ placeholder: 'свой вариант…', onCreate: (label) => {
                const same = [...custom, 'Нежилое помещение', 'Квартира', 'Другое'].find((c) => c.toLowerCase() === label.toLowerCase());
                if (same === 'Нежилое помещение') return 'nonres';
                if (same === 'Квартира') return 'flat';
                if (same === 'Другое') return 'other';
                if (!same) { setCustom([...custom, label]); void addObjectType(label); }
                return `c:${same ?? label}`;
              } }}
              onRemove={(v) => {
                const label = v.slice(2);
                setCustom(custom.filter((c) => c !== label));
                if (typeValue === v) setTypeValue('other');
                void removeObjectType(label);
              }} />
          </div>
          {input('short', <>Короткое название <span className="text-[#b4362b]">*</span><Help k="object.short" /></>, initial.short, { placeholder: 'Например, Королёва 61' })}
          <div className="sm:col-span-2 grid gap-3.5 sm:grid-cols-[1fr_120px]">
            {input('address', <>Адрес<Help k="object.address" /></>, initial.address)}
            {input('floor', <>Этаж<Help k="object.floor" /></>, initial.floor)}
          </div>
          {input('ukName', <>УК / ТСЖ<Help k="object.ukName" /></>, initial.ukName, { placeholder: 'Название управляющей компании' })}
          <label className="label"><span>Телефон УК / ТСЖ<Help k="object.ukPhone" /></span>
            <span className="field"><input name="ukPhone" type="tel" inputMode="tel" autoComplete="off" placeholder="+7 (___) ___-__-__ или +код страны"
              value={ukPhone} onChange={(ev) => setUkPhone(formatPhone(ev.target.value, ukPhone))} /></span>
          </label>
          <div className="grid gap-3.5 sm:col-span-2 sm:grid-cols-3">
            {input('cabinetUrl', <>Личный кабинет (ссылка)<Help k="object.cabinetUrl" /></>, initial.cabinetUrl, { placeholder: 'https://' })}
            {input('cabinetLogin', <>Логин<Help k="object.cabinetLogin" /></>, initial.cabinetLogin)}
            <label className="label"><span>Подсказка к паролю<Help k="object.cabinetHint" /></span>
              <span className="field"><input name="cabinetHint" defaultValue={initial.cabinetHint} type={peekHint ? 'text' : 'password'}
                autoComplete="new-password" placeholder="сам пароль не храним" />
                <button type="button" onClick={() => setPeekHint(!peekHint)} aria-label={peekHint ? 'Скрыть подсказку' : 'Показать подсказку'}
                  className="flex size-[30px] flex-none items-center justify-center rounded-md text-faint hover:bg-[#f1f4f7] hover:text-ink">
                  {peekHint ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </span>
            </label>
          </div>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex justify-between border-b border-line bg-[#f6f8fb] px-4 py-2.5">
          <span className="eyebrow">Кто пользуется объектом<Help k="object.users" /></span>
          {!owner && <span className={`text-[12px] ${sum > 100 ? 'text-bad' : 'text-muted'}`}>занято {String(Math.round(sum * 100) / 100).replace('.', ',')}%</span>}
        </div>
        <input type="hidden" name="owner" value={owner ? '1' : '0'} />
        <input type="hidden" name="tenants" value={JSON.stringify(rows)} />
        <div role="radiogroup" className="flex flex-wrap gap-2 px-4 pt-3">
          {[[false, 'Арендаторы'], [true, 'Собственник']].map(([v, l]) => (
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
              <div key={i} className="flex flex-col gap-3 border-b border-[#edf0f5] px-4 py-3.5">
                <div className="grid gap-3 sm:grid-cols-[1fr_90px_1fr_34px]">
                  <TField label={<>Имя или название *<Help k="tenant.name" /></>} value={r.name} onChange={(v) => set(i, 'name', v)} error={e[`t${i}.name`]} />
                  <TField label={<>Доля, % *<Help k="tenant.share" /></>} value={r.share} onChange={(v) => set(i, 'share', v)} error={e[`t${i}.share`]} inputMode="decimal" />
                  <TField label={<>Телефон<Help k="tenant.phone" /></>} value={r.phone} onChange={(v) => set(i, 'phone', formatPhone(v, r.phone))} type="tel" inputMode="tel" placeholder="+7 (___) ___-__-__ или +код страны" />
                  <button type="button" aria-label="Убрать арендатора" onClick={() => setRows(rows.filter((_, j) => j !== i))}
                    className="mt-6 flex size-[34px] items-center justify-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad"><X size={16} /></button>
                </div>
                <div className="grid gap-3 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_170px_34px]">
                  <TField label={<>Почта (для счёта)<Help k="tenant.email" /></>} value={r.email} onChange={(v) => set(i, 'email', v)} type="email" />
                  <TField label={<>Договор<Help k="tenant.contract" /></>} value={r.contract} onChange={(v) => set(i, 'contract', v)} placeholder="№ и дата" />
                  <div className="label"><span>Договор до<Help k="tenant.contractEnd" /></span><DateInput value={r.contractEnd} onChange={(v) => set(i, 'contractEnd', v)} /></div>
                </div>
              </div>
            ))}
            <div className="px-4 py-3">
              <button type="button" className="btn border-dashed text-accent" onClick={() => setRows([...rows, blank()])}>+ Добавить арендатора</button>
            </div>
          </div>
        )}
      </section>

      <p className="hint">После сохранения привяжите арендаторов к услугам в «Тарифах и услугах» — тогда на странице объекта появятся нужные поля.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Сохраняем…' : objectId ? 'Сохранить изменения' : 'Создать объект'}</button>
        <CancelButton href={cancelHref} />
        {archive && (
          <span className="ml-auto flex items-center gap-2">
            {confirmArchive ? (
              <>
                <span className="text-[13px] text-muted">Убрать объект в архив?</span>
                <button type="button" className="btn border-bad/40 text-bad hover:bg-bad-soft" disabled={archiving}
                  onClick={() => startArchive(() => archive())}>{archiving ? 'Убираем…' : 'Да, в архив'}</button>
                <button type="button" className="btn" onClick={() => setConfirmArchive(false)}>Нет</button>
              </>
            ) : (
              <button type="button" className="btn text-bad hover:bg-bad-soft" onClick={() => setConfirmArchive(true)}>Убрать в архив</button>
            )}
          </span>
        )}
      </div>
    </form>
  );
}

function TField({ label, value, onChange, error, ...rest }: { label: React.ReactNode; value: string; onChange: (v: string) => void; error?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'>) {
  return (
    <label className="label"><span>{label}</span>
      <span className={`field ${error ? 'field-err' : ''}`}><input value={value} onChange={(ev) => onChange(ev.target.value)} {...rest} /></span>
      {error && <span className="text-[12px] text-[#b4362b]">{error}</span>}
    </label>
  );
}

'use client';

import { useActionState, useState, useTransition } from 'react';
import { CancelButton } from '../../../modal';
import { Select } from '@/components/select';
import { DateInput } from '@/components/date-input';
import { KindIcon } from '@/components/kind-icon';
import { RESOURCES, type Resource } from '@/lib/receipts';
import { deleteMeter, saveMeter, type MeterState } from './actions';

type Init = { resource: Resource; tenantId: string; number: string; place: string; dayNight: boolean; verifyUntil: string };

/** Счётчик объекта: что считает, чей, номер. Остальное — по желанию. */
export function MeterForm(p: { objectId: string; objectName: string; month: string; meterId: string | null; isOwner: boolean; tenants: Array<{ id: string; name: string }>; init: Init }) {
  const [state, action, pending] = useActionState<MeterState, FormData>(saveMeter.bind(null, p.objectId, p.meterId, p.month), {});
  const [d, setD] = useState(p.init);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, startDelete] = useTransition();
  const e = state.errors ?? {};
  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <div><h1 className="text-[22px] font-bold">{p.meterId ? 'Счётчик' : 'Новый счётчик'}</h1><div className="hint text-[13px]">{p.objectName}</div></div>
      {e.form && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-bad">{e.form}</p>}
      <input type="hidden" name="resource" value={d.resource} />
      <input type="hidden" name="tenantId" value={d.tenantId} />
      <input type="hidden" name="dayNight" value={d.dayNight ? '1' : '0'} />
      <input type="hidden" name="verifyUntil" value={d.verifyUntil} />
      <section className="card overflow-hidden">
        <div className="border-b border-line bg-[#f6f8fb] px-4 py-2.5 eyebrow">Что считает</div>
        <div role="radiogroup" aria-label="Ресурс" className="flex flex-wrap gap-2 p-4">
          {(Object.keys(RESOURCES) as Resource[]).map((r) => {
            const on = d.resource === r;
            return (
              <button key={r} type="button" role="radio" aria-checked={on} onClick={() => setD({ ...d, resource: r })}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold ${on ? 'border-cta bg-cta-soft text-cta-ink' : 'border-line text-ink-2 hover:border-cta'}`}>
                <KindIcon name={RESOURCES[r].icon} size={15} />{RESOURCES[r].label}
              </button>
            );
          })}
        </div>
      </section>
      <section className="card overflow-hidden">
        <div className="border-b border-line bg-[#f6f8fb] px-4 py-2.5 eyebrow">Счётчик</div>
        <div className="grid gap-3.5 p-4 sm:grid-cols-2">
          <div className="label"><span>Чей</span>
            <Select value={d.tenantId} onChange={(v) => setD({ ...d, tenantId: v })}
              options={[{ value: '', label: 'Общий на объект' }, ...p.tenants.map((t) => ({ value: t.id, label: p.isOwner ? 'Свой (собственник)' : t.name }))]} />
            {e.tenantId && <span className="text-[12px] text-[#b4362b]">{e.tenantId}</span>}
          </div>
          <label className="label"><span>Номер</span><span className="field"><input name="number" defaultValue={d.number} placeholder="заводской номер" /></span></label>
          <label className="label"><span>Где стоит</span><span className="field"><input name="place" defaultValue={d.place} placeholder="например, щиток в коридоре" /></span></label>
          <div className="label"><span>Поверка до</span><DateInput value={d.verifyUntil} onChange={(v) => setD({ ...d, verifyUntil: v })} />
            {e.verifyUntil && <span className="text-[12px] text-[#b4362b]">{e.verifyUntil}</span>}</div>
          {d.resource === 'el' && (
            <label className="flex items-center gap-2 text-[14px] sm:col-span-2"><input type="checkbox" checked={d.dayNight} onChange={(x) => setD({ ...d, dayNight: x.target.checked })} />
              Двухтарифный (день / ночь)</label>
          )}
        </div>
      </section>
      <p className="hint">Показания вносятся в квитанции — там же, где сумма. Счётчик арендатора подсказывает номер рядом с его показаниями.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Сохраняем…' : p.meterId ? 'Сохранить' : 'Добавить счётчик'}</button>
        <CancelButton href={`/objects/${p.objectId}?m=${p.month}`} />
        {p.meterId && (
          <span className="ml-auto flex items-center gap-2">
            {confirmDel ? (
              <>
                <span className="text-[13px] text-muted">Удалить счётчик?</span>
                <button type="button" className="btn border-bad/40 text-bad hover:bg-bad-soft" disabled={deleting}
                  onClick={() => startDelete(() => deleteMeter(p.objectId, p.meterId!, p.month))}>{deleting ? 'Удаляем…' : 'Да, удалить'}</button>
                <button type="button" className="btn" onClick={() => setConfirmDel(false)}>Нет</button>
              </>
            ) : <button type="button" className="btn text-bad hover:bg-bad-soft" onClick={() => setConfirmDel(true)}>Удалить</button>}
          </span>
        )}
      </div>
    </form>
  );
}

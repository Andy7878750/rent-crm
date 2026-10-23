'use client';

import { CancelButton } from '../modal';
import { useActionState, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { KINDS, LOGICS, type LogicField } from '@/lib/calc/logics';
import type { Logic, ServiceKind } from '@/lib/calc/types';
import { deleteService, saveService, type ServiceFormState, type ServiceIn, type TariffIn } from './actions';

type Obj = { id: string; name: string; tenants: Array<{ id: string; name: string }> };
type Svc = { id: string; supplier: string; name: string; unit: string };

const blankTariff = (logic: Logic, validFrom: string): TariffIn => ({ logic, price: '', price2: '', norm: '', normPrice: '', extraName: '', sources: [], whoAll: true, who: [], validFrom });
const UNITS = ['кВт·ч', 'м³', 'Гкал', '₽'];

export function ServiceForm({ serviceId, initial, objects, others, defaultFrom }: { serviceId: string | null; initial: ServiceIn; objects: Obj[]; others: Svc[]; defaultFrom: string }) {
  const [state, action, pending] = useActionState<ServiceFormState, FormData>(saveService.bind(null, serviceId), {});
  const [d, setD] = useState<ServiceIn>(initial);
  const [confirm, setConfirm] = useState<null | 'service' | number>(null);
  const e = state.errors ?? {};
  const K = KINDS[d.kind];

  const setT = (i: number, patch: Partial<TariffIn>) => setD({ ...d, tariffs: d.tariffs.map((t, j) => (j === i ? { ...t, ...patch } : t)) });
  const setKind = (kind: ServiceKind) => setD({
    ...d, kind, unit: kind === 'owner' && !d.unit ? '₽' : d.unit,
    tariffs: d.tariffs.map((t) => (KINDS[kind].logics.includes(t.logic) ? t : { ...t, logic: KINDS[kind].logics[0] })),
  });
  const err = (k: string) => e[k] && <span className="text-[12px] text-[#b4362b]">{e[k]}</span>;

  const fieldLabel = (f: LogicField, logic: Logic) =>
    f === 'price' ? (logic === 'fixed' ? 'Сумма в месяц, ₽' : logic === 'dn' ? 'Цена день, ₽' : logic === 'norm' ? 'Цена единицы норматива, ₽' : `Цена, ₽ за ${d.unit || 'единицу'}`)
      : f === 'price2' ? 'Цена ночь, ₽' : f === 'norm' ? (logic === 'meterRest' ? 'Норматив на единицу (необязательно)' : 'Норматив на единицу')
      : f === 'normPrice' ? 'Цена норматива, ₽' : f === 'extraName' ? 'Название доп. начисления (например, «Подогрев ГВС»)' : '';

  return (
    <form action={action} noValidate className="flex max-w-[860px] flex-col gap-4">
      <input type="hidden" name="data" value={JSON.stringify(d)} />
      {e.form && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-bad">{e.form}</p>}

      <section className="card overflow-hidden">
        <div className="border-b border-line bg-[#f6f8fb] px-4 py-2.5 eyebrow">Услуга</div>
        <div className="grid gap-3.5 p-4 sm:grid-cols-[1fr_1fr_140px]">
          <label className="label"><span>Поставщик <span className="text-[#b4362b]">*</span></span>
            <span className={`field ${e.supplier ? 'field-err' : ''}`}><input value={d.supplier} onChange={(ev) => setD({ ...d, supplier: ev.target.value })} placeholder="Водоканал" list="suppliers" /></span>{err('supplier')}</label>
          <label className="label"><span>Название <span className="text-[#b4362b]">*</span></span>
            <span className={`field ${e.name ? 'field-err' : ''}`}><input value={d.name} onChange={(ev) => setD({ ...d, name: ev.target.value })} placeholder="Холодная вода" /></span>{err('name')}</label>
          <label className="label"><span>Единица <span className="text-[#b4362b]">*</span></span>
            <span className={`field ${e.unit ? 'field-err' : ''}`}><input value={d.unit} onChange={(ev) => setD({ ...d, unit: ev.target.value })} list="units" /></span>{err('unit')}</label>
          <datalist id="units">{UNITS.map((u) => <option key={u} value={u} />)}</datalist>
          <datalist id="suppliers">{[...new Set(others.map((o) => o.supplier))].map((s) => <option key={s} value={s} />)}</datalist>
        </div>
        <div className="px-4 pb-4">
          <div className="mb-1.5 text-[13px] text-ink-2">Счёт</div>
          <div role="radiogroup" className="grid gap-2 sm:grid-cols-3">
            {(Object.keys(KINDS) as ServiceKind[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={d.kind === k} onClick={() => setKind(k)}
                className={`rounded-lg border px-3 py-2.5 text-left ${d.kind === k ? 'border-2 border-accent bg-[#f2f5f8]' : 'border-line-strong bg-white'}`}>
                <b className="block font-semibold">{KINDS[k].label}</b><span className="hint">{KINDS[k].hint}</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      {d.tariffs.map((t, i) => {
        const L = LOGICS[t.logic];
        // Арендаторы, уже занятые другим тарифом этой услуги с той же датой.
        const takenBy = new Map<string, number>();
        let allTakenBy: number | null = null;
        d.tariffs.forEach((o, j) => { if (j === i || o.validFrom !== t.validFrom) return; if (o.whoAll) allTakenBy = j; else o.who.forEach((id) => takenBy.set(id, j)); });
        return (
          <section key={i} aria-label={`Тариф ${i + 1}`} className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line bg-[#f6f8fb] px-4 py-2">
              <span className="eyebrow">Тариф {d.tariffs.length > 1 ? `№${i + 1}` : ''}</span>
              {d.tariffs.length > 1 && (confirm === i
                ? <span className="flex items-center gap-2 text-[13px]">Удалить тариф? <button type="button" className="font-semibold text-bad" onClick={() => { setD({ ...d, tariffs: d.tariffs.filter((_, j) => j !== i) }); setConfirm(null); }}>Да</button>
                    <button type="button" className="font-semibold" onClick={() => setConfirm(null)}>Нет</button></span>
                : <button type="button" onClick={() => setConfirm(i)} className="flex items-center gap-1 text-[13px] text-muted hover:text-bad"><Trash2 size={14} /> Удалить тариф</button>)}
            </div>
            <div className="flex flex-col gap-3.5 p-4">
              <div>
                <div className="mb-1.5 text-[13px] text-ink-2">Логика расчёта</div>
                <div role="radiogroup" className="flex flex-wrap gap-2">
                  {K.logics.map((l) => (
                    <button key={l} type="button" role="radio" aria-checked={t.logic === l} onClick={() => setT(i, { logic: l })}
                      className={`rounded-full border px-3 py-1.5 text-[13px] font-semibold ${t.logic === l ? 'border-accent bg-accent text-white' : 'border-line-strong bg-white'}`}>{LOGICS[l].label}</button>
                  ))}
                </div>
                <p className="mt-2 text-[12px] text-muted">Формула: {L.formula}.{L.note ? ` ${L.note}` : ''}</p>
                {err(`t${i}.logic`)}
              </div>

              {L.fields.filter((f) => f !== 'sources').length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {L.fields.filter((f) => f !== 'sources').map((f) => (
                    <label key={f} className={`label ${f === 'extraName' ? 'sm:col-span-2' : ''}`}><span>{fieldLabel(f, t.logic)}{L.required.includes(f) && <span className="text-[#b4362b]"> *</span>}</span>
                      <span className={`field ${e[`t${i}.${f}`] ? 'field-err' : ''}`}>
                        <input value={t[f] as string} onChange={(ev) => setT(i, { [f]: ev.target.value })} inputMode={f === 'extraName' ? 'text' : 'decimal'} className={f === 'extraName' ? '' : 'text-right'} />
                      </span>{err(`t${i}.${f}`)}</label>
                  ))}
                </div>
              )}

              {L.fields.includes('sources') && (
                <div>
                  <div className="mb-1.5 text-[13px] text-ink-2">Расход каких услуг <span className="text-[#b4362b]">*</span></div>
                  <div className="flex flex-wrap gap-2">
                    {others.length === 0 && <span className="hint">Сначала создайте услуги со счётчиками (например, холодную и горячую воду).</span>}
                    {others.map((o) => {
                      const on = t.sources.includes(o.id);
                      return (
                        <label key={o.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-1.5 ${on ? 'border-accent bg-[#f2f5f8]' : 'border-line-strong'}`}>
                          <input type="checkbox" checked={on} onChange={() => setT(i, { sources: on ? t.sources.filter((x) => x !== o.id) : [...t.sources, o.id] })} />
                          {o.name} <span className="hint">{o.supplier}</span>
                        </label>
                      );
                    })}
                  </div>{err(`t${i}.sources`)}
                </div>
              )}

              {d.kind !== 'owner' && (
                <div>
                  <div className="mb-1.5 text-[13px] text-ink-2">Для кого</div>
                  <label className="mb-2 flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={t.whoAll} disabled={allTakenBy !== null || takenBy.size > 0}
                      onChange={() => setT(i, { whoAll: !t.whoAll, who: [] })} />
                    <b className="font-semibold">Все арендаторы</b> <span className="hint">— и те, кого добавите позже</span>
                  </label>
                  {!t.whoAll && (
                    <div className="flex flex-col gap-2.5 rounded-lg border border-line p-3">
                      {objects.filter((o) => o.tenants.length).map((o) => (
                        <div key={o.id}>
                          <div className="mb-1 text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{o.name}</div>
                          <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                            {o.tenants.map((tn) => {
                              const busy = allTakenBy ?? takenBy.get(tn.id);
                              const on = t.who.includes(tn.id);
                              return (
                                <label key={tn.id} className={`flex items-center gap-2 ${busy !== undefined && busy !== null ? 'text-faint' : 'cursor-pointer'}`}>
                                  <input type="checkbox" checked={on} disabled={busy !== undefined && busy !== null && !on}
                                    onChange={() => setT(i, { who: on ? t.who.filter((x) => x !== tn.id) : [...t.who, tn.id] })} />
                                  {tn.name}{busy !== undefined && busy !== null && !on && <span className="text-[12px]">(в тарифе №{(busy as number) + 1})</span>}
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                      {objects.every((o) => !o.tenants.length) && <span className="hint">Арендаторов пока нет.</span>}
                    </div>
                  )}
                  {err(`t${i}.who`)}
                </div>
              )}

              <label className="label max-w-[220px]"><span>Действует с</span>
                <span className={`field ${e[`t${i}.validFrom`] ? 'field-err' : ''}`}><input type="date" value={t.validFrom} onChange={(ev) => setT(i, { validFrom: ev.target.value })} /></span>
                {err(`t${i}.validFrom`)}</label>
            </div>
          </section>
        );
      })}

      {d.kind !== 'owner' && (
        <button type="button" className="btn self-start border-dashed text-accent" onClick={() => setD({ ...d, tariffs: [...d.tariffs, blankTariff(K.logics[0], defaultFrom)] })}>
          <Plus size={16} /> Ещё тариф <span className="font-normal text-muted">— другая цена для других арендаторов или новая цена с даты</span>
        </button>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Сохраняем…' : serviceId ? 'Сохранить' : 'Создать услугу'}</button>
        <CancelButton href="/tariffs" />
        <div className="flex-1" />
        {serviceId && (confirm === 'service'
          ? <span className="flex items-center gap-2 text-[13px]">Удалить услугу вместе с суммами и показаниями по ней?
              <button type="button" className="btn text-bad" onClick={() => deleteService(serviceId)}>Удалить</button>
              <button type="button" className="btn" onClick={() => setConfirm(null)}>Нет</button></span>
          : <button type="button" className="btn text-bad" onClick={() => setConfirm('service')}><Trash2 size={15} /> Удалить услугу</button>)}
      </div>
    </form>
  );
}


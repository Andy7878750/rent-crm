'use client';

import Link from 'next/link';
import { useActionState, useMemo, useState, useTransition } from 'react';
import { Check, CircleAlert } from 'lucide-react';
import { CancelButton } from '../../../modal';
import { Select } from '@/components/select';
import { KindIcon } from '@/components/kind-icon';
import { calculateMonth } from '@/lib/calc/engine';
import { fmtMoney, sumMoney } from '@/lib/calc/format';
import type { MonthInput, Service, Tariff } from '@/lib/calc/types';
import { CATEGORIES, GROUPS, METHODS, METHOD_ORDER, OTHER, RESOURCES, category, kindOf, type Method } from '@/lib/receipts';
import { deleteReceipt, saveReceipt, type ReadingIn, type ReceiptIn, type ReceiptState } from './actions';

export type ReceiptInit = ReceiptIn;
type T = { id: string; name: string; share: number; email: string };
type MeterLite = { id: string; resource: string; number: string; tenantId: string | null; dayNight: boolean };

const toNum = (s: string | undefined) => {
  const t = String(s ?? '').replace(/\s/g, '').replace(',', '.');
  const n = Number(t);
  return t !== '' && Number.isFinite(n) ? n : null;
};
const pct = (n: number) => String(n).replace('.', ',') + '%';
const blankReading = (): ReadingIn => ({ prev: '', cur: '', usage: '', dayPrev: '', dayCur: '', nightPrev: '', nightCur: '' });

export function ReceiptForm(p: {
  objectId: string; objectName: string; isOwner: boolean; month: string; monthText: string; serviceId: string | null;
  init: ReceiptInit; suppliers: string[]; prevAmount?: number; tenants: T[];
  others: Array<{ id: string; name: string; category: string }>; meters: MeterLite[]; input: MonthInput;
}) {
  const [state, action, pending] = useActionState<ReceiptState, FormData>(saveReceipt.bind(null, p.objectId, p.serviceId, p.month), {});
  const [d, setD] = useState<ReceiptIn>(p.init);
  const [showMethods, setShowMethods] = useState(false);
  const [suppliers, setSuppliers] = useState(p.suppliers);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, startDelete] = useTransition();
  const e = state.errors ?? {};
  const set = (patch: Partial<ReceiptIn>) => setD((x) => ({ ...x, ...patch }));
  const setRead = (tid: string, k: keyof ReadingIn, v: string) =>
    setD((x) => ({ ...x, readings: { ...x.readings, [tid]: { ...(x.readings[tid] ?? blankReading()), [k]: v } } }));

  const M = METHODS[d.logic];
  const cat = category(d.category);
  const allPay = p.isOwner || d.logic === 'whole' || d.whoAll;
  const payers = allPay ? p.tenants : p.tenants.filter((t) => d.who.includes(t.id));
  const who = (t: T) => (p.isOwner ? 'Вы (собственник)' : t.name);

  // Выбор вида: подставляем название, единицу, поставщика и способ по умолчанию (сумму и показания не трогаем).
  const pickCategory = (id: string) => {
    const c = category(id);
    set({
      category: c.id, name: c.name, unit: c.unit, supplier: c.supplier, logic: c.def as Method, price: c.price ?? '', hasNorm: false,
      sources: c.id === 'dr' ? p.others.filter((o) => o.category === 'cw' || o.category === 'hw').map((o) => o.id) : d.sources,
    });
    setShowMethods(false);
  };

  // Живой расчёт тем же модулем, что и на сайте.
  const draftId = p.serviceId ?? '__new';
  const view = useMemo(() => {
    const from = `${p.month}-01`;
    const base: Omit<Tariff, 'who'> = {
      logic: d.logic, from, price: M.price ? toNum(d.price) ?? undefined : undefined, price2: d.logic === 'dn' ? toNum(d.price2) ?? undefined : undefined,
      norm: d.logic === 'meterRest' && d.hasNorm ? toNum(d.norm) ?? undefined : undefined,
      normPrice: d.logic === 'meterRest' && d.hasNorm ? toNum(d.normPrice) ?? undefined : undefined,
      extraName: d.logic === 'meterRest' && d.hasNorm ? d.extraName || 'Доп. начисление' : undefined, sources: d.sources,
    };
    const tariffs: Tariff[] = d.logic === 'fixed'
      ? payers.map((t) => ({ ...base, price: toNum(d.fixed[t.id]) ?? undefined, who: [t.id] }))
      : [{ ...base, who: allPay ? 'all' : payers.map((t) => t.id) }];
    const svc: Service = { id: draftId, objectId: p.objectId, category: d.category, supplier: d.supplier, name: d.name || 'Квитанция', unit: d.unit, kind: kindOf(d.logic), tariffs };
    const A = M.bill ? toNum(d.amount) : null;
    const readings = structuredClone(p.input.readings);
    for (const t of p.tenants) {
      const r = d.readings[t.id] ?? blankReading();
      const rt = (readings[t.id] ??= {});
      const n = (s: string) => toNum(s) ?? undefined;
      rt[draftId] = M.read === 'usage' ? { usage: n(r.usage) } : { prev: n(r.prev), cur: n(r.cur) };
      rt[draftId + ':day'] = { prev: n(r.dayPrev), cur: n(r.dayCur) };
      rt[draftId + ':night'] = { prev: n(r.nightPrev), cur: n(r.nightCur) };
    }
    const input: MonthInput = {
      ...p.input, readings,
      services: [...p.input.services.filter((s) => s.id !== draftId), svc],
      bills: { ...p.input.bills, [p.objectId]: { ...(p.input.bills[p.objectId] ?? {}), [draftId]: A ?? undefined } },
    };
    const res = calculateMonth(input);
    const rows = payers.map((t) => {
      const ls = res.tenants[t.id]?.lines.filter((l) => l.serviceId === draftId) ?? [];
      const amount = ls.length && ls.every((l) => l.amount !== null) ? sumMoney(ls.map((l) => l.amount as number)) : null;
      return { t, ls, amount };
    });
    const tenantsSum = rows.every((r) => r.amount !== null) ? sumMoney(rows.map((r) => r.amount as number)) : null;
    let err = '';
    if (M.bill && A === null) err = 'Введите сумму квитанции';
    else if (M.price && toNum(d.price) === null) err = 'Введите цену из квитанции';
    else if (d.logic === 'dn' && toNum(d.price2) === null) err = 'Введите ночную цену';
    else if (d.logic === 'derived' && !d.sources.length) err = 'Отметьте квитанции воды, из которых брать расход';
    else if (!payers.length) err = 'Отметьте, кто платит';
    else if (tenantsSum === null) err = M.fixed ? 'Введите сумму для каждого, кто платит' : M.read ? 'Внесите показания каждого, кто платит' : 'Не хватает данных для расчёта';
    const owner = A === null || tenantsSum === null ? null : Math.round((A - tenantsSum) * 100) / 100;
    if (!err && owner !== null && owner < -0.004) err = `Арендаторам начислено больше квитанции на ${fmtMoney(-owner)} ₽`;
    return { rows, tenantsSum, owner, A, err };
  }, [d, M, payers, allPay, draftId, p]);

  const meterOf = (tid: string) => p.meters.find((m) => m.tenantId === tid && m.resource === cat.resource);
  const groupMeters = cat.resource ? p.meters.filter((m) => m.resource === cat.resource) : [];
  const L = 'text-[11px] font-semibold uppercase tracking-[0.06em] text-muted';

  return (
    <form action={action} noValidate className="flex flex-col gap-4">
      <input type="hidden" name="data" value={JSON.stringify(d)} />
      <div>
        <h1 className="text-[22px] font-bold">{p.serviceId ? d.name || 'Квитанция' : 'Новая квитанция'}</h1>
        <div className="hint text-[13px]">{p.objectName} · {p.monthText}</div>
      </div>
      {e.form && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-bad">{e.form}</p>}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_290px]">
        <div className="flex min-w-0 flex-col gap-4">
          {/* Что за квитанция */}
          <section className="card overflow-hidden">
            <div className="flex flex-wrap justify-between gap-2 border-b border-line bg-[#f6f8fb] px-4 py-2.5">
              <span className="eyebrow">Что за квитанция</span><span className="text-[12px] text-muted">способ деления подставится сам</span>
            </div>
            <div className="flex flex-col gap-2.5 p-4" role="radiogroup" aria-label="Вид квитанции">
              {[...GROUPS, OTHER.group].map((g) => (
                <div key={g} className="grid items-start gap-2 sm:grid-cols-[150px_minmax(0,1fr)]">
                  <span className={`${L} pt-2`}>{g}</span>
                  <span className="flex flex-wrap gap-2">
                    {(g === OTHER.group ? [OTHER] : CATEGORIES.filter((c) => c.group === g)).map((c) => {
                      const on = c.id === d.category;
                      return (
                        <button key={c.id || 'other'} type="button" role="radio" aria-checked={on} onClick={() => pickCategory(c.id)}
                          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-semibold transition ${on ? 'border-cta bg-cta-soft text-cta-ink' : 'border-line text-ink-2 hover:border-cta'}`}>
                          <KindIcon name={c.icon} size={15} />{c.id ? c.name : 'Свой вид'}
                        </button>
                      );
                    })}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Квитанция */}
          <section className="card overflow-hidden">
            <div className="border-b border-line bg-[#f6f8fb] px-4 py-2.5 eyebrow">Квитанция</div>
            <div className="grid gap-3.5 p-4 sm:grid-cols-2">
              <div className="label"><span>Поставщик</span>
                <Select value={d.supplier} onChange={(v) => set({ supplier: v })}
                  options={[{ value: '', label: 'Не указан' }, ...[...new Set([d.supplier, ...suppliers].filter(Boolean))].map((x) => ({ value: x, label: x }))]}
                  create={{ placeholder: 'свой вариант…', onCreate: (label) => { if (!suppliers.includes(label)) setSuppliers([...suppliers, label]); return label; } }} />
                {e.supplier && <span className="text-[12px] text-[#b4362b]">{e.supplier}</span>}
              </div>
              <label className="label"><span>Название в счёте арендатору <span className="text-[#b4362b]">*</span></span>
                <span className={`field ${e.name ? 'field-err' : ''}`}><input value={d.name} onChange={(x) => set({ name: x.target.value })} /></span>
                {e.name && <span className="text-[12px] text-[#b4362b]">{e.name}</span>}
              </label>
              {M.bill && (
                <label className="label"><span>Сумма к оплате за {p.monthText.toLowerCase()}, ₽ <span className="text-[#b4362b]">*</span></span>
                  <span className={`field bg-warn-soft ${e.amount ? 'field-err' : ''}`}><input inputMode="decimal" placeholder="как в квитанции" value={d.amount} onChange={(x) => set({ amount: x.target.value })} /><span className="text-[12px] text-faint">₽</span></span>
                  {p.prevAmount !== undefined && <span className="hint">В прошлом месяце: {fmtMoney(p.prevAmount)} ₽</span>}
                </label>
              )}
              {(M.read || M.price) && (
                <label className="label"><span>Единица расхода</span>
                  <span className="field"><input value={d.unit} onChange={(x) => set({ unit: x.target.value })} placeholder="кВт·ч, м³, Гкал" /></span>
                </label>
              )}
            </div>
          </section>

          {/* Кто платит */}
          {!p.isOwner && d.logic !== 'whole' && (
            <section className="card overflow-hidden">
              <div className="border-b border-line bg-[#f6f8fb] px-4 py-2.5 eyebrow">Кто платит</div>
              <div className="grid gap-2 p-4 sm:grid-cols-2" role="radiogroup" aria-label="Кто платит">
                {[[true, 'Все арендаторы', 'и те, кого добавите позже; пустующие доли — на вас'], [false, 'Только некоторые', 'например, мусор — только у одного арендатора']].map(([v, t, h]) => {
                  const on = d.whoAll === v;
                  return (
                    <button key={String(v)} type="button" role="radio" aria-checked={on}
                      onClick={() => set({ whoAll: v as boolean, who: v ? p.tenants.map((x) => x.id) : d.who.length === p.tenants.length ? p.tenants.slice(-1).map((x) => x.id) : d.who })}
                      className={`flex items-start gap-3 rounded-[10px] border px-3.5 py-3 text-left ${on ? 'border-2 border-accent bg-[#f2f5f8]' : 'border-line hover:border-line-strong'}`}>
                      <span className={`mt-0.5 flex size-[18px] flex-none items-center justify-center rounded-full border-[1.5px] ${on ? 'border-accent' : 'border-[#b6bfc9]'}`}>{on && <span className="size-2.5 rounded-full bg-accent" />}</span>
                      <span><b className="block font-semibold">{t as string}</b><span className="hint">{h as string}</span></span>
                    </button>
                  );
                })}
              </div>
              {!d.whoAll && (
                <div className="flex flex-wrap gap-2 px-4 pb-4">
                  {p.tenants.map((t) => (
                    <label key={t.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                      <input type="checkbox" checked={d.who.includes(t.id)}
                        onChange={(x) => set({ who: x.target.checked ? [...d.who, t.id] : d.who.filter((y) => y !== t.id) })} />
                      {t.name} <span className="hint">доля {pct(t.share)}</span>
                    </label>
                  ))}
                  {e.who && <span className="w-full text-[12px] text-[#b4362b]">{e.who}</span>}
                </div>
              )}
            </section>
          )}

          {/* Как делить */}
          <section className="card overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-[#f6f8fb] px-4 py-2.5">
              <span className="text-[13px] text-ink-2">{p.isOwner ? 'Считается' : 'Делится'}: <b className="text-ink">{M.label.toLowerCase()}</b>{' '}
                <span className="text-muted">{d.logic === cat.def ? '· подставлено по виду квитанции' : '· выбрано вручную'}</span></span>
              <button type="button" onClick={() => setShowMethods(!showMethods)} className="text-[13px] font-semibold text-cta-ink hover:underline">{showMethods ? 'Скрыть' : 'Изменить способ'}</button>
            </div>
            {showMethods && (
              <div role="radiogroup" aria-label="Как делить" className="flex flex-wrap gap-2 px-4 pt-3">
                {METHOD_ORDER.filter((m) => !(p.isOwner && (m === 'share' || m === 'equal' || m === 'split'))).map((m) => (
                  <button key={m} type="button" role="radio" aria-checked={m === d.logic} onClick={() => set({ logic: m, whoAll: m === 'fixed' ? false : d.whoAll })}
                    className={`btn ${m === d.logic ? 'border-accent bg-[#e8edf2]' : ''}`}>{METHODS[m].label}</button>
                ))}
              </div>
            )}
            <p className="px-4 pt-3 text-[13px] text-ink-2">{M.formula}</p>

            {M.price && (
              <div className="grid gap-3 px-4 pt-3 sm:grid-cols-[repeat(2,minmax(0,220px))]">
                <label className="label"><span>{d.logic === 'dn' ? 'Цена днём' : 'Цена за единицу'}, ₽ / {d.unit || 'ед.'}</span>
                  <span className={`field ${e.price ? 'field-err' : ''}`}><input inputMode="decimal" value={d.price} onChange={(x) => set({ price: x.target.value })} /></span></label>
                {d.logic === 'dn' && (
                  <label className="label"><span>Цена ночью, ₽ / {d.unit || 'ед.'}</span>
                    <span className={`field ${e.price2 ? 'field-err' : ''}`}><input inputMode="decimal" value={d.price2} onChange={(x) => set({ price2: x.target.value })} /></span></label>
                )}
              </div>
            )}

            {d.logic === 'meterRest' && (
              <div className="px-4 pt-3">
                <label className="flex items-center gap-2 text-[13px] text-ink-2"><input type="checkbox" checked={d.hasNorm} onChange={(x) => set({ hasNorm: x.target.checked })} />
                  Доп. начисление по нормативу (например, подогрев ГВС)</label>
                {d.hasNorm && (
                  <div className="mt-2.5 grid gap-3 sm:grid-cols-3">
                    <label className="label"><span>Название</span><span className="field"><input value={d.extraName} placeholder="Подогрев ГВС" onChange={(x) => set({ extraName: x.target.value })} /></span></label>
                    <label className="label"><span>Норматив на {d.unit || 'ед.'}</span><span className={`field ${e.norm ? 'field-err' : ''}`}><input inputMode="decimal" value={d.norm} placeholder="0,06" onChange={(x) => set({ norm: x.target.value })} /></span></label>
                    <label className="label"><span>Цена норматива, ₽</span><span className="field"><input inputMode="decimal" value={d.normPrice} placeholder="4628,57" onChange={(x) => set({ normPrice: x.target.value })} /></span></label>
                  </div>
                )}
              </div>
            )}

            {d.logic === 'derived' && (
              <div className="flex flex-wrap gap-2 px-4 pt-3">
                {p.others.length === 0 && <span className="hint">Сначала добавьте квитанции холодной и горячей воды.</span>}
                {p.others.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
                    <input type="checkbox" checked={d.sources.includes(o.id)} onChange={(x) => set({ sources: x.target.checked ? [...d.sources, o.id] : d.sources.filter((y) => y !== o.id) })} />{o.name}
                  </label>
                ))}
              </div>
            )}

            {/* Ввод по каждому, кто платит: расход, показания или своя сумма */}
            {(M.read || M.fixed) && payers.length > 0 && (
              <div className="mt-3">
                {M.read === 'meter' || M.read === 'dn' ? (
                  <div className="grid grid-cols-[minmax(0,1fr)_88px_100px_72px] gap-2 border-t border-[#edf0f5] px-4 pb-1 pt-2.5 text-[12px] text-faint">
                    <span>{p.isOwner ? '' : 'Арендатор'}</span><span className="text-right">было</span><span className="text-right">стало</span><span className="text-right">расход</span>
                  </div>
                ) : null}
                {payers.map((t) => {
                  const r = d.readings[t.id] ?? blankReading();
                  const mt = meterOf(t.id);
                  const name = <span className="min-w-0"><b className="block truncate font-semibold">{who(t)}</b>
                    <span className="hint">{mt ? `счётчик № ${mt.number || 'без номера'}` : M.read ? (p.isOwner ? '' : `доля ${pct(t.share)}`) : 'сумма в месяц'}</span></span>;
                  if (M.fixed || M.read === 'usage') {
                    const k = M.fixed ? d.fixed[t.id] ?? '' : r.usage;
                    return (
                      <div key={t.id} className="flex min-h-[56px] items-center gap-3 border-t border-[#edf0f5] px-4 py-2">
                        <span className="min-w-0 flex-1">{name}</span>
                        <span className="field w-[170px] bg-warn-soft"><input inputMode="decimal" aria-label={`${t.name}: ${M.fixed ? 'сумма' : 'расход за месяц'}`} className="text-right"
                          value={k} placeholder={M.fixed ? '0,00' : 'расход'}
                          onChange={(x) => (M.fixed ? set({ fixed: { ...d.fixed, [t.id]: x.target.value } }) : setRead(t.id, 'usage', x.target.value))} />
                          <span className="ml-1 text-[12px] text-faint">{M.fixed ? '₽' : d.unit || 'ед.'}</span></span>
                      </div>
                    );
                  }
                  const zones: Array<[string, keyof ReadingIn, keyof ReadingIn]> = M.read === 'dn' ? [['день', 'dayPrev', 'dayCur'], ['ночь', 'nightPrev', 'nightCur']] : [['', 'prev', 'cur']];
                  return zones.map(([zl, kp, kc], zi) => {
                    const use = toNum(r[kc]) === null ? null : (toNum(r[kc]) as number) - (toNum(r[kp]) ?? 0);
                    return (
                      <div key={t.id + zl} className={`grid grid-cols-[minmax(0,1fr)_88px_100px_72px] items-center gap-2 px-4 py-2 ${zi ? '' : 'border-t border-[#edf0f5]'}`}>
                        {zi ? <span className="pl-3 text-[13px] text-muted">ночь</span> : <span className="min-w-0">{name}{zl && <span className="block text-[13px] text-muted">день</span>}</span>}
                        <span className="field px-1.5"><input inputMode="decimal" className="text-right" aria-label={`${t.name}${zl ? ', ' + zl : ''}: было`} placeholder="начало" value={r[kp]} onChange={(x) => setRead(t.id, kp, x.target.value)} /></span>
                        <span className="field bg-warn-soft px-1.5"><input inputMode="decimal" className="text-right" aria-label={`${t.name}${zl ? ', ' + zl : ''}: стало`} value={r[kc]} onChange={(x) => setRead(t.id, kc, x.target.value)} /></span>
                        <span className={`text-right font-semibold ${use !== null && use < 0 ? 'text-bad' : ''}`}>{use === null ? '—' : String(Math.round(use * 1000) / 1000).replace('.', ',')}</span>
                      </div>
                    );
                  });
                })}
                {e.fixed && <p className="px-4 pb-2 text-[12px] text-[#b4362b]">{e.fixed}</p>}
              </div>
            )}
            <div className="h-4" />
          </section>

          {/* Результат и сверка */}
          <section className="card overflow-hidden" aria-live="polite">
            <div className="border-b border-line bg-[#f6f8fb] px-4 py-2.5 eyebrow">Результат</div>
            {d.logic !== 'whole' && view.rows.map(({ t, ls, amount }) => (
              <div key={t.id} className="flex justify-between gap-3 border-t border-[#f0f2f6] px-4 py-2.5 first:border-t-0">
                <span className="min-w-0"><span className="block font-semibold">{who(t)}</span>
                  {ls.map((l, i) => <span key={i} className="block text-[12px] text-muted">{ls.length > 1 ? `${l.label}: ` : ''}{l.formula}</span>)}</span>
                <span className="whitespace-nowrap font-semibold">{amount === null ? '—' : `${fmtMoney(amount)} ₽`}</span>
              </div>
            ))}
            {M.bill && !p.isOwner && (
              <div className="flex justify-between gap-3 border-t border-[#f0f2f6] bg-[#fbfcfd] px-4 py-2.5">
                <span><span className="block font-semibold text-cta-ink">Остаётся на вас</span>
                  <span className="hint">{d.logic === 'whole' ? 'вся квитанция' : 'доли пустующих частей, остаток, округление'}</span></span>
                <span className="whitespace-nowrap font-semibold text-cta-ink">{view.owner === null ? '—' : `${fmtMoney(Math.max(0, view.owner))} ₽`}</span>
              </div>
            )}
            <div className={`flex items-center gap-2 border-t-2 border-nav px-4 py-3 font-semibold ${view.err ? 'text-bad' : 'text-ok'}`}>
              {view.err ? <><CircleAlert size={20} /> {view.err}</>
                : d.logic === 'whole' ? <><Check size={20} /> Вся сумма {fmtMoney(view.A ?? 0)} ₽ остаётся на вас</>
                : M.bill ? <><Check size={20} /> Распределено {fmtMoney(view.A ?? 0)} из {fmtMoney(view.A ?? 0)} ₽ — сходится с квитанцией</>
                : <><Check size={20} /> Начислено {fmtMoney(view.tenantsSum ?? 0)} ₽ — {M.fixed ? 'фиксированные суммы' : 'по счётчикам и ценам'}, сумма квитанции не нужна</>}
            </div>
          </section>
        </div>

        {/* Подсказка по виду квитанции */}
        <aside aria-label="Подсказка" className="card overflow-hidden lg:sticky lg:top-4">
          <div className="flex items-center gap-3 border-b border-cta/30 bg-cta-soft px-4 py-3">
            <span className="flex size-9 items-center justify-center rounded-[9px] bg-white text-cta-ink"><KindIcon name={cat.icon} /></span>
            <span><b className="block text-[15px] font-semibold">{cat.id ? cat.name : d.name || 'Своя квитанция'}</b><span className="text-[12px] text-cta-ink">{cat.group}</span></span>
          </div>
          <div className="border-b border-line px-4 py-3"><div className={L}>Обычно делится</div><b className="mt-1 block">{METHODS[cat.def as Method]?.label}</b></div>
          {cat.inc.length > 0 && (
            <div className="border-b border-line px-4 py-3"><div className={L}>Что входит</div>
              <ul className="mt-1.5 flex flex-col gap-1 text-[13px] text-ink-2">{cat.inc.map((x) => <li key={x}>· {x}</li>)}</ul></div>
          )}
          {cat.ex.length > 0 && (
            <div className="border-b border-line px-4 py-3"><div className={L}>Как называется в квитанции</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">{cat.ex.map((x) => <span key={x} className="rounded-md border border-line bg-[#f6f8fb] px-2 py-0.5 text-[12px] text-ink-2">{x}</span>)}</div></div>
          )}
          {cat.tip && <div className="border-b border-line bg-[#f6f8fb] px-4 py-3 text-[13px] text-ink-2"><b className="block text-ink">Подсказка</b>{cat.tip}</div>}
          <div className="px-4 py-3"><div className={L}>Счётчики объекта{cat.resource ? ` · ${RESOURCES[cat.resource].label.toLowerCase()}` : ''}</div>
            {!cat.resource ? <p className="mt-1 text-[13px] text-muted">Для этого вида не нужны</p>
              : groupMeters.length === 0 ? <p className="mt-1 text-[13px] text-muted">Пока нет</p>
              : groupMeters.map((m) => (
                <div key={m.id} className="mt-1.5 flex justify-between gap-2 text-[13px]">
                  <span className="truncate">{m.tenantId ? p.tenants.find((t) => t.id === m.tenantId)?.name ?? '—' : 'Общий на объект'}</span>
                  <span className="whitespace-nowrap text-muted">№ {m.number || '—'}</span>
                </div>
              ))}
            {cat.resource && <Link href={`/objects/${p.objectId}/meter?r=${cat.resource}&m=${p.month}`} className="mt-2 block text-[13px] font-semibold text-cta-ink hover:underline">+ Добавить счётчик</Link>}
          </div>
        </aside>
      </div>

      <p className="hint">Сохранённый способ деления подставится в следующих месяцах — {M.bill ? `останется ввести сумму${M.read ? ' и показания' : ''}` : M.read ? 'останется внести показания' : 'вводить ничего не нужно'}.
        Изменение способа действует с {p.monthText.toLowerCase()}, прошлые месяцы не пересчитываются.</p>
      <div className="flex flex-wrap items-center gap-2">
        <button className="btn btn-primary" disabled={pending}>{pending ? 'Сохраняем…' : 'Сохранить квитанцию'}</button>
        <CancelButton href={`/objects/${p.objectId}?m=${p.month}`} />
        {p.serviceId && (
          <span className="ml-auto flex items-center gap-2">
            {confirmDel ? (
              <>
                <span className="text-[13px] text-muted">Удалить квитанцию за все месяцы?</span>
                <button type="button" className="btn border-bad/40 text-bad hover:bg-bad-soft" disabled={deleting}
                  onClick={() => startDelete(() => deleteReceipt(p.objectId, p.serviceId!, p.month))}>{deleting ? 'Удаляем…' : 'Да, удалить'}</button>
                <button type="button" className="btn" onClick={() => setConfirmDel(false)}>Нет</button>
              </>
            ) : <button type="button" className="btn text-bad hover:bg-bad-soft" onClick={() => setConfirmDel(true)}>Удалить</button>}
          </span>
        )}
      </div>
    </form>
  );
}

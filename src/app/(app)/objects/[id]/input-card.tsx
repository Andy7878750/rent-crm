'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { saveBill, saveReading } from '../actions';

export type BillField = { serviceId: string; supplier: string; name: string; value?: number };
export type MeterField = { serviceId: string; zone: '' | 'day' | 'night'; label: string; unit: string; direct: boolean; prev?: number; cur?: number };

const show = (n?: number) => (n === undefined ? '' : String(n).replace('.', ','));
const money = (n?: number) => (n === undefined ? '' : n.toFixed(2).replace('.', ','));
const parse = (s: string) => { const n = Number(s.replace(/\s/g, '').replace(',', '.')); return s.trim() && Number.isFinite(n) ? n : null; };

/** Карточка «Ввод данных»: сохраняет каждое поле при выходе из него и пересчитывает страницу. */
export function InputCard(p: {
  objectId: string; tenantId: string; tenantName: string; month: string; monthText: string; objectName: string;
  bills: BillField[]; meters: MeterField[]; missing: number; serviceCount: number; nextHref: string | null; nextName: string;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [saved, setSaved] = useState(false);
  const commit = (fn: () => Promise<unknown>) => start(async () => { await fn(); setSaved(true); router.refresh(); });

  const st = !p.serviceCount ? ['Нет услуг', 'bg-[#eef0f3] text-[#4d5f71]'] : p.missing ? ['Не всё внесено', 'bg-bad-soft text-bad'] : ['Внесено', 'bg-ok-soft text-ok'];
  const step = (n: number, t: string) => (
    <div className="flex items-center gap-2"><span className="flex size-[22px] items-center justify-center rounded-full bg-accent text-[12px] font-bold text-white">{n}</span><b className="font-semibold">{t}</b></div>
  );

  return (
    <section aria-label="Ввод данных" className="card flex flex-col">
      <div className="flex items-start justify-between gap-2 p-[18px] pb-2.5">
        <div><div className="eyebrow">Ввод данных</div><div className="mt-1 text-[16px] font-bold">{p.tenantName}</div><div className="hint">{p.monthText}</div></div>
        <span className="flex flex-col items-end gap-1"><span className={`pill ${st[1]}`}>{st[0]}</span>
          <span className="hint" aria-live="polite">{pending ? 'Сохраняем…' : saved ? 'Сохранено' : ''}</span></span>
      </div>
      <div className="flex flex-col gap-4 px-[18px] pb-4">
        {!p.serviceCount && (
          <div className="flex flex-col items-start gap-2.5 rounded-[10px] border border-dashed border-[#c9d1da] p-3.5">
            <span>К арендатору не привязана ни одна услуга. Привяжите его к тарифам — и здесь появятся поля.</span>
            <Link href="/tariffs" className="btn btn-primary">Открыть «Тарифы и услуги»</Link>
          </div>
        )}
        {p.bills.length > 0 && (
          <div>
            {step(1, 'Счета на помещение')}
            <div className="mb-1.5 ml-[30px] hint">Общие для всех арендаторов {p.objectName}</div>
            {p.bills.map((b) => (
              <label key={b.serviceId} className="grid grid-cols-[minmax(0,1fr)_128px] items-center gap-2.5 border-t border-[#f0f2f6] py-2">
                <span className="min-w-0"><span className="block text-[12px] text-faint">{b.supplier}</span>{b.name}</span>
                <span className="field bg-warn-soft"><input inputMode="decimal" className="text-right" aria-label={`${b.supplier} — ${b.name}, сумма счёта`}
                  defaultValue={money(b.value)} placeholder="0,00"
                  onBlur={(e) => { if (parse(e.target.value) !== (b.value ?? null)) commit(() => saveBill(p.objectId, b.serviceId, p.month, e.target.value)); }} />
                  <span className="text-[12px] text-faint">₽</span></span>
              </label>
            ))}
          </div>
        )}
        {p.meters.length > 0 && (
          <div>
            {step(p.bills.length ? 2 : 1, 'Показания счётчиков')}
            <div className="grid grid-cols-[minmax(0,1fr)_56px_88px_64px] gap-1.5 pb-1 pt-2 text-[12px] text-faint">
              <span /><span className="text-right">было</span><span className="text-right">стало</span><span className="text-right">расход</span>
            </div>
            {p.meters.map((m) => {
              const use = m.direct ? m.cur : m.cur !== undefined ? m.cur - (m.prev ?? 0) : undefined;
              const bad = use !== undefined && use < 0;
              return (
                <div key={m.serviceId + m.zone} className="grid grid-cols-[minmax(0,1fr)_56px_88px_64px] items-center gap-1.5 border-t border-[#f0f2f6] py-2">
                  <span className="min-w-0">{m.label}<span className="block text-[12px] text-faint">{m.unit}</span></span>
                  {m.direct ? <span className="text-right text-[12px] text-faint">за мес.</span>
                    : m.prev === undefined ? (
                      <span className="field border-dashed px-1.5"><input inputMode="decimal" className="text-right" placeholder="начало" aria-label={`${m.label}, начальное показание`}
                        onBlur={(e) => { if (e.target.value.trim()) commit(() => saveReading(p.tenantId, m.serviceId, m.zone, p.month, 'prev', e.target.value)); }} /></span>
                    ) : <span className="text-right text-muted">{show(m.prev)}</span>}
                  <span className="field bg-warn-soft px-1.5"><input inputMode="decimal" className="text-right" aria-label={`${m.label}, ${m.direct ? 'расход за месяц' : 'новое показание'}`}
                    defaultValue={show(m.cur)}
                    onBlur={(e) => { if (parse(e.target.value) !== (m.cur ?? null)) commit(() => saveReading(p.tenantId, m.serviceId, m.zone, p.month, m.direct ? 'usage' : 'cur', e.target.value)); }} /></span>
                  <span className="text-right font-semibold">{use === undefined ? '—' : String(Math.round(use * 1000) / 1000).replace('.', ',')}</span>
                  {bad && <span role="alert" className="col-span-4 text-[12px] text-bad">Меньше прошлого показания — ошибка ввода или замена счётчика?</span>}
                </div>
              );
            })}
          </div>
        )}
      </div>
      {p.nextHref && (
        <div className="mt-auto border-t border-line p-[18px] pt-3.5">
          <Link href={p.nextHref} className="btn w-full">Следующий: {p.nextName} →</Link>
        </div>
      )}
    </section>
  );
}

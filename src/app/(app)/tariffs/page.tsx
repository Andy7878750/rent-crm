import Link from 'next/link';
import { Pencil, Plus } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { listObjects, loadServices } from '@/lib/data';
import { KINDS, LOGICS } from '@/lib/calc/logics';
import type { Tariff } from '@/lib/calc/types';
import { MoveButtons } from './move-buttons';

export const metadata = { title: 'Тарифы и услуги' };

/** Цена: минимум 2 знака после запятой (27,5 → 27,50), больше — как ввели (11,0348). */
const num = (n?: number) => {
  if (n === undefined) return '—';
  const [i, f = ''] = String(n).split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00a0') + ',' + f.padEnd(2, '0');
};
const date = (d: string) => d.split('-').reverse().join('.');

function priceText(t: Tariff, unit: string): [string, string] {
  switch (t.logic) {
    case 'share': return ['доля', 'от квитанции'];
    case 'split': return ['по счёту', 'цена месяца'];
    case 'whole': return ['вся сумма', 'квитанции'];
    case 'fixed': return [num(t.price), '₽ в месяц'];
    case 'dn': return [`${num(t.price)} / ${num(t.price2)}`, `₽/${unit} день / ночь`];
    case 'norm': return [num(t.price), `₽ × ${num(t.norm)}`];
    case 'meterRest': return [num(t.price), `₽/${unit} + остаток`];
    default: return [num(t.price), `₽/${unit}`];
  }
}

export default async function TariffsPage({ searchParams }: PageProps<'/tariffs'>) {
  const user = await requireUser();
  const sp = await searchParams;
  const [services, objects] = await Promise.all([loadServices(user.accountId), listObjects(user.accountId)]);
  const tenantObj = new Map<string, { name: string; obj: string; objId: string }>();
  objects.forEach((o) => o.tenants.forEach((t) => tenantObj.set(t.id, { name: t.name, obj: o.short, objId: o.id })));
  const svcName = new Map(services.map((s) => [s.id, s.name]));
  const filter = typeof sp.o === 'string' && objects.some((o) => o.id === sp.o) ? sp.o : 'all';

  const whoText = (t: Tariff) => {
    if (t.who === 'all') return null;
    const byObj = new Map<string, string[]>();
    t.who.forEach((id) => { const x = tenantObj.get(id); if (x) byObj.set(x.obj, [...(byObj.get(x.obj) ?? []), x.name]); });
    return [...byObj.entries()].map(([o, ns]) => `${o}: ${ns.join(', ')}`).join(' · ') || 'никто не выбран';
  };
  const ownerFilter = objects.find((o) => o.id === filter)?.isOwner ?? false;
  const visible = services.filter((s) => filter === 'all' || (s.kind === 'owner' && !ownerFilter) ||
    s.tariffs.some((t) => (t.who === 'all' && !ownerFilter) || (t.who !== 'all' && t.who.some((id) => tenantObj.get(id)?.objId === filter))));

  const chip = (id: string, label: string) => (
    <Link key={id} href={id === 'all' ? '/tariffs' : `/tariffs?o=${id}`} aria-pressed={filter === id}
      className={`rounded-full border px-3.5 py-1.5 font-semibold ${filter === id ? 'border-nav bg-nav text-white' : 'border-line-strong bg-white text-[#4d5f71]'}`}>{label}</Link>
  );

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-bold">Тарифы и услуги</h1>
        <div className="flex-1" />
        <Link href="/tariffs/new" className="btn btn-primary"><Plus size={16} /> Создать услугу</Link>
      </div>
      <p className="max-w-[900px] text-[13px] text-muted">
        Услуга — одна строка квитанции поставщика (например, «Водоканал — холодная вода»). Внутри услуги — тарифы: логика расчёта, цена и арендаторы,
        для которых она действует. Нажмите на название или ✎, чтобы изменить услугу. Стрелки в столбце «№» задают порядок строк в «Вводе данных», «Расчёте» и отчёте.
      </p>
      <div role="group" aria-label="Фильтр по объекту" className="flex flex-wrap gap-2">
        {chip('all', 'Все объекты')}
        {objects.map((o) => chip(o.id, o.short))}
      </div>

      {visible.length === 0 && (
        <div className="card p-6 text-ink-2">Услуг пока нет. <Link href="/tariffs/new" className="font-semibold text-accent">Создайте первую</Link> — например, «Водоканал — холодная вода».</div>
      )}

      {visible.length > 0 && (
        <div className="card overflow-x-auto shadow-card">
          <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
            <thead>
              <tr className="border-b border-line bg-[#f6f8fb] text-[12px] text-muted">
                <th className="w-[70px] px-3 py-2.5 font-semibold">№</th>
                <th className="px-3 py-2.5 font-semibold">Поставщик</th>
                <th className="px-3 py-2.5 font-semibold">Услуга</th>
                <th className="px-3 py-2.5 font-semibold">Счёт</th>
                <th className="px-3 py-2.5 font-semibold">Логика расчёта</th>
                <th className="px-3 py-2.5 text-right font-semibold">Цена</th>
                <th className="px-3 py-2.5 font-semibold">Для кого</th>
                <th className="px-3 py-2.5 font-semibold">С даты</th>
                <th className="w-[44px] px-2 py-2.5"><span className="sr-only">Изменить</span></th>
              </tr>
            </thead>
            {visible.map((s, idx) => {
              const K = KINDS[s.kind];
              const ts = [...s.tariffs].sort((a, b) => b.from.localeCompare(a.from));
              const rows = ts.length ? ts : [null];
              const span = rows.length;
              return (
                <tbody key={s.id} id={`s-${s.id}`} className="group border-b border-[#edf0f5] last:border-b-0 hover:bg-[#fafbfc]">
                  {rows.map((t, i) => {
                    const [p, u] = t ? priceText(t, s.unit) : ['—', ''];
                    const who = t ? whoText(t) : null;
                    const sub = i > 0 ? 'border-t border-dashed border-[#e6eaee]' : '';
                    return (
                      <tr key={i} className="align-top">
                        {i === 0 && (
                          <>
                            <td rowSpan={span} className="px-3 py-2.5">
                              <span className="flex items-center gap-1"><b className="w-5 text-ink-2">{idx + 1}</b>
                                <MoveButtons compact pos={idx + 1} up={visible[idx - 1]?.id} down={visible[idx + 1]?.id} id={s.id} name={s.name} /></span>
                            </td>
                            <td rowSpan={span} className="px-3 py-2.5 text-ink-2">{s.supplier}</td>
                            <td rowSpan={span} className="px-3 py-2.5">
                              <Link href={`/tariffs/${s.id}`} className="font-semibold text-ink hover:text-cta-ink hover:underline">{s.name}</Link>
                            </td>
                            <td rowSpan={span} className="whitespace-nowrap px-3 py-2.5"><span className={`pill ${K.pill}`}>{K.label}</span></td>
                          </>
                        )}
                        <td className={`px-3 py-2.5 ${sub}`}>
                          {t ? <span title={(t.logic === 'derived' || t.logic === 'norm') && t.sources?.length
                              ? `(${t.sources.map((x) => svcName.get(x) ?? '?').join(' + ')})${t.logic === 'norm' ? ' × норматив' : ''} × цена` : LOGICS[t.logic].formula}>{LOGICS[t.logic].label}</span>
                            : <span className="text-muted">тарифов нет</span>}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-2.5 text-right ${sub}`}><b className="font-semibold">{p}</b> <span className="text-[11px] text-muted">{u}</span></td>
                        <td className={`px-3 py-2.5 ${sub}`}>
                          {!t ? '—' : s.kind === 'owner' ? <span className="text-muted">платит арендодатель</span>
                            : who === null ? <span className="pill bg-ok-soft text-ok">Все арендаторы</span>
                            : <span className="leading-snug text-ink-2">{who}</span>}
                        </td>
                        <td className={`whitespace-nowrap px-3 py-2.5 text-muted ${sub}`}>{t ? date(t.from) : '—'}</td>
                        {i === 0 && (
                          <td rowSpan={span} className="px-2 py-2">
                            <Link href={`/tariffs/${s.id}`} aria-label={`Изменить услугу ${s.supplier} — ${s.name}`} title="Изменить"
                              className="flex size-8 items-center justify-center rounded-lg border border-line bg-white text-ink-2 hover:border-cta hover:text-cta-ink"><Pencil size={15} /></Link>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              );
            })}
          </table>
        </div>
      )}
    </>
  );
}

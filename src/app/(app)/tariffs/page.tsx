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
    case 'norm': return [num(t.price), `₽ × норматив ${num(t.norm)}`];
    case 'meterRest': return [num(t.price), `₽/${unit}${t.norm !== undefined ? ` + ${t.extraName || 'норматив'}` : ''} + остаток`];
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
  const visible = services.filter((s) => filter === 'all' || s.kind === 'owner' ||
    s.tariffs.some((t) => t.who === 'all' || t.who.some((id) => tenantObj.get(id)?.objId === filter)));

  const chip = (id: string, label: string) => (
    <Link key={id} href={id === 'all' ? '/tariffs' : `/tariffs?o=${id}`} aria-pressed={filter === id}
      className={`rounded-full border px-3.5 py-1.5 font-semibold ${filter === id ? 'border-nav bg-nav text-white' : 'border-line-strong bg-white text-[#3a475d]'}`}>{label}</Link>
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
        для которых она действует. Нажмите на карточку, чтобы изменить услугу. Стрелки задают порядок строк в «Вводе данных», «Расчёте» и отчёте.
      </p>
      <div role="group" aria-label="Фильтр по объекту" className="flex flex-wrap gap-2">
        {chip('all', 'Все объекты')}
        {objects.filter((o) => !o.isOwner).map((o) => chip(o.id, o.short))}
      </div>

      {visible.length === 0 && (
        <div className="card p-6 text-ink-2">Услуг пока нет. <Link href="/tariffs/new" className="font-semibold text-accent">Создайте первую</Link> — например, «Водоканал — холодная вода».</div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,380px),1fr))] items-stretch gap-4">
        {visible.map((s, idx) => {
          const K = KINDS[s.kind];
          return (
            <div key={s.id} id={`s-${s.id}`} className="card flex min-w-0 flex-col shadow-card">
              <Link href={`/tariffs/${s.id}`} className="flex flex-1 flex-col rounded-t-xl hover:bg-[#fbfcfe]" aria-label={`Изменить услугу ${s.supplier} — ${s.name}`}>
                <span className="flex items-start justify-between gap-2.5 px-[18px] pb-2.5 pt-4">
                  <span className="min-w-0"><span className="block text-[12px] font-semibold uppercase tracking-[0.06em] text-muted">{s.supplier}</span>
                    <span className="mt-0.5 block text-[16px] font-bold">{s.name}</span></span>
                  <span className="flex items-center gap-2"><span className={`pill ${K.pill}`}>{K.label}</span>
                    <span aria-hidden className="flex size-[30px] items-center justify-center rounded-lg border border-line text-ink-2"><Pencil size={15} /></span></span>
                </span>
                <span className="block border-t border-[#edf0f5]">
                  {s.tariffs.length === 0 && <span className="block px-[18px] py-2.5 hint">Тарифов нет</span>}
                  {[...s.tariffs].sort((a, b) => b.from.localeCompare(a.from)).map((t, i) => {
                    const [p, u] = priceText(t, s.unit); const who = whoText(t);
                    return (
                      <span key={i} className="flex flex-col gap-1 border-b border-[#f0f2f6] px-[18px] py-2.5">
                        <span className="flex items-center gap-2.5"><span className="flex-1 font-semibold">{p} <span className="text-[12px] font-normal text-muted">{u}</span></span>
                          <span className="text-[12px] text-muted">с {date(t.from)}</span></span>
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="pill bg-[#eef0f3] text-[#3a475d]">{LOGICS[t.logic].label}</span>
                          <span className="text-[11px] text-muted">{(t.logic === 'derived' || t.logic === 'norm') && t.sources?.length
                            ? `(${t.sources.map((x) => svcName.get(x) ?? '?').join(' + ')})${t.logic === 'norm' ? ' × норматив' : ''} × цена` : LOGICS[t.logic].formula}</span>
                        </span>
                        {s.kind === 'owner' ? <span className="pill self-start bg-[#eef0f3] text-[#3a475d]">Платит арендодатель</span>
                          : who === null ? <span className="pill self-start bg-ok-soft text-ok">Все арендаторы</span>
                          : <span className="text-[13px] leading-snug text-ink-2">{who}</span>}
                      </span>
                    );
                  })}
                </span>
                {s.kind === 'owner' && <span className="block px-[18px] py-2.5 hint">Арендаторы эту услугу не видят, она входит в «Остаётся на вас».</span>}
              </Link>
              <MoveButtons pos={idx + 1} up={visible[idx - 1]?.id} down={visible[idx + 1]?.id} id={s.id} name={s.name} />
            </div>
          );
        })}
      </div>
    </>
  );
}

import Link from 'next/link';
import { Building2, Home, Warehouse } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { loadMonthInput } from '@/lib/data';
import { calculateMonth } from '@/lib/calc/engine';
import { fmtMoney } from '@/lib/calc/format';
import { defaultMonth, isMonth } from '@/lib/month';
import { MonthNav } from '@/components/month-nav';

export const metadata = { title: 'Объекты' };

const TYPE = { nonres: 'Нежилое помещение', flat: 'Квартира', other: 'Другое' } as const;
const ICON = { nonres: Building2, flat: Home, other: Warehouse } as const;

export default async function ObjectsPage({ searchParams }: PageProps<'/objects'>) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = isMonth(sp.m) ? sp.m : defaultMonth();
  const { input, objects } = await loadMonthInput(user.accountId, month);
  const res = calculateMonth(input);

  const bills = Object.values(res.tenants);
  const total = bills.reduce((a, b) => a + b.total, 0);
  const ready = bills.filter((b) => b.serviceCount && !b.missing.length).length;
  const own = Object.values(res.owner).reduce((a, o) => a + o.total, 0);

  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[24px] font-bold text-accent">Объекты</h1>
        <MonthNav month={month} path="/objects" />
        <div className="flex-1" />
        <Link href="/objects/new" className="btn btn-primary">+ Добавить объект</Link>
      </div>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(220px,1fr))] gap-3">
        <Kpi label="К выставлению" value={`${fmtMoney(total)} ₽`} />
        <Kpi label="Арендаторы" value={String(bills.length)} note={`· готовы ${ready}`} />
        <Kpi label="Показания внесены" value={`${ready} из ${bills.length}`} />
        <Kpi label="Остаётся на вас" value={`${fmtMoney(own)} ₽`} note="капремонт, незанятые доли" />
      </div>

      {objects.length === 0 && (
        <div className="card p-6 text-ink-2">Объектов пока нет. <Link href="/objects/new" className="font-semibold text-accent">Добавьте первый</Link>.</div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4">
        {objects.map((o) => {
          const Icon = ICON[o.type];
          const sum = o.tenants.reduce((a, t) => a + (res.tenants[t.id]?.total ?? 0), 0);
          const filled = o.tenants.filter((t) => res.tenants[t.id] && !res.tenants[t.id].missing.length).length;
          return (
            <Link key={o.id} href={`/objects/${o.id}?m=${month}`} className="card flex flex-col shadow-card transition hover:border-accent">
              <div className="flex items-start gap-3 p-[18px] pb-3">
                <span className="flex size-10 flex-none items-center justify-center rounded-[10px] bg-accent-soft text-accent"><Icon size={20} /></span>
                <span className="min-w-0">
                  <span className="flex flex-wrap items-center gap-2 text-[17px] font-semibold">{o.short}
                    {o.isExample && <span className="pill bg-accent-soft text-accent">Пример</span>}</span>
                  <span className="block text-[12px] text-muted">{o.type === 'other' && o.typeLabel ? o.typeLabel : TYPE[o.type]}</span>
                </span>
              </div>
              {o.address && <div className="px-[18px] text-[13px] text-muted">{o.address}</div>}
              {o.isOwner ? (
                <div className="mt-3 border-t border-[#edf0f5] px-[18px] py-3 text-[13px] text-ink-2">Собственник — счета оплачиваете вы</div>
              ) : (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#edf0f5] px-[18px] py-3 text-[12px] text-muted">
                    <span>Арендаторы<b className="block text-[14px] text-ink">{o.tenants.length}</b></span>
                    <span>Показания<b className="block text-[14px] text-ink">{filled} из {o.tenants.length}</b></span>
                    <span>К выставлению<b className="block text-[14px] text-ink">{fmtMoney(sum)} ₽</b></span>
                  </div>
                  <div className="flex flex-col gap-1 border-t border-[#edf0f5] px-[18px] py-3">
                    {o.tenants.length === 0 && <span className="hint">Арендаторов пока нет</span>}
                    {o.tenants.map((t) => (
                      <span key={t.id} className="flex justify-between gap-2 text-[13px]">
                        <span className="truncate">{t.name}</span>
                        <span className="text-muted">доля {String(Number(t.share)).replace('.', ',')}%</span>
                      </span>
                    ))}
                  </div>
                </>
              )}
            </Link>
          );
        })}
      </div>
    </>
  );
}

function Kpi({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="card px-4 py-3.5 shadow-card">
      <div className="text-[12px] text-muted">{label}</div>
      <div className="mt-0.5 text-[22px] font-bold">{value} {note && <span className="text-[13px] font-medium text-muted">{note}</span>}</div>
    </div>
  );
}

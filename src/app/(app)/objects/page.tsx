import Link from 'next/link';
import { Building2, Home, Warehouse } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { loadMonthInput } from '@/lib/data';
import { calculateMonth } from '@/lib/calc/engine';
import { fmtMoney } from '@/lib/calc/format';
import { defaultMonth, isMonth } from '@/lib/month';
import { MonthNav } from '@/components/month-nav';
import { CardMenu } from './card-menu';
import { formatPhone } from '@/lib/phone';
import { FadeText } from '@/components/fade-text';

export const metadata = { title: 'Объекты' };

const TYPE = { nonres: 'Нежилое помещение', flat: 'Квартира', other: 'Другое' } as const;
const ICON = { nonres: Building2, flat: Home, other: Warehouse } as const;

export default async function ObjectsPage({ searchParams }: PageProps<'/objects'>) {
  const user = await requireUser();
  const sp = await searchParams;
  const month = isMonth(sp.m) ? sp.m : defaultMonth();
  const { input, objects } = await loadMonthInput(user.accountId, month);
  const res = calculateMonth(input);

  // Собственник считается как арендатор, но его сумма — не «к выставлению», а «остаётся на вас».
  const ownerIds = new Set(objects.filter((o) => o.isOwner).map((o) => o.id));
  const bills = Object.values(res.tenants).filter((b) => !ownerIds.has(b.objectId));
  const selfTotal = Object.values(res.tenants).filter((b) => ownerIds.has(b.objectId)).reduce((a, b) => a + b.total, 0);
  const total = bills.reduce((a, b) => a + b.total, 0);
  const ready = bills.filter((b) => b.serviceCount && !b.missing.length).length;
  const own = Object.values(res.owner).reduce((a, o) => a + o.total, 0) + selfTotal;

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
        <Kpi label="Остаётся на вас" value={`${fmtMoney(own)} ₽`} note="свои объекты, капремонт, незанятые доли" />
      </div>

      {objects.length === 0 && (
        <div className="card p-6 text-ink-2">Объектов пока нет. <Link href="/objects/new" className="font-semibold text-accent">Добавьте первый</Link>.</div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4">
        {objects.map((o) => {
          const Icon = ICON[o.type];
          const sum = o.tenants.reduce((a, t) => a + (res.tenants[t.id]?.total ?? 0), 0);
          const filled = o.tenants.filter((t) => res.tenants[t.id]?.serviceCount && !res.tenants[t.id].missing.length).length;
          return (
            <div key={o.id} className="card relative flex flex-col overflow-hidden shadow-card transition hover:border-cta">
              {/* Вся карточка кликабельна (ссылка поверх), меню «⋯» и телефон — над ней. */}
              <Link href={`/objects/${o.id}?m=${month}`} aria-label={`Открыть ${o.short}`} className="absolute inset-0" />
              {/* Серая шапка, как у разделов формы: иконка, название, тип. */}
              <div className="flex items-center gap-3 border-b border-line bg-[#f6f8fb] px-[18px] py-3">
                <span className="flex size-9 flex-none items-center justify-center rounded-[9px] bg-cta-soft text-cta-ink"><Icon size={19} /></span>
                <span className="min-w-0 flex-1">
                  <FadeText className="text-[16px] font-semibold" title={o.short}>{o.short}</FadeText>
                  <span className="block truncate text-[12px] text-muted">{o.type === 'other' && o.typeLabel ? o.typeLabel : TYPE[o.type]}</span>
                </span>
                {o.isExample && <span className="pill flex-none border border-cta/40 bg-white text-cta-ink">Пример</span>}
                <CardMenu objectId={o.id} name={o.short} />
              </div>
              <div className="flex flex-col gap-1 px-[18px] pt-3 text-[13px] text-muted">
                <FadeText title={o.address}>{o.address || 'Адрес не указан'}</FadeText>
                {/* УК: название растворяется в конце, телефон всегда целиком. */}
                <span className="flex min-w-0 items-baseline gap-1.5">
                  <span className="flex-none">УК:</span>
                  <FadeText className="flex-1 text-ink-2" title={o.ukName}>{o.ukName || '—'}</FadeText>
                  {o.ukPhone && <a href={`tel:${o.ukPhone.replace(/[^\d+]/g, '')}`} className="relative z-10 flex-none whitespace-nowrap text-ink-2 hover:text-cta-ink hover:underline">{formatPhone(o.ukPhone)}</a>}
                </span>
              </div>
              {o.isOwner ? (
                <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#edf0f5] px-[18px] py-3 text-[12px] text-muted">
                  <span>Пользуется<b className="block text-[14px] text-ink">собственник</b></span>
                  <span>Показания<b className="block text-[14px] text-ink">{!o.tenants.some((t) => res.tenants[t.id]?.serviceCount) ? 'нет услуг' : filled ? 'внесены' : 'не внесены'}</b></span>
                  <span>За месяц<b className="block text-[14px] text-cta-ink">{fmtMoney(sum)} ₽</b></span>
                </div>
              ) : (
                <>
                  <div className="mt-3 grid grid-cols-3 gap-2 border-t border-[#edf0f5] px-[18px] py-3 text-[12px] text-muted">
                    <span>Арендаторы<b className="block text-[14px] text-ink">{o.tenants.length}</b></span>
                    <span>Показания<b className="block text-[14px] text-ink">{filled} из {o.tenants.length}</b></span>
                    <span>К выставлению<b className="block text-[14px] text-cta-ink">{fmtMoney(sum)} ₽</b></span>
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
            </div>
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

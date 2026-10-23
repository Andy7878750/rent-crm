/**
 * Модуль расчёта: данные месяца → счёт каждого арендатора.
 * Правила — раздел 7 ТЗ. Все суммы строк округляются до копеек, итог = сумма строк.
 */
import type {
  BillLine, LineGroup, MeterUse, MonthInput, MonthResult, OwnerLine, PropertyObject,
  Reading, Service, Tariff, Tenant, TenantBill,
} from './types.ts';
import { fmtMoney, fmtPrice, fmtQty, round2, sumMoney } from './format.ts';

/** Тариф услуги, действующий для арендатора в расчётном месяце (самый поздний по дате начала). */
/**
 * Действующий тариф услуги для арендатора на месяц.
 * owner = true — это собственник своего объекта: «Все арендаторы» на него не распространяется, только явный выбор.
 */
export function activeTariff(service: Service, tenantId: string, month: string, owner = false): Tariff | null {
  let best: Tariff | null = null;
  for (const t of service.tariffs) {
    const forTenant = (t.who === 'all' && !owner) || (t.who !== 'all' && t.who.includes(tenantId));
    if (!forTenant || t.from.slice(0, 7) > month) continue;
    if (!best || t.from > best.from) best = t;
  }
  return best;
}

const pct = (share: number) => String(share).replace('.', ',') + '%';

function readingUsage(r: Reading | undefined): { usage: number | null; negative: boolean } {
  if (!r) return { usage: null, negative: false };
  if (typeof r.usage === 'number') return { usage: r.usage, negative: r.usage < 0 };
  if (typeof r.cur !== 'number') return { usage: null, negative: false };
  const prev = typeof r.prev === 'number' ? r.prev : 0;
  const u = r.cur - prev;
  return { usage: u, negative: u < 0 };
}

interface Ctx {
  input: MonthInput;
  obj: PropertyObject;
}

/** Расход арендатора по услуге (для день/ночь — сумма зон). */
function tenantUsage(ctx: Ctx, tenantId: string, service: Service, tariff: Tariff): number | null {
  const rd = ctx.input.readings[tenantId] || {};
  if (tariff.logic === 'dn') {
    const d = readingUsage(rd[service.id + ':day']).usage;
    const n = readingUsage(rd[service.id + ':night']).usage;
    return d === null || n === null ? null : d + n;
  }
  return readingUsage(rd[service.id]).usage;
}

/** Арендаторы объекта, у которых по услуге действует тариф с той же логикой (делят один счёт). */
function mates(ctx: Ctx, service: Service, logic: Tariff['logic']): Array<[Tenant, Tariff]> {
  const out: Array<[Tenant, Tariff]> = [];
  for (const t of ctx.obj.tenants) {
    const tr = activeTariff(service, t.id, ctx.input.month, !!ctx.obj.owner);
    if (tr && tr.logic === logic) out.push([t, tr]);
  }
  return out;
}

/** Начисление по «счётчики + остаток» до округления: свой расход × цена (+ расход × норматив × цена норматива). */
function meterRestPart(usage: number | null, tr: Tariff): number | null {
  if (usage === null || tr.price === undefined) return null;
  const extra = tr.norm !== undefined && tr.normPrice !== undefined ? usage * tr.norm * tr.normPrice : 0;
  return usage * tr.price + extra;
}

function calcTenant(ctx: Ctx, tenant: Tenant): TenantBill {
  const { input, obj } = ctx;
  const lines: BillLine[] = [];
  const meters: MeterUse[] = [];
  const missing: string[] = [];
  const rd = input.readings[tenant.id] || {};
  const bills = input.bills[obj.id] || {};

  const pairs: Array<[Service, Tariff]> = [];
  for (const s of input.services) {
    if (s.kind === 'owner') continue;
    const tr = activeTariff(s, tenant.id, input.month, !!obj.owner);
    if (tr) pairs.push([s, tr]);
  }

  // 1. Счётчики: расход каждой услуги (нужен и для производных услуг).
  const use: Record<string, number | null> = {};
  const addMeter = (s: Service, key: string, label: string) => {
    const r = rd[key];
    const { usage, negative } = readingUsage(r);
    meters.push({ serviceId: s.id, label, unit: s.unit, prev: r?.prev, cur: r?.cur, usage, negative });
    if (usage === null) missing.push(`Показание: ${label}`);
    return usage;
  };
  for (const [s, tr] of pairs) {
    if (tr.logic === 'meter' || tr.logic === 'meterRest' || tr.logic === 'split') use[s.id] = addMeter(s, s.id, s.name);
    if (tr.logic === 'dn') {
      const d = addMeter(s, s.id + ':day', s.name + ' — день');
      const n = addMeter(s, s.id + ':night', s.name + ' — ночь');
      use[s.id + ':day'] = d;
      use[s.id + ':night'] = n;
      use[s.id] = d === null || n === null ? null : d + n;
    }
  }

  const line = (s: Service, tr: Tariff, label: string, formula: string, raw: number | null, note?: string, group?: LineGroup) => {
    const g: LineGroup = group ?? (tr.logic === 'fixed' ? 'fixed' : s.kind === 'common' ? 'common' : 'indiv');
    lines.push({ serviceId: s.id, group: g, label, formula, note, amount: raw === null ? null : round2(raw) });
  };
  const q = (u: number | null) => (u === null ? '—' : fmtQty(u));

  // 2. Строки счёта в порядке услуг.
  for (const [s, tr] of pairs) {
    const p = tr.price ?? null;
    switch (tr.logic) {
      case 'meter': {
        const u = use[s.id];
        line(s, tr, s.name, `${q(u)} ${s.unit} × ${fmtPrice(p ?? 0)} руб.`, u === null || p === null ? null : u * p);
        break;
      }
      case 'dn': {
        const d = use[s.id + ':day'], n = use[s.id + ':night'], p2 = tr.price2 ?? null;
        line(s, tr, s.name, `${q(d)} × ${fmtPrice(p ?? 0)} + ${q(n)} × ${fmtPrice(p2 ?? 0)} руб.`,
          d === null || n === null || p === null || p2 === null ? null : d * p + n * p2);
        break;
      }
      case 'derived':
      case 'norm': {
        const src = (tr.sources || []).filter((id) => id in use);
        const u = src.length && src.every((id) => use[id] !== null) ? src.reduce((a, id) => a + (use[id] as number), 0) : null;
        if (!src.length) missing.push(`${s.name}: нет услуг-источников расхода`);
        if (tr.logic === 'derived') line(s, tr, s.name, `${q(u)} м³ × ${fmtPrice(p ?? 0)} руб.`, u === null || p === null ? null : u * p);
        else {
          const nm = tr.norm ?? null;
          line(s, tr, s.name, `${q(u)} м³ × ${fmtQty(nm ?? 0)} × ${fmtPrice(p ?? 0)} руб.`, u === null || p === null || nm === null ? null : u * nm * p);
        }
        break;
      }
      case 'share': {
        const bill = bills[s.id];
        if (bill === undefined) missing.push(`Сумма по квитанции: ${s.supplier} — ${s.name}`);
        line(s, tr, s.name, `${bill === undefined ? '—' : fmtMoney(bill)} руб. × ${pct(tenant.share)}`,
          bill === undefined ? null : (bill * tenant.share) / 100, undefined, 'common');
        break;
      }
      case 'split': {
        const bill = bills[s.id];
        if (bill === undefined) missing.push(`Сумма счёта на объект: ${s.supplier} — ${s.name}`);
        const all = mates(ctx, s, 'split').map(([t, mt]) => tenantUsage(ctx, t.id, s, mt));
        const denom = all.every((v) => v !== null) ? all.reduce((a, v) => a + (v as number), 0) : null;
        const price = bill !== undefined && denom ? bill / denom : null;
        const u = use[s.id];
        line(s, tr, s.name, `${q(u)} ${s.unit} × ${price === null ? '—' : fmtPrice(price)} руб.`,
          u === null || price === null ? null : u * price,
          `цена месяца = ${bill === undefined ? '—' : fmtMoney(bill)} ₽ ÷ ${denom === null ? '—' : fmtQty(denom)} ${s.unit} (всего у арендаторов)`, 'common');
        break;
      }
      case 'meterRest': {
        const bill = bills[s.id];
        if (bill === undefined) missing.push(`Сумма счёта на объект: ${s.supplier} — ${s.name}`);
        const u = use[s.id];
        const hasNorm = tr.norm !== undefined && tr.normPrice !== undefined;
        line(s, tr, s.name, `${q(u)} ${s.unit} × ${fmtPrice(p ?? 0)} руб.`, u === null || p === null ? null : u * p, undefined, 'common');
        const xn = (tr.extraName || '').trim();
        if (hasNorm) {
          line(s, tr, `${xn || 'Доп. начисление'} — норматив`, `${q(u)} ${s.unit} × ${fmtQty(tr.norm!)} × ${fmtPrice(tr.normPrice!)} руб.`,
            u === null ? null : u * tr.norm! * tr.normPrice!, undefined, 'common');
        }
        const parts = mates(ctx, s, 'meterRest').map(([t, mt]) => meterRestPart(tenantUsage(ctx, t.id, s, mt), mt));
        const indivSum = parts.every((v) => v !== null) ? parts.reduce((a, v) => a + (v as number), 0) : null;
        const rest = bill !== undefined && indivSum !== null ? round2(bill - indivSum) : null;
        line(s, tr, xn ? `${xn} — остаток` : 'Остаток по долям', `${rest === null ? '—' : fmtMoney(rest)} руб. × ${pct(tenant.share)}`,
          rest === null ? null : (rest * tenant.share) / 100,
          rest === null ? undefined : `остаток = ${fmtMoney(bill!)} ₽ по счёту − ${fmtMoney(indivSum!)} ₽ по счётчикам арендаторов`, 'common');
        break;
      }
      case 'fixed':
        if (p === null) missing.push(`${s.name}: не указана сумма`);
        line(s, tr, s.name, 'фиксированная сумма', p, undefined, 'fixed');
        break;
      case 'whole':
        break;
    }
  }

  const total = sumMoney(lines.filter((l) => l.amount !== null).map((l) => l.amount as number));
  return { tenantId: tenant.id, objectId: obj.id, lines, meters, total, missing, serviceCount: pairs.length };
}

/** Что остаётся на арендодателе: незанятая доля по «доле», незанятая доля остатка, услуги «только арендодатель». */
function calcOwner(ctx: Ctx): { lines: OwnerLine[]; total: number } {
  const { input, obj } = ctx;
  const bills = input.bills[obj.id] || {};
  const lines: OwnerLine[] = [];
  for (const s of input.services) {
    const bill = bills[s.id];
    if (s.kind === 'owner') {
      if (bill !== undefined) lines.push({ serviceId: s.id, label: s.name, amount: round2(bill) });
      continue;
    }
    for (const logic of ['share', 'meterRest'] as const) {
      const m = mates(ctx, s, logic);
      if (!m.length || bill === undefined) continue;
      const covered = m.reduce((a, [t]) => a + t.share, 0);
      const free = Math.max(0, 100 - covered);
      if (!free) continue;
      let base: number | null = bill;
      if (logic === 'meterRest') {
        const parts = m.map(([t, mt]) => meterRestPart(tenantUsage(ctx, t.id, s, mt), mt));
        base = parts.every((v) => v !== null) ? round2(bill - parts.reduce((a, v) => a + (v as number), 0)) : null;
      }
      lines.push({ serviceId: s.id, label: `${s.name} — незанятая доля ${pct(free)}`, amount: base === null ? null : round2((base * free) / 100) });
    }
  }
  return { lines, total: sumMoney(lines.filter((l) => l.amount !== null).map((l) => l.amount as number)) };
}

/** Расчёт месяца по всем объектам. */
export function calculateMonth(input: MonthInput): MonthResult {
  const result: MonthResult = { tenants: {}, owner: {} };
  for (const obj of input.objects) {
    const ctx: Ctx = { input, obj };
    for (const t of obj.tenants) result.tenants[t.id] = calcTenant(ctx, t);
    result.owner[obj.id] = calcOwner(ctx);
  }
  return result;
}

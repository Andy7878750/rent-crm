/**
 * Проверка модуля расчёта на реальных цифрах.
 * Эталон — суммы, сверенные с макетом и квитанциями поставщиков за август 2026.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMonth, activeTariff } from '../src/lib/calc/engine.ts';
import { rubWords, sumMoney } from '../src/lib/calc/format.ts';
import { august2026 } from './fixtures.ts';
import type { MonthInput } from '../src/lib/calc/types.ts';

const res = calculateMonth(august2026);
const amount = (tid: string, label: string) => res.tenants[tid].lines.find((l) => l.label === label)?.amount;

test('итоги всех арендаторов совпадают с эталоном до копейки', () => {
  // Итог = сумма округлённых строк (ТЗ, раздел 7). Макет складывал неокруглённые строки,
  // поэтому у Ногти и ЗдравСити там было на 1 коп. иначе (13 692,87 и 15 109,40), и строки не сходились с итогом.
  assert.equal(res.tenants.t1.total, 13692.86, 'Ногти');
  assert.equal(res.tenants.t2.total, 15109.41, 'ЗдравСити');
  assert.equal(res.tenants.t3.total, 16612.96, 'Жаркофф');
  assert.equal(res.tenants.t4.total, 8243.68, 'Салон Эгоист');
  assert.equal(res.tenants.t5.total, 5433.91, 'ИП Смирнова');
});

test('Салон Эгоист: каждая строка', () => {
  assert.equal(amount('t4', 'Содержание и ремонт'), 2293.07);
  assert.equal(amount('t4', 'Электричество'), 3468.39);
  assert.equal(amount('t4', 'Горячая вода'), 135.96);
  assert.equal(amount('t4', 'Подогрев ГВС — норматив'), 555.43);
  assert.equal(amount('t4', 'Подогрев ГВС — остаток'), 499.89);
  assert.equal(amount('t4', 'Холодная вода'), 247.84);
  assert.equal(amount('t4', 'Водоотведение'), 435.54);
  assert.equal(amount('t4', 'Вывоз мусора'), 607.56);
  assert.deepEqual(res.tenants.t4.missing, []);
});

test('Электричество «делится по показаниям»: арендаторы вместе платят ровно счёт ПЕСК', () => {
  assert.equal(amount('t3', 'Электричество'), 12377.41);
  assert.equal(sumMoney([amount('t3', 'Электричество')!, amount('t4', 'Электричество')!]), 15845.80);
  assert.equal(sumMoney([amount('t1', 'Электричество')!, amount('t2', 'Электричество')!]), 20938.90);
});

test('ГУП ТЭК «счётчики + остаток»: сумма по арендаторам = счёт 2 147,94', () => {
  const k61 = ['t3', 't4'].flatMap((t) => res.tenants[t].lines.filter((l) => l.serviceId === 'tekhw').map((l) => l.amount!));
  assert.equal(sumMoney(k61), 2147.94);
});

test('Итог всегда равен сумме строк, которые видит арендатор', () => {
  for (const b of Object.values(res.tenants)) assert.equal(b.total, sumMoney(b.lines.map((l) => l.amount ?? 0)));
});

test('Доля по квитанции: 5 113,83 × 45% = 2 301,22', () => {
  assert.equal(amount('t1', 'Содержание и ремонт'), 2301.22);
});

test('День / ночь и производная услуга (квартира)', () => {
  assert.equal(amount('t5', 'Электричество, квартира'), 1274.00); // 140 × 7,50 + 70 × 3,20
  assert.equal(amount('t5', 'Водоотведение'), 508.13); // (4 + 3) м³ × 72,59
  assert.equal(amount('t5', 'Остаток по долям'), 0);
});

test('Капремонт не попадает в счёт арендатора, а остаётся на арендодателе', () => {
  assert.ok(!res.tenants.t4.lines.some((l) => l.serviceId === 'kr'));
  assert.equal(res.owner.k61.lines.find((l) => l.serviceId === 'kr')?.amount, 967.84);
});

test('Объект собственника: нет арендаторов и строк счёта', () => {
  assert.equal(Object.values(res.tenants).filter((t) => t.objectId === 'pg148').length, 0);
});

test('Незанятая доля по «доле» остаётся на арендодателе', () => {
  const input: MonthInput = structuredClone(august2026);
  input.objects[0].tenants[1].share = 35; // ЗдравСити занимает 35% вместо 55%
  const r = calculateMonth(input);
  const own = r.owner.p15.lines.find((l) => l.serviceId === 'ku');
  assert.equal(own?.amount, 1022.77); // 5 113,83 × 20%
});

test('Нет показаний → строка без суммы и причина в списке', () => {
  const input: MonthInput = structuredClone(august2026);
  delete input.readings.t3.vkcw;
  const r = calculateMonth(input);
  assert.equal(r.tenants.t3.lines.find((l) => l.label === 'Холодная вода')?.amount, null);
  assert.ok(r.tenants.t3.missing.some((m) => m.includes('Холодная вода')));
});

test('Новое показание меньше прошлого отмечается', () => {
  const input: MonthInput = structuredClone(august2026);
  input.readings.t3.vkcw = { prev: 390, cur: 387 };
  assert.equal(calculateMonth(input).tenants.t3.meters.find((m) => m.serviceId === 'vkcw')?.negative, true);
});

test('Тариф выбирается по дате начала: новая цена не меняет прошлые месяцы', () => {
  const svc = structuredClone(august2026.services[3]);
  svc.tariffs.push({ logic: 'meter', price: 70, who: 'all', from: '2026-09-01' });
  assert.equal(activeTariff(svc, 't1', '2026-08')?.price, 61.96);
  assert.equal(activeTariff(svc, 't1', '2026-09')?.price, 70);
});

test('Сумма прописью', () => {
  assert.equal(rubWords(8243.68), 'Восемь тысяч двести сорок три рубля 68 копеек');
  assert.equal(rubWords(15845.8), 'Пятнадцать тысяч восемьсот сорок пять рублей 80 копеек');
  assert.equal(rubWords(1001), 'Одна тысяча один рубль 00 копеек');
});

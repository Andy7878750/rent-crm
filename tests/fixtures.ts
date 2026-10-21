/**
 * Пример месяца: август 2026, данные из макета и реальных квитанций арендодателя
 * (ПЕСК, ГУП ТЭК, ведомость показаний). На них проверяем модуль расчёта.
 */
import type { MonthInput } from '../src/lib/calc/types.ts';

export const august2026: MonthInput = {
  month: '2026-08',
  objects: [
    { id: 'p15', name: 'Просвещения 15', tenants: [
      { id: 't1', name: 'Ногти', share: 45 },
      { id: 't2', name: 'ЗдравСити', share: 55 } ] },
    { id: 'k61', name: 'Королёва 61', tenants: [
      { id: 't3', name: 'Жаркофф', share: 55 },
      { id: 't4', name: 'Салон Эгоист', share: 45 } ] },
    { id: 'l120', name: 'Ленинский 120', tenants: [
      { id: 't5', name: 'ИП Смирнова А. В.', share: 100 } ] },
    { id: 'pg148', name: 'Глинки 16/8 кв. 148', owner: true, tenants: [] },
  ],
  services: [
    { id: 'ku', supplier: 'Ком. услуги', name: 'Содержание и ремонт', unit: '₽', kind: 'common',
      tariffs: [{ logic: 'share', who: 'all', from: '2026-01-01' }] },
    { id: 'pesk', supplier: 'ПЕСК', name: 'Электричество', unit: 'кВт·ч', kind: 'common',
      tariffs: [{ logic: 'split', who: ['t1', 't2', 't3', 't4'], from: '2026-08-01' }] },
    { id: 'peskflat', supplier: 'ПЕСК', name: 'Электричество, квартира', unit: 'кВт·ч', kind: 'indiv',
      tariffs: [{ logic: 'dn', price: 7.5, price2: 3.2, who: ['t5'], from: '2026-08-01' }] },
    { id: 'vkcw', supplier: 'Водоканал', name: 'Холодная вода', unit: 'м³', kind: 'indiv',
      tariffs: [{ logic: 'meter', price: 61.96, who: 'all', from: '2026-01-01' }] },
    { id: 'tekhw', supplier: 'ГУП ТЭК', name: 'Горячая вода', unit: 'м³', kind: 'common',
      tariffs: [
        { logic: 'meterRest', price: 67.98, extraName: 'Подогрев ГВС', norm: 0.06, normPrice: 4628.57, who: ['t1', 't2', 't3', 't4'], from: '2026-08-01' },
        { logic: 'meterRest', price: 67.98, who: ['t5'], from: '2026-08-01' } ] },
    { id: 'vkdr', supplier: 'Водоканал', name: 'Водоотведение', unit: 'м³', kind: 'indiv',
      tariffs: [{ logic: 'derived', price: 72.59, sources: ['vkcw', 'tekhw'], who: 'all', from: '2026-01-01' }] },
    { id: 'trash', supplier: 'Ком. услуги', name: 'Вывоз мусора', unit: '₽', kind: 'common',
      tariffs: [{ logic: 'fixed', price: 607.56, who: ['t4'], from: '2026-01-01' }] },
    { id: 'kr', supplier: 'Фонд капремонта', name: 'Капитальный ремонт', unit: '₽', kind: 'owner',
      tariffs: [{ logic: 'whole', who: 'all', from: '2026-01-01' }] },
  ],
  bills: {
    p15: { ku: 5113.83, pesk: 20938.9, tekhw: 1382.78, kr: 1120 },
    k61: { ku: 5095.72, pesk: 15845.8, tekhw: 2147.94, kr: 967.84 },
    l120: { ku: 3200, tekhw: 203.94, kr: 980 },
  },
  readings: {
    t1: { pesk: { usage: 858.661 }, vkcw: { prev: 760, cur: 765 }, tekhw: { prev: 265, cur: 267 } },
    t2: { pesk: { usage: 960.69 }, vkcw: { prev: 749, cur: 752 }, tekhw: { prev: 470, cur: 472 } },
    t3: { pesk: { usage: 927.29 }, vkcw: { prev: 387, cur: 390 }, tekhw: { prev: 13, cur: 14 } },
    t4: { pesk: { usage: 259.845 }, vkcw: { prev: 643, cur: 647 }, tekhw: { prev: 28, cur: 30 } },
    t5: { 'peskflat:day': { prev: 8300, cur: 8440 }, 'peskflat:night': { prev: 4150, cur: 4220 },
      vkcw: { prev: 120, cur: 124 }, tekhw: { prev: 85, cur: 88 } },
  },
};

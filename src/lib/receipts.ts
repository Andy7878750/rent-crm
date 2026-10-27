/**
 * Квитанции объекта: виды (как плитки у vermieter1) и способы деления — понятные названия логик модуля расчёта.
 * Вид подставляет способ деления, единицу и поставщика по умолчанию; всё можно поменять в окне квитанции.
 */
import type { Logic, ServiceKind } from './calc/types.ts';

export type Resource = 'el' | 'cw' | 'hw' | 'heat' | 'gas' | 'other';

export type Category = {
  id: string; group: string; name: string; icon: string; unit: string; supplier: string; def: Logic;
  /** Ресурс счётчика (для подсказки «Счётчики объекта»). */
  resource?: Resource;
  /** Цена по умолчанию (из реальных квитанций СПб, 2026) — только подсказка в поле. */
  price?: string;
  inc: string[]; ex: string[]; tip: string;
};

export const CATEGORIES: Category[] = [
  { id: 'el', group: 'Электроэнергия', name: 'Электричество', icon: 'zap', unit: 'кВт·ч', supplier: 'ПЕСК', def: 'split', resource: 'el',
    inc: ['Электроэнергия по общему счётчику помещения', 'Потери и ОДН, если они в той же квитанции'], ex: ['ПЕСК', 'Петроэлектросбыт', 'Энергосбыт'],
    tip: 'Есть свои счётчики у арендаторов — делим сумму по их расходу. Нет — выберите «По долям».' },
  { id: 'cw', group: 'Вода', name: 'Холодная вода', icon: 'droplet', unit: 'м³', supplier: 'Водоканал', def: 'meter', resource: 'cw', price: '61,96',
    inc: ['Холодное водоснабжение по счётчикам арендаторов'], ex: ['Водоканал', 'ГУП «Водоканал СПб»'],
    tip: 'Каждому — его расход × цена. Если вводите сумму квитанции на объект — выберите «Счётчик × цена + остаток».' },
  { id: 'hw', group: 'Вода', name: 'Горячая вода', icon: 'droplets', unit: 'м³', supplier: 'ГУП ТЭК', def: 'meterRest', resource: 'hw', price: '67,98',
    inc: ['Горячее водоснабжение', 'Подогрев (Гкал) по нормативу — в той же квитанции'], ex: ['ГУП ТЭК', 'ТГК-1', 'Теплосеть'],
    tip: 'Подогрев по нормативу добавляется галочкой «Доп. начисление по нормативу».' },
  { id: 'dr', group: 'Вода', name: 'Водоотведение', icon: 'waves', unit: 'м³', supplier: 'Водоканал', def: 'derived', price: '72,59',
    inc: ['Канализация: объём = холодная + горячая вода'], ex: ['Водоотведение', 'Канализация'],
    tip: 'Расход берётся из квитанций воды этого объекта — отметьте, из каких.' },
  { id: 'heat', group: 'Тепло и газ', name: 'Отопление', icon: 'flame', unit: '₽', supplier: 'ГУП ТЭК', def: 'share', resource: 'heat',
    inc: ['Отопление помещения', 'Общедомовое отопление'], ex: ['ГУП ТЭК', 'ТГК-1'], tip: 'Обычно делится по площади, то есть по долям.' },
  { id: 'gas', group: 'Тепло и газ', name: 'Газ', icon: 'flame-kindling', unit: 'м³', supplier: 'Петербурггаз', def: 'share', resource: 'gas',
    inc: ['Газоснабжение'], ex: ['Петербурггаз', 'Газпром межрегионгаз'], tip: 'Без счётчиков у арендаторов — по долям.' },
  { id: 'uk', group: 'Дом и УК', name: 'Содержание и ремонт', icon: 'house', unit: '₽', supplier: 'УК', def: 'share',
    inc: ['Содержание и текущий ремонт', 'Уборка, лифт — если в квитанции УК', 'ОДН (электро, вода)'], ex: ['Управляющая компания', 'ТСЖ', 'ЖКС'],
    tip: 'Делится по долям. Доля пустующих частей остаётся на вас.' },
  { id: 'trash', group: 'Дом и УК', name: 'Вывоз мусора', icon: 'trash-2', unit: '₽', supplier: 'АО «НЭО»', def: 'fixed',
    inc: ['Вывоз твёрдых коммунальных отходов'], ex: ['АО «НЭО»', 'Региональный оператор'],
    tip: 'Для коммерции часто фиксированная сумма по договору у конкретного арендатора.' },
  { id: 'dom', group: 'Дом и УК', name: 'Домофон', icon: 'bell', unit: '₽', supplier: '', def: 'equal', inc: ['Обслуживание домофона'], ex: ['Домофон'], tip: 'Обычно поровну.' },
  { id: 'net', group: 'Связь и охрана', name: 'Интернет', icon: 'wifi', unit: '₽', supplier: '', def: 'equal', inc: ['Интернет, ТВ'], ex: ['Ростелеком', 'МТС'], tip: 'Обычно поровну.' },
  { id: 'sec', group: 'Связь и охрана', name: 'Охрана', icon: 'shield', unit: '₽', supplier: '', def: 'share', inc: ['Охрана, сигнализация'], ex: ['Охрана'], tip: 'По долям или поровну.' },
  { id: 'kr', group: 'Не перевыставляется', name: 'Капремонт', icon: 'hammer', unit: '₽', supplier: 'Фонд капремонта', def: 'whole',
    inc: ['Взнос собственника на капремонт'], ex: ['Фонд капремонта', 'Взнос на КР'], tip: 'Обязанность собственника, арендаторам не перевыставляется.' },
  { id: 'fine', group: 'Не перевыставляется', name: 'Пени', icon: 'circle-alert', unit: '₽', supplier: '', def: 'whole', inc: ['Пени за просрочку'], ex: ['Пени'], tip: 'Остаются на вас.' },
  { id: 'ins', group: 'Не перевыставляется', name: 'Страховка', icon: 'shield-check', unit: '₽', supplier: '', def: 'whole', inc: ['Страхование помещения'], ex: ['Страховка'], tip: 'Остаётся на вас.' },
];

export const OTHER: Category = { id: '', group: 'Другое', name: 'Другая квитанция', icon: 'file-text', unit: '₽', supplier: '', def: 'share', inc: [], ex: [], tip: 'Свой вид квитанции. Выберите, как делить.' };

export const category = (id: string): Category => CATEGORIES.find((c) => c.id === id) ?? OTHER;
export const GROUPS = [...new Set(CATEGORIES.map((c) => c.group))];

/** Способы деления в окне квитанции (порядок кнопок). 'norm' — только в старом разделе «Тарифы». */
export type Method = Exclude<Logic, 'norm'>;
export const METHODS: Record<Method, { label: string; formula: string; bill: boolean; read: '' | 'usage' | 'meter' | 'dn'; price?: boolean; fixed?: boolean }> = {
  share: { label: 'По долям', formula: 'Сумма квитанции × доля арендатора. Доля пустующих частей остаётся на вас.', bill: true, read: '' },
  equal: { label: 'Поровну', formula: 'Сумма квитанции делится поровну между теми, кто платит.', bill: true, read: '' },
  split: { label: 'По расходу', formula: 'Сумма квитанции делится пропорционально расходу каждого арендатора за месяц. Цена не нужна.', bill: true, read: 'usage' },
  meterRest: { label: 'Счётчик × цена + остаток', formula: 'Каждый платит свой расход × цену из квитанции. Остаток (общедомовое, потери) делится по долям.', bill: true, read: 'meter', price: true },
  meter: { label: 'Счётчик × цена', formula: 'Каждому — его расход × цена. Сумма квитанции на объект не нужна.', bill: false, read: 'meter', price: true },
  dn: { label: 'День / ночь', formula: 'Расход днём × дневная цена + ночью × ночная.', bill: false, read: 'dn', price: true },
  derived: { label: 'От других квитанций', formula: 'Расход берётся из отмеченных квитанций воды × цена (водоотведение = холодная + горячая).', bill: false, read: '', price: true },
  fixed: { label: 'Фиксированно', formula: 'Каждому — своя сумма в месяц, независимо от квитанции.', bill: false, read: '', fixed: true },
  whole: { label: 'Плачу сам', formula: 'Вся сумма остаётся на вас. Арендаторы эту квитанцию не видят.', bill: true, read: '' },
};
export const METHOD_ORDER: Method[] = ['share', 'equal', 'split', 'meterRest', 'meter', 'dn', 'derived', 'fixed', 'whole'];

/** Вид счёта для модуля расчёта по способу деления. */
export function kindOf(logic: Logic): ServiceKind {
  if (logic === 'whole') return 'owner';
  return ['share', 'equal', 'split', 'meterRest'].includes(logic) ? 'common' : 'indiv';
}

export const RESOURCES: Record<Resource, { label: string; unit: string; icon: string }> = {
  el: { label: 'Электричество', unit: 'кВт·ч', icon: 'zap' },
  cw: { label: 'Холодная вода', unit: 'м³', icon: 'droplet' },
  hw: { label: 'Горячая вода', unit: 'м³', icon: 'droplets' },
  heat: { label: 'Тепло', unit: 'Гкал', icon: 'flame' },
  gas: { label: 'Газ', unit: 'м³', icon: 'flame-kindling' },
  other: { label: 'Другое', unit: '', icon: 'gauge' },
};

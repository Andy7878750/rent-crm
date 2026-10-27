/** Справочник видов счёта и логик расчёта для интерфейса (подписи, формулы, какие поля нужны). */
import type { Logic, ServiceKind } from './types.ts';

export type LogicField = 'price' | 'price2' | 'norm' | 'normPrice' | 'extraName' | 'sources';

export const LOGICS: Record<Logic, { label: string; formula: string; fields: LogicField[]; required: LogicField[]; note?: string }> = {
  share: { label: 'Доля по квитанции', formula: 'сумма квитанции × доля арендатора', fields: [], required: [],
    note: 'Цена не нужна: каждый месяц вводится сумма по квитанции, она делится по долям.' },
  split: { label: 'Делится по показаниям', formula: 'сумма на объект ÷ расход всех арендаторов × свой расход', fields: [], required: [],
    note: 'Каждый месяц вводите сумму счёта на объект и расход каждого арендатора — цена месяца считается сама.' },
  meterRest: { label: 'Счётчики + остаток по долям', formula: 'свой расход × цена (+ норматив) + остаток × доля', fields: ['price', 'extraName', 'norm', 'normPrice'], required: ['price'],
    note: 'Остаток = счёт на объект − начисления по счётчикам всех арендаторов; делится по долям.' },
  equal: { label: 'Поровну', formula: 'сумма квитанции ÷ число платящих', fields: [], required: [],
    note: 'Каждый месяц вводится сумма по квитанции, она делится поровну между теми, кто платит.' },
  fixed: { label: 'Фиксированная сумма', formula: 'одна сумма в месяц', fields: ['price'], required: ['price'] },
  meter: { label: 'По счётчику', formula: 'расход × цена', fields: ['price'], required: ['price'] },
  dn: { label: 'День / ночь', formula: 'день × цена 1 + ночь × цена 2', fields: ['price', 'price2'], required: ['price', 'price2'] },
  derived: { label: 'От других услуг', formula: 'расход выбранных услуг × цена', fields: ['price', 'sources'], required: ['price', 'sources'] },
  norm: { label: 'С нормативом', formula: 'расход × норматив × цена', fields: ['price', 'norm', 'sources'], required: ['price', 'norm', 'sources'] },
  whole: { label: 'Вся сумма квитанции', formula: 'сумма квитанции на арендодателе', fields: [], required: [],
    note: 'Цена не нужна: каждый месяц вводится сумма по квитанции, её платит арендодатель.' },
};

export const KINDS: Record<ServiceKind, { label: string; hint: string; pill: string; logics: Logic[] }> = {
  common: { label: 'Общий счёт', hint: 'один счёт на объект, делится между арендаторами', pill: 'bg-ok-soft text-ok', logics: ['share', 'equal', 'split', 'meterRest', 'fixed'] },
  indiv: { label: 'Индивидуальный', hint: 'свой счётчик или своя сумма арендатора', pill: 'bg-accent-soft text-accent', logics: ['meter', 'dn', 'derived', 'norm', 'fixed'] },
  owner: { label: 'Только арендодатель', hint: 'арендаторы не видят', pill: 'bg-[#eef0f3] text-ink-2', logics: ['whole'] },
};

export const FIELD_LABEL: Record<LogicField, string> = {
  price: 'Цена, ₽ за единицу', price2: 'Цена ночь, ₽', norm: 'Норматив (например, Гкал на м³)', normPrice: 'Цена норматива, ₽',
  extraName: 'Название доп. начисления', sources: 'Расход каких услуг',
};

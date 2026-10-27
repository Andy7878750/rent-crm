/**
 * Типы модуля расчёта коммунальных платежей.
 * Модуль не зависит от базы данных и интерфейса: на входе данные месяца, на выходе — строки счёта.
 */

/** Вид счёта услуги (раздел 5 ТЗ). */
export type ServiceKind =
  | 'common' // Общий счёт: приходит на всё помещение и делится между арендаторами
  | 'indiv' // Индивидуальный: у арендатора свой счётчик или своя сумма
  | 'owner'; // Только арендодатель: арендаторы не видят

/** Логика расчёта тарифа (раздел 7 ТЗ). */
export type Logic =
  // Общий счёт
  | 'share' // Доля по квитанции: сумма квитанции × доля арендатора
  | 'split' // Делится по показаниям: сумма на объект ÷ расход всех × свой расход
  | 'meterRest' // Счётчики + остаток по долям
  | 'fixed' // Фиксированная сумма в месяц (и для индивидуального)
  | 'equal' // Поровну: сумма квитанции ÷ число платящих
  // Индивидуальный
  | 'meter' // По счётчику: расход × цена
  | 'dn' // День / ночь: день × цена 1 + ночь × цена 2
  | 'derived' // От других услуг: (расход выбранных услуг) × цена
  | 'norm' // С нормативом: расход × норматив × цена
  // Только арендодатель
  | 'whole'; // Вся сумма на арендодателе

export interface Tariff {
  logic: Logic;
  /** Основная цена (руб. за единицу или фиксированная сумма для 'fixed'). */
  price?: number;
  /** Цена ночной зоны для 'dn'. */
  price2?: number;
  /** Норматив (например, Гкал на м³) для 'norm' и 'meterRest'. */
  norm?: number;
  /** Цена единицы норматива для 'meterRest' (например, руб. за Гкал). */
  normPrice?: number;
  /** Название доп. начисления в 'meterRest', например «Подогрев ГВС». */
  extraName?: string;
  /** Услуги-источники расхода для 'derived' и 'norm'. */
  sources?: string[];
  /** Для кого: все арендаторы или список id арендаторов. */
  who: 'all' | string[];
  /** Действует с даты (включительно), формат YYYY-MM-DD. */
  from: string;
}

export interface Service {
  id: string;
  /** Объект, к которому привязана квитанция. Пусто — старая услуга аккаунта (действует по тарифу на любом объекте). */
  objectId?: string;
  /** Вид квитанции (электричество, вода…), см. src/lib/receipts.ts. */
  category?: string;
  supplier: string;
  name: string;
  unit: string;
  kind: ServiceKind;
  tariffs: Tariff[];
}

export interface Tenant {
  id: string;
  name: string;
  /** Доля помещения в процентах, например 45. */
  share: number;
}

export interface PropertyObject {
  id: string;
  name: string;
  /** Объект собственника: арендаторов нет, расчёта нет. */
  owner?: boolean;
  tenants: Tenant[];
}

/** Показание счётчика за месяц. Для 'split' достаточно usage (расход за месяц). */
export interface Reading {
  prev?: number;
  cur?: number;
  usage?: number;
}

export interface MonthInput {
  /** Расчётный месяц, YYYY-MM. */
  month: string;
  objects: PropertyObject[];
  /** Услуги в порядке, заданном арендодателем (стрелки ↑ ↓). */
  services: Service[];
  /** Суммы счетов поставщиков на помещение: bills[objectId][serviceId] = руб. */
  bills: Record<string, Record<string, number | undefined>>;
  /**
   * Показания: readings[tenantId][key]. key = serviceId,
   * для счётчика день/ночь — `${serviceId}:day` и `${serviceId}:night`.
   */
  readings: Record<string, Record<string, Reading | undefined>>;
}

export type LineGroup = 'common' | 'indiv' | 'fixed';

export interface BillLine {
  serviceId: string;
  group: LineGroup;
  label: string;
  /** Как посчитано, например «4 м³ × 61,96 руб.». */
  formula: string;
  /** Пояснение (например, как получилась цена месяца). */
  note?: string;
  /** Сумма в рублях, округлённая до копеек; null — не хватает данных. */
  amount: number | null;
}

export interface MeterUse {
  serviceId: string;
  label: string;
  unit: string;
  prev?: number;
  cur?: number;
  /** Расход; null — показание не внесено. */
  usage: number | null;
  /** Новое показание меньше прошлого. */
  negative: boolean;
}

export interface TenantBill {
  tenantId: string;
  objectId: string;
  lines: BillLine[];
  meters: MeterUse[];
  /** Итог = сумма округлённых строк. */
  total: number;
  /** Чего не хватает для расчёта (пусто — готов к счёту). */
  missing: string[];
  /** Сколько услуг привязано к арендатору. */
  serviceCount: number;
}

export interface OwnerLine {
  serviceId: string;
  label: string;
  amount: number | null;
}

export interface MonthResult {
  tenants: Record<string, TenantBill>;
  /** Что остаётся на арендодателе по каждому объекту. */
  owner: Record<string, { lines: OwnerLine[]; total: number }>;
}

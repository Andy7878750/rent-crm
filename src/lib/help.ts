/**
 * Места в интерфейсе, где может стоять «?». Администратор сервиса в «Настройки → Подсказки» задаёт текст и файл
 * и включает/выключает значок. Пока он ничего не менял — действуют text и on отсюда.
 */
import { KINDS, LOGICS } from './calc/logics.ts';
import type { Logic, ServiceKind } from './calc/types.ts';

type Entry = { key: string; section: string; label: string; text: string; on: boolean };

const kindTips: Entry[] = (Object.keys(KINDS) as ServiceKind[]).map((k) => ({
  key: `service.kind.${k}`, section: 'Услуга — варианты счёта', label: KINDS[k].label, text: `${KINDS[k].label}: ${KINDS[k].hint}.`, on: false,
}));
const logicTips: Entry[] = (Object.keys(LOGICS) as Logic[]).map((l) => ({
  key: `tariff.logic.${l}`, section: 'Тариф — логики расчёта', label: LOGICS[l].label,
  text: `Формула: ${LOGICS[l].formula}.${LOGICS[l].note ? ` ${LOGICS[l].note}` : ''}`, on: false,
}));

export const HELP: Entry[] = [
  { key: 'service.supplier', section: 'Услуга', label: 'Поставщик', on: true,
    text: 'Кто выставляет квитанцию: Водоканал, ПЕСК, ГУП ТЭК, управляющая компания. Напишите так же, как в квитанции — по поставщику группируются оплаты.' },
  { key: 'service.name', section: 'Услуга', label: 'Название', on: true,
    text: 'Строка квитанции, например «Холодная вода» или «Содержание и ремонт». Так она будет называться в расчёте и в отчёте арендатора.' },
  { key: 'service.unit', section: 'Услуга', label: 'Единица', on: true,
    text: 'В чём измеряется расход: кВт·ч, м³, Гкал. Для сумм без счётчика — ₽.' },
  { key: 'service.kind', section: 'Услуга', label: 'Счёт', on: true,
    text: 'Общий — один счёт на объект, делится между арендаторами. Индивидуальный — у каждого свой счётчик или своя сумма. Только арендодатель — платите вы, арендаторы не видят.' },
  ...kindTips,
  { key: 'tariff.logic', section: 'Тариф', label: 'Логика расчёта', on: true,
    text: 'Как считается сумма арендатора. Под кнопками показана формула выбранной логики.' },
  { key: 'tariff.price', section: 'Тариф', label: 'Цена', on: true,
    text: 'Цена за единицу из квитанции поставщика. Дробную часть — через запятую: 6,50.' },
  { key: 'tariff.price2', section: 'Тариф', label: 'Цена ночь', on: false, text: 'Ночной тариф из квитанции (для счётчиков день / ночь).' },
  { key: 'tariff.norm', section: 'Тариф', label: 'Норматив', on: false, text: 'Норматив на единицу расхода, например Гкал на 1 м³ горячей воды.' },
  { key: 'tariff.extraName', section: 'Тариф', label: 'Название доп. начисления', on: false, text: 'Как назвать строку норматива в расчёте, например «Подогрев ГВС».' },
  { key: 'tariff.sources', section: 'Тариф', label: 'Расход каких услуг', on: false, text: 'Из каких услуг берётся расход. Например, водоотведение = холодная + горячая вода.' },
  { key: 'tariff.who', section: 'Тариф', label: 'Для кого', on: true,
    text: '«Все арендаторы» — и те, кого добавите позже. Свои объекты (собственник) отмечаются отдельно.' },
  { key: 'tariff.from', section: 'Тариф', label: 'Действует с', on: true,
    text: 'С какой даты действует цена. Когда поставщик поднимет цену — добавьте «Ещё тариф» с новой датой, старые месяцы посчитаются по старой цене.' },
  ...logicTips,
];

export const HELP_KEYS: readonly string[] = HELP.map((h) => h.key);

export type HelpTip = { label: string; text: string; on: boolean; file: { name: string; type: string } | null };

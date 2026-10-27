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
    text: '«Все» — все арендаторы и собственники своих объектов, и те, кого добавите позже. Чтобы услуга была не у всех — снимите лишние галочки.' },
  { key: 'tariff.from', section: 'Тариф', label: 'Действует с', on: true,
    text: 'С какой даты действует цена. Когда поставщик поднимет цену — добавьте «Ещё тариф» с новой датой, старые месяцы посчитаются по старой цене.' },
  ...logicTips,
  // Форма объекта.
  { key: 'object.type', section: 'Объект', label: 'Тип', on: true,
    text: 'Квартира, нежилое помещение или свой вариант (склад, гараж, дом). Свой тип добавляется в конце списка и запоминается.' },
  { key: 'object.short', section: 'Объект', label: 'Короткое название', on: true,
    text: 'Как объект будет называться в меню, отчётах и оплатах, например «Королёва 61». Коротко, чтобы легко найти.' },
  { key: 'object.address', section: 'Объект', label: 'Адрес', on: false, text: 'Полный адрес объекта — для отчёта арендатора.' },
  { key: 'object.floor', section: 'Объект', label: 'Этаж', on: false, text: 'Этаж или номер помещения, если нужно.' },
  { key: 'object.ukName', section: 'Объект', label: 'УК / ТСЖ', on: true,
    text: 'Управляющая компания или ТСЖ, которая выставляет квитанцию за содержание. Видна на карточке объекта.' },
  { key: 'object.ukPhone', section: 'Объект', label: 'Телефон УК / ТСЖ', on: false,
    text: 'Российский номер — просто цифрами, иностранный — начните с «+» и кода страны.' },
  { key: 'object.ukEmail', section: 'Объект', label: 'Почта УК / ТСЖ', on: false,
    text: 'Почта для связи с УК, если у неё нет личного кабинета.' },
  { key: 'object.cabinetUrl', section: 'Объект', label: 'Личный кабинет', on: true,
    text: 'Ссылка на личный кабинет УК или поставщика, где вы смотрите квитанции. Откроется в один клик из «Посмотреть».' },
  { key: 'object.cabinetLogin', section: 'Объект', label: 'Логин', on: false, text: 'Логин от личного кабинета.' },
  { key: 'object.cabinetHint', section: 'Объект', label: 'Подсказка к паролю', on: true,
    text: 'Сам пароль мы не храним — запишите подсказку, которая напомнит его только вам.' },
  { key: 'object.users', section: 'Объект — кто пользуется', label: 'Кто пользуется объектом', on: true,
    text: 'Арендаторы — сдаёте объект, коммуналка делится между арендаторами по долям и показаниям. Собственник — объект ваш (например, дом): те же услуги и расчёт, но без выставления счетов.' },
  { key: 'tenant.name', section: 'Объект — кто пользуется', label: 'Имя или название', on: false, text: 'Имя арендатора или название организации — так будет в счёте.' },
  { key: 'tenant.share', section: 'Объект — кто пользуется', label: 'Доля, %', on: true,
    text: 'Какую часть помещения занимает арендатор. По долям делятся общие счета. Сумма долей всех арендаторов — не больше 100%, остаток остаётся на вас.' },
  { key: 'tenant.phone', section: 'Объект — кто пользуется', label: 'Телефон', on: false, text: 'Телефон арендатора для связи.' },
  { key: 'tenant.email', section: 'Объект — кто пользуется', label: 'Почта (для счёта)', on: true, text: 'Куда отправлять счёт арендатору.' },
  { key: 'tenant.contract', section: 'Объект — кто пользуется', label: 'Договор', on: false, text: 'Номер и дата договора аренды — для отчёта.' },
  { key: 'tenant.contractEnd', section: 'Объект — кто пользуется', label: 'Договор до', on: false, text: 'Когда заканчивается договор аренды.' },
];

export const HELP_KEYS: readonly string[] = HELP.map((h) => h.key);

export type HelpTip = { label: string; text: string; on: boolean; file: { name: string; type: string } | null };

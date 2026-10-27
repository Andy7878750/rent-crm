import 'server-only';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { schema } from '@/db';
import { shiftMonth } from '@/lib/month';

type Tx = Parameters<Parameters<NodePgDatabase<typeof schema>['transaction']>[0]>[0];

/**
 * Пример для нового аккаунта (ТЗ, раздел 3): объект с двумя арендаторами, услуги с тарифами,
 * счета на помещение и показания за расчётный месяц. Цифры — из реальных квитанций (Королёва 61).
 */
export async function createExample(tx: Tx, accountId: string, month: string) {
  const [obj] = await tx.insert(schema.objects).values({
    accountId, type: 'nonres', short: 'Королёва 61', isExample: true,
    address: 'г. Санкт-Петербург, пр-кт Королёва, д. 61, помещ. 24-Н',
  }).returning({ id: schema.objects.id });

  const [t1, t2] = await tx.insert(schema.tenants).values([
    { objectId: obj.id, name: 'Жаркофф', share: '55', phone: '+7 (900) 000-00-03', sort: 0 },
    { objectId: obj.id, name: 'Салон Эгоист', share: '45', phone: '+7 (900) 000-00-04', sort: 1 },
  ]).returning({ id: schema.tenants.id });

  // Квитанции объекта: вид (src/lib/receipts.ts), поставщик, строка, единица.
  const svc = async (sort: number, category: string, supplier: string, name: string, unit: string, kind: 'common' | 'indiv' | 'owner') =>
    (await tx.insert(schema.services).values({ accountId, objectId: obj.id, category, supplier, name, unit, kind, sort }).returning({ id: schema.services.id }))[0].id;

  const ku = await svc(0, 'uk', 'УК', 'Содержание и ремонт', '₽', 'common');
  const pesk = await svc(1, 'el', 'ПЕСК', 'Электричество', 'кВт·ч', 'common');
  const cw = await svc(2, 'cw', 'Водоканал', 'Холодная вода', 'м³', 'indiv');
  const hw = await svc(3, 'hw', 'ГУП ТЭК', 'Горячая вода', 'м³', 'common');
  const dr = await svc(4, 'dr', 'Водоканал', 'Водоотведение', 'м³', 'indiv');
  const trash = await svc(5, 'trash', 'АО «НЭО»', 'Вывоз мусора', '₽', 'common');
  const kr = await svc(6, 'kr', 'Фонд капремонта', 'Капитальный ремонт', '₽', 'owner');

  const from = `${shiftMonth(month, -6)}-01`;
  const tariff = async (serviceId: string, v: Partial<typeof schema.tariffs.$inferInsert> & { logic: typeof schema.tariffs.$inferInsert['logic'] }, who?: string[]) => {
    const [t] = await tx.insert(schema.tariffs).values({ serviceId, validFrom: from, whoAll: !who, ...v }).returning({ id: schema.tariffs.id });
    if (who) await tx.insert(schema.tariffTenants).values(who.map((tenantId) => ({ tariffId: t.id, tenantId })));
  };
  await tariff(ku, { logic: 'share' });
  await tariff(pesk, { logic: 'split' });
  await tariff(cw, { logic: 'meter', price: '61.96' });
  await tariff(hw, { logic: 'meterRest', price: '67.98', extraName: 'Подогрев ГВС', norm: '0.06', normPrice: '4628.57' });
  await tariff(dr, { logic: 'derived', price: '72.59', sources: [cw, hw] });
  await tariff(trash, { logic: 'fixed', price: '607.56' }, [t2.id]);
  await tariff(kr, { logic: 'whole' });

  await tx.insert(schema.objectBills).values([
    { objectId: obj.id, serviceId: ku, month, amount: '5095.72' },
    { objectId: obj.id, serviceId: pesk, month, amount: '15845.80' },
    { objectId: obj.id, serviceId: hw, month, amount: '2147.94' },
    { objectId: obj.id, serviceId: kr, month, amount: '967.84' },
  ]);
  await tx.insert(schema.readings).values([
    { tenantId: t1.id, serviceId: pesk, month, usage: '927.29' },
    { tenantId: t1.id, serviceId: cw, month, prev: '387', cur: '390' },
    { tenantId: t1.id, serviceId: hw, month, prev: '13', cur: '14' },
    { tenantId: t2.id, serviceId: pesk, month, usage: '259.845' },
    { tenantId: t2.id, serviceId: cw, month, prev: '643', cur: '647' },
    { tenantId: t2.id, serviceId: hw, month, prev: '28', cur: '30' },
  ]);
  await tx.insert(schema.meters).values([
    { objectId: obj.id, resource: 'el', number: '', place: 'общий, ВРУ', sort: 0 },
    { objectId: obj.id, tenantId: t1.id, resource: 'el', number: '', sort: 1 },
    { objectId: obj.id, tenantId: t2.id, resource: 'el', number: '', sort: 2 },
  ]);
  return obj.id;
}

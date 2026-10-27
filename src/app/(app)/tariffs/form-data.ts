import 'server-only';
import { listObjects, loadServices, readAccountList } from '@/lib/data';

/** Поставщики, которые есть в списке всегда. */
export const BASE_SUPPLIERS = ['Управляющая компания', 'АО «НЭО»'];

/** Данные для формы услуги: объекты с арендаторами и другие услуги (источники расхода). */
export async function formData(accountId: string, exceptId?: string) {
  const [objects, services, saved] = await Promise.all([listObjects(accountId), loadServices(accountId), readAccountList(accountId, 'suppliers')]);
  const used = [...new Set(services.map((s) => s.supplier))].filter((x) => !BASE_SUPPLIERS.includes(x));
  return {
    services,
    // Список «Поставщик»: базовые, уже используемые в услугах, свои добавленные (их можно удалить).
    suppliers: [
      ...BASE_SUPPLIERS.map((v) => ({ value: v, removable: false })),
      ...used.map((v) => ({ value: v, removable: false })),
      ...saved.filter((v) => !BASE_SUPPLIERS.includes(v) && !used.includes(v)).map((v) => ({ value: v, removable: true })),
    ],
    objects: objects.map((o) => ({ id: o.id, name: o.short, owner: o.isOwner, tenants: o.tenants.map((t) => ({ id: t.id, name: t.name })) })),
    others: services.filter((s) => s.id !== exceptId && s.kind !== 'owner').map((s) => ({ id: s.id, supplier: s.supplier, name: s.name, unit: s.unit })),
  };
}

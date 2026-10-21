import 'server-only';
import { listObjects, loadServices } from '@/lib/data';

/** Данные для формы услуги: объекты с арендаторами и другие услуги (источники расхода). */
export async function formData(accountId: string, exceptId?: string) {
  const [objects, services] = await Promise.all([listObjects(accountId), loadServices(accountId)]);
  return {
    services,
    objects: objects.filter((o) => !o.isOwner).map((o) => ({ id: o.id, name: o.short, tenants: o.tenants.map((t) => ({ id: t.id, name: t.name })) })),
    others: services.filter((s) => s.id !== exceptId && s.kind !== 'owner').map((s) => ({ id: s.id, supplier: s.supplier, name: s.name, unit: s.unit })),
  };
}

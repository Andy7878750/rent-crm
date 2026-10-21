import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { defaultMonth } from '@/lib/month';
import { ServiceForm } from '../service-form';
import { formData } from '../form-data';

export const metadata = { title: 'Изменить услугу' };

const s = (n?: number) => (n === undefined ? '' : String(n).replace('.', ','));

export default async function EditServicePage({ params }: PageProps<'/tariffs/[id]'>) {
  const { id } = await params;
  const user = await requireUser();
  const { services, objects, others } = await formData(user.accountId, id);
  const svc = services.find((x) => x.id === id);
  if (!svc) notFound();
  return (
    <>
      <h1 className="text-[22px] font-bold">{svc.supplier} — {svc.name}</h1>
      <ServiceForm defaultFrom={`${defaultMonth()}-01`} serviceId={svc.id} objects={objects} others={others} initial={{
        supplier: svc.supplier, name: svc.name, unit: svc.unit, kind: svc.kind,
        tariffs: [...svc.tariffs].sort((a, b) => a.from.localeCompare(b.from)).map((t) => ({
          logic: t.logic, price: s(t.price), price2: s(t.price2), norm: s(t.norm), normPrice: s(t.normPrice),
          extraName: t.extraName ?? '', sources: t.sources ?? [], whoAll: t.who === 'all', who: t.who === 'all' ? [] : t.who, validFrom: t.from,
        })),
      }} />
    </>
  );
}

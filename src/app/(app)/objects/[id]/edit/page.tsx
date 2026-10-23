import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { getObject } from '@/lib/data';
import { ObjectForm } from '../../object-form';
import { archiveObject } from '../../actions';

export const metadata = { title: 'Изменить объект' };

export default async function EditObjectPage({ params }: PageProps<'/objects/[id]/edit'>) {
  const { id } = await params;
  const user = await requireUser();
  const o = await getObject(user.accountId, id);
  if (!o) notFound();
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-[22px] font-bold">Изменить объект</h1>
        <div className="flex-1" />
        <form action={archiveObject.bind(null, o.id)}>
          <button className="btn text-bad">Убрать в архив</button>
        </form>
      </div>
      <ObjectForm objectId={o.id} cancelHref={`/objects/${o.id}`} initial={{
        type: o.type, typeLabel: o.typeLabel, short: o.short, address: o.address, floor: o.floor, ukName: o.ukName, ukPhone: o.ukPhone,
        cabinetUrl: o.cabinetUrl, cabinetLogin: o.cabinetLogin, cabinetHint: o.cabinetHint, isOwner: o.isOwner,
        tenants: o.tenants.map((t) => ({ id: t.id, name: t.name, share: String(Number(t.share)).replace('.', ','), phone: t.phone, email: t.email, contract: t.contract, contractEnd: t.contractEnd ?? '' })),
      }} />
    </>
  );
}

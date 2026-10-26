import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { getObject } from '@/lib/data';
import { ObjectForm } from '../../object-form';
import { archiveObject } from '../../actions';
import { readObjectTypes } from '@/lib/data';

export const metadata = { title: 'Изменить объект' };

export default async function EditObjectPage({ params }: PageProps<'/objects/[id]/edit'>) {
  const { id } = await params;
  const user = await requireUser();
  const o = await getObject(user.accountId, id);
  if (!o) notFound();
  const customTypes = await readObjectTypes(user.accountId);
  return (
    <>
      <h1 className="pr-11 text-[22px] font-bold">Изменить объект</h1>
      <ObjectForm archive={archiveObject.bind(null, o.id)} customTypes={customTypes} objectId={o.id} cancelHref={`/objects/${o.id}`} initial={{
        type: o.type, typeLabel: o.typeLabel, short: o.short, address: o.address, floor: o.floor, ukName: o.ukName, ukPhone: o.ukPhone,
        cabinetUrl: o.cabinetUrl, cabinetLogin: o.cabinetLogin, cabinetHint: o.cabinetHint, isOwner: o.isOwner,
        tenants: o.isOwner ? [] : o.tenants.map((t) => ({ id: t.id, name: t.name, share: String(Number(t.share)).replace('.', ','), phone: t.phone, email: t.email, contract: t.contract, contractEnd: t.contractEnd ?? '' })),
      }} />
    </>
  );
}

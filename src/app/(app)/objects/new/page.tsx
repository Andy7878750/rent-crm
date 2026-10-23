import { requireUser } from '@/lib/auth/session';
import { ObjectForm } from '../object-form';
import { readObjectTypes } from '@/lib/data';

export const metadata = { title: 'Новый объект' };

export default async function NewObjectPage() {
  const user = await requireUser();
  const customTypes = await readObjectTypes(user.accountId);
  return (
    <>
      <h1 className="text-[22px] font-bold">Новый объект</h1>
      <ObjectForm customTypes={customTypes} objectId={null} cancelHref="/objects" initial={{
        type: 'nonres', typeLabel: '', short: '', address: '', floor: '', ukName: '', ukPhone: '', cabinetUrl: '', cabinetLogin: '', cabinetHint: '', isOwner: false, tenants: [],
      }} />
    </>
  );
}

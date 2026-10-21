import { ObjectForm } from '../object-form';

export const metadata = { title: 'Новый объект' };

export default function NewObjectPage() {
  return (
    <>
      <h1 className="text-[22px] font-bold">Новый объект</h1>
      <ObjectForm objectId={null} cancelHref="/objects" initial={{
        type: 'nonres', short: '', address: '', floor: '', ukName: '', ukPhone: '', cabinetUrl: '', cabinetLogin: '', cabinetHint: '', isOwner: false, tenants: [],
      }} />
    </>
  );
}

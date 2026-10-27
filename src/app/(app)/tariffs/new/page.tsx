import { requireUser } from '@/lib/auth/session';
import { defaultMonth } from '@/lib/month';
import { ServiceForm } from '../service-form';
import { formData } from '../form-data';

export const metadata = { title: 'Новая услуга' };

export default async function NewServicePage() {
  const user = await requireUser();
  const { objects, others, suppliers } = await formData(user.accountId);
  const from = `${defaultMonth()}-01`;
  return (
    <>
      <h1 className="text-[22px] font-bold">Новая услуга</h1>
      <ServiceForm suppliers={suppliers} defaultFrom={`${defaultMonth()}-01`} serviceId={null} objects={objects} others={others} initial={{
        supplier: 'Управляющая компания', name: '', unit: '', kind: 'indiv',
        tariffs: [{ logic: 'meter', price: '', price2: '', norm: '', normPrice: '', extraName: '', sources: [], whoAll: true, who: [], validFrom: from }],
      }} />
    </>
  );
}

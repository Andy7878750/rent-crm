import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { requireUser } from '@/lib/auth/session';
import { readRequisites } from '@/lib/requisites';
import { RequisitesForm } from './requisites-form';

export const metadata = { title: 'Реквизиты' };

export default async function RequisitesPage() {
  const user = await requireUser();
  const [acc] = await db.select({ requisites: schema.accounts.requisites }).from(schema.accounts).where(eq(schema.accounts.id, user.accountId)).limit(1);
  return (
    <>
      <h1 className="text-[22px] font-bold">Реквизиты</h1>
      <p className="text-[13px] text-muted">Эти данные подставляются внизу отчёта для арендатора (PDF).</p>
      <RequisitesForm initial={readRequisites(acc?.requisites, user.name)} />
    </>
  );
}

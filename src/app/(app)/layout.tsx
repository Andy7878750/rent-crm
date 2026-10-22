import { requireUser } from '@/lib/auth/session';
import { listObjects } from '@/lib/data';
import { Shell } from './shell';
import { VerifyBanner } from './verify-banner';
import { mailReady } from '@/lib/mail';

export default async function AppLayout({ children }: LayoutProps<'/'>) {
  const user = await requireUser();
  const objects = await listObjects(user.accountId);
  return (
    <Shell user={{ name: user.name, accountName: user.accountName }}
      objects={objects.map((o) => ({ id: o.id, name: o.short, count: o.isOwner ? null : o.tenants.length }))}>
      {!user.emailVerified && mailReady() && <VerifyBanner email={user.email} />}
      {children}
    </Shell>
  );
}

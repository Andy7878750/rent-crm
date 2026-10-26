import { requireUser } from '@/lib/auth/session';
import { listObjects, loadHelpTips } from '@/lib/data';
import { HelpProvider } from '@/components/help';
import { isServiceAdmin } from '@/lib/auth/admin';
import { Shell } from './shell';
import { VerifyBanner } from './verify-banner';
import { mailReady } from '@/lib/mail';

export default async function AppLayout({ children, modal }: { children: React.ReactNode; modal: React.ReactNode }) {
  const user = await requireUser();
  const [objects, tips] = await Promise.all([listObjects(user.accountId), loadHelpTips()]);
  return (
    <HelpProvider tips={tips} admin={isServiceAdmin(user.email)}>
    <Shell user={{ name: user.name, accountName: user.accountName }}
      objects={objects.map((o) => ({ id: o.id, name: o.short, count: o.isOwner ? null : o.tenants.length }))}>
      {!user.emailVerified && mailReady() && <VerifyBanner email={user.email} />}
      {children}
      {modal}
    </Shell>
    </HelpProvider>
  );
}

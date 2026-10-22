import Link from 'next/link';
import { peekToken } from '@/lib/auth/tokens';
import { ResetForm } from './reset-form';

export const metadata = { title: 'Новый пароль' };

export default async function ResetPage({ searchParams }: PageProps<'/reset'>) {
  const t = String((await searchParams).t ?? '');
  if (!(await peekToken(t, 'reset'))) {
    return (
      <section aria-label="Новый пароль" className="card w-full max-w-[420px] p-8 shadow-card">
        <h1 className="text-[22px] font-bold">Ссылка не действует</h1>
        <p className="mb-6 mt-1.5 leading-relaxed text-muted">Она устарела (действует 1 час) или уже была использована. Запросите новую.</p>
        <Link href="/forgot" className="btn btn-primary w-full">Запросить новую ссылку</Link>
      </section>
    );
  }
  return <ResetForm token={t} />;
}

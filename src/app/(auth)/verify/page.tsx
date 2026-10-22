import Link from 'next/link';
import { eq } from 'drizzle-orm';
import { db, schema } from '@/db';
import { consumeToken } from '@/lib/auth/tokens';

export const metadata = { title: 'Подтверждение почты' };

export default async function VerifyPage({ searchParams }: PageProps<'/verify'>) {
  const userId = await consumeToken(String((await searchParams).t ?? ''), 'verify');
  if (userId) await db.update(schema.users).set({ emailVerifiedAt: new Date() }).where(eq(schema.users.id, userId));
  return (
    <section aria-label="Подтверждение почты" className="card w-full max-w-[420px] p-8 shadow-card">
      <h1 className="text-[22px] font-bold">{userId ? 'Почта подтверждена' : 'Ссылка не действует'}</h1>
      <p className="mb-6 mt-1.5 leading-relaxed text-muted">
        {userId ? 'Спасибо! Теперь вы сможете восстановить пароль, если забудете его.'
          : 'Она устарела или уже использована. Войдите — в приложении можно отправить письмо ещё раз.'}
      </p>
      <Link href="/objects" className="btn btn-primary w-full">Перейти в Расчётку</Link>
    </section>
  );
}

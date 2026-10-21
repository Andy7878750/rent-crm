import Link from 'next/link';

export const metadata = { title: 'Восстановление пароля' };

export default function ForgotPage() {
  return (
    <section aria-label="Восстановление пароля" className="card w-full max-w-[420px] p-8 shadow-card">
      <h1 className="text-[22px] font-bold">Забыли пароль?</h1>
      <p className="mb-6 mt-1.5 leading-relaxed text-muted">
        Восстановление по почте заработает, когда подключим отправку писем. Пока напишите в поддержку — поможем вручную.
      </p>
      <Link href="/login" className="btn w-full">← Вернуться ко входу</Link>
    </section>
  );
}

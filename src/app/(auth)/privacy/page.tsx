import Link from 'next/link';

export const metadata = { title: 'Политика конфиденциальности' };

export default function PrivacyPage() {
  return (
    <section className="card w-full max-w-[640px] p-8 shadow-card">
      <h1 className="text-[22px] font-bold">Политика конфиденциальности</h1>
      <p className="mt-3 leading-relaxed text-ink-2">
        Черновик документа готовится (ТЗ, раздел 16). До запуска для других арендодателей текст проверит юрист,
        здесь будут политика обработки персональных данных и согласие на обработку.
      </p>
      <Link href="/register" className="btn mt-6">← Назад</Link>
    </section>
  );
}

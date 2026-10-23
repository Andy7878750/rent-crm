import { Check } from 'lucide-react';
import { Logo } from '@/components/logo';

const perks = [
  { t: 'Сам делит общие счета', d: 'По долям, по показаниям счётчиков или «счётчики + остаток» — как вы считали в Excel.' },
  { t: 'Отчёт PDF для каждого арендатора', d: 'Понятная разбивка: услуга, как посчитано, сумма.' },
  { t: 'Кто что оплатил', d: 'Счета арендаторам и оплаты поставщикам в одном месте, долги видны сразу.' },
];

export default function AuthLayout({ children }: LayoutProps<'/'>) {
  return (
    <div className="flex min-h-screen">
      <aside aria-label="О сервисе" className="hidden min-w-0 flex-[1_1_520px] flex-col gap-7 border-r border-line bg-white px-14 py-12 lg:flex">
        <Logo />
        <div>
          <h1 className="max-w-[460px] text-[30px] font-bold leading-tight">Коммуналка арендаторов — без Excel</h1>
          <p className="mt-3 max-w-[460px] text-[15px] leading-relaxed text-ink-2">
            Вносите показания и счета поставщиков — сервис сам разделит суммы, соберёт отчёт для каждого арендатора и покажет, кто что оплатил.
          </p>
        </div>
        <ul className="flex max-w-[520px] flex-col gap-3.5">
          {perks.map((p) => (
            <li key={p.t} className="flex items-start gap-3">
              <span className="flex size-8 flex-none items-center justify-center rounded-lg bg-[#f1f4f7] text-accent"><Check size={16} strokeWidth={2.4} /></span>
              <span><b className="font-semibold">{p.t}</b><span className="mt-0.5 block text-muted">{p.d}</span></span>
            </li>
          ))}
        </ul>
        <div className="mt-auto hint">Данные хранятся на серверах в России.</div>
      </aside>
      <main className="flex min-w-0 flex-[1_1_480px] flex-col px-4 pb-8 pt-5">
        <div className="lg:hidden"><Logo size={28} /></div>
        <div className="flex flex-1 items-center justify-center py-6">{children}</div>
        <div className="text-center hint">© 2026 Расчётка</div>
      </main>
    </div>
  );
}

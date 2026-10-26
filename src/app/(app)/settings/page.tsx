import Link from 'next/link';
import { CircleHelp, Users } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { isServiceAdmin } from '@/lib/auth/admin';

export const metadata = { title: 'Настройки' };

export default async function SettingsPage() {
  const user = await requireUser();
  const admin = isServiceAdmin(user.email);
  return (
    <>
      <h1 className="text-[22px] font-bold">Настройки</h1>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
        {admin && (
          <Link href="/settings/help" className="card flex gap-3 p-4 shadow-card transition hover:border-cta">
            <span className="flex size-9 flex-none items-center justify-center rounded-[9px] bg-cta-soft text-cta-ink"><CircleHelp size={19} /></span>
            <span><b className="block font-semibold">Подсказки «?»</b><span className="hint">Тексты и файлы-примеры у полей форм. Видны всем пользователям сервиса.</span></span>
          </Link>
        )}
        <div className="card flex gap-3 p-4 opacity-70">
          <span className="flex size-9 flex-none items-center justify-center rounded-[9px] bg-accent-soft text-accent"><Users size={19} /></span>
          <span><b className="block font-semibold">Сотрудники и меню</b><span className="hint">В разработке: приглашение до 3 сотрудников и выбор пунктов меню.</span></span>
        </div>
      </div>
    </>
  );
}

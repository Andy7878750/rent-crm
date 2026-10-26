import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth/session';
import { isServiceAdmin } from '@/lib/auth/admin';
import { loadHelpTips } from '@/lib/data';
import { HELP } from '@/lib/help';
import { TipForm } from './tip-form';

export const metadata = { title: 'Подсказки' };

/** Подсказки «?» для всех пользователей сервиса. Только администратор сервиса. */
export default async function HelpSettingsPage() {
  const user = await requireUser();
  if (!isServiceAdmin(user.email)) notFound();
  const tips = await loadHelpTips();
  const sections = [...new Set(HELP.map((h) => h.section))];
  return (
    <>
      <h1 className="text-[22px] font-bold">Подсказки «?»</h1>
      <p className="max-w-[820px] text-[13px] text-muted">
        Текст и файл (картинка-пример или PDF до 5 МБ) появляются при наведении на «?» рядом с полем — у всех пользователей сервиса.
        Галочка «Показывать «?»» включает и выключает значок сразу. Менять подсказки можете только вы как администратор сервиса.
      </p>
      {sections.map((sec) => (
        <section key={sec} className="card overflow-hidden">
          <div className="eyebrow border-b border-line bg-[#f6f8fb] px-4 py-2.5">{sec}</div>
          {HELP.filter((h) => h.section === sec).map((h) => (
            <TipForm key={h.key} k={h.key} label={h.label} text={tips[h.key].text} file={tips[h.key].file} defaultText={h.text} on={tips[h.key].on} />
          ))}
        </section>
      ))}
    </>
  );
}

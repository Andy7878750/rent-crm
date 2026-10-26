import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Pencil } from 'lucide-react';
import { requireUser } from '@/lib/auth/session';
import { getObject } from '@/lib/data';
import { formatPhone } from '@/lib/phone';
import { CancelButton } from '../../../modal';
import { Secret } from './secret';

export const metadata = { title: 'Объект' };

const TYPE = { nonres: 'Нежилое помещение', flat: 'Квартира', other: 'Другое' } as const;
const dash = (v?: string | null) => (v && v.trim() ? v : '—');
const ru = (d?: string | null) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : '—');

/** «Посмотреть»: все данные объекта таблицей, без редактирования. */
export default async function ObjectInfoPage({ params }: PageProps<'/objects/[id]/info'>) {
  const { id } = await params;
  const user = await requireUser();
  const o = await getObject(user.accountId, id);
  if (!o) notFound();

  const rows: Array<[string, React.ReactNode]> = [
    ['Тип', o.type === 'other' && o.typeLabel ? o.typeLabel : TYPE[o.type]],
    ['Короткое название', o.short],
    ['Адрес', dash(o.address)],
    ['Этаж', dash(o.floor)],
    ['УК / ТСЖ', dash(o.ukName)],
    ['Телефон УК / ТСЖ', o.ukPhone ? <a href={`tel:${o.ukPhone.replace(/[^\d+]/g, '')}`} className="hover:underline">{formatPhone(o.ukPhone)}</a> : '—'],
    ['Личный кабинет', o.cabinetUrl ? <a href={/^https?:\/\//.test(o.cabinetUrl) ? o.cabinetUrl : `https://${o.cabinetUrl}`} target="_blank" rel="noreferrer" className="break-all text-cta-ink hover:underline">{o.cabinetUrl}</a> : '—'],
    ['Логин', dash(o.cabinetLogin)],
    ['Подсказка к паролю', <Secret key="h" value={o.cabinetHint} />],
  ];

  return (
    <>
      <h1 className="pr-11 text-[22px] font-bold">{o.short}</h1>
      <section className="card overflow-hidden">
        <div className="eyebrow border-b border-line bg-[#f6f8fb] px-4 py-2.5">Объект и УК / ТСЖ</div>
        <dl className="divide-y divide-[#edf0f5]">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 px-4 py-2.5 sm:grid-cols-[200px_1fr] sm:gap-4">
              <dt className="text-[13px] text-muted">{k}</dt><dd className="min-w-0 text-[14px]">{v}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="card overflow-hidden">
        <div className="eyebrow border-b border-line bg-[#f6f8fb] px-4 py-2.5">Кто пользуется объектом</div>
        {o.isOwner ? (
          <p className="px-4 py-3 text-[14px]">Собственник</p>
        ) : o.tenants.length === 0 ? (
          <p className="px-4 py-3 text-[14px] text-muted">Арендаторов пока нет</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-[14px]">
              <thead className="text-[12px] text-muted">
                <tr className="border-b border-[#edf0f5]">
                  {['Имя или название', 'Доля', 'Телефон', 'Почта', 'Договор', 'Договор до'].map((h) => <th key={h} className="px-4 py-2 font-normal">{h}</th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#edf0f5]">
                {o.tenants.map((t) => (
                  <tr key={t.id}>
                    <td className="px-4 py-2.5 font-semibold">{t.name}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{String(Number(t.share)).replace('.', ',')}%</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{t.phone ? formatPhone(t.phone) : '—'}</td>
                    <td className="px-4 py-2.5">{dash(t.email)}</td>
                    <td className="px-4 py-2.5">{dash(t.contract)}</td>
                    <td className="px-4 py-2.5 whitespace-nowrap">{ru(t.contractEnd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="flex gap-2">
        <Link href={`/objects/${o.id}/edit`} className="btn btn-primary"><Pencil size={16} /> Изменить</Link>
        <CancelButton href="/objects" label="Закрыть" />
      </div>
    </>
  );
}

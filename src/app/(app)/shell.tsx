'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Building2, ChartColumn, FileText, LibraryBig, LogOut, Settings } from 'lucide-react';
import { logout } from '../(auth)/actions';

type NavObj = { id: string; name: string; count: number | null };
type Section = 'obj' | 'bills' | 'refs' | 'rep' | 'set';

const SECTIONS: Array<{ id: Section; label: string; href: string; icon: React.ElementType; match: string[] }> = [
  { id: 'obj', label: 'Объекты', href: '/objects', icon: Building2, match: ['/objects'] },
  { id: 'bills', label: 'Счета', href: '/bills', icon: FileText, match: ['/bills'] },
  { id: 'refs', label: 'Справочники', href: '/tariffs', icon: LibraryBig, match: ['/tariffs', '/requisites'] },
  { id: 'rep', label: 'Отчёты', href: '/reports/payments', icon: ChartColumn, match: ['/reports'] },
];

const PANEL: Record<Exclude<Section, 'obj'>, { title: string; items: Array<{ href: string; label: string }> }> = {
  bills: { title: 'Счета', items: [{ href: '/bills', label: 'К выставлению' }, { href: '/bills/issued', label: 'Выставленные' }] },
  refs: { title: 'Справочники', items: [{ href: '/tariffs', label: 'Тарифы и услуги' }, { href: '/requisites', label: 'Реквизиты' }] },
  rep: { title: 'Отчёты', items: [
    { href: '/reports/payments', label: 'Оплаты поставщикам' },
    { href: '/reports/months', label: 'Итоги по месяцам' },
    { href: '/reports/usage', label: 'Расход по счётчикам' }] },
  set: { title: 'Настройки', items: [{ href: '/settings', label: 'Сотрудники и меню' }] },
};

const navCls = (on: boolean) =>
  `flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-[14px] ${on ? 'bg-[#e3eaf7] font-semibold text-nav' : 'text-[#3a475d] hover:bg-[#eef1f6]'}`;

export function Shell({ user, objects, children }: { user: { name: string; accountName: string }; objects: NavObj[]; children: React.ReactNode }) {
  const path = usePathname();
  const sec: Section = path.startsWith('/settings') ? 'set' : (SECTIONS.find((s) => s.match.some((m) => path.startsWith(m)))?.id ?? 'obj');
  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  const railBtn = (id: Section, label: string, href: string, Icon: React.ElementType) => (
    <Link key={id} href={href} aria-current={sec === id ? 'page' : undefined}
      className={`flex w-16 flex-col items-center gap-1 rounded-[10px] pb-1.5 pt-2 text-[10px] font-semibold leading-tight ${sec === id ? 'bg-nav-on text-white' : 'text-[#9aa8c2] hover:text-white'}`}>
      <Icon size={22} strokeWidth={1.8} aria-hidden />{label}
    </Link>
  );

  return (
    <div className="flex min-h-screen">
      <nav aria-label="Разделы" className="flex w-[76px] flex-none flex-col items-center gap-1.5 bg-nav py-3.5">
        <span aria-hidden className="mb-3 flex size-[38px] items-center justify-center rounded-[10px] bg-accent text-[18px] font-bold text-white">Р</span>
        {SECTIONS.map((s) => railBtn(s.id, s.label, s.href, s.icon))}
        <div className="flex-1" />
        {railBtn('set', 'Настройки', '/settings', Settings)}
      </nav>

      <aside aria-label="Меню раздела" className="hidden w-[232px] flex-none flex-col gap-1 border-r border-line bg-[#f8f9fb] px-3 py-[18px] md:flex">
        {sec === 'obj' ? (
          <>
            <div className="px-2.5 pb-3 text-[18px] font-bold">Объекты</div>
            <Link href="/objects" className={navCls(path === '/objects')}>Все объекты <span className="text-[12px] text-ink-2">{objects.length}</span></Link>
            {objects.map((o) => (
              <Link key={o.id} href={`/objects/${o.id}`} className={`${navCls(path.startsWith(`/objects/${o.id}`))} pl-5`}>
                <span className="truncate">{o.name}</span><span className="text-[12px] text-muted">{o.count ?? ''}</span>
              </Link>
            ))}
            <Link href="/objects/new" className="mx-2.5 my-2 rounded-lg border border-dashed border-[#b9c3d3] px-2.5 py-2 font-semibold text-accent">+ Добавить объект</Link>
          </>
        ) : (
          <>
            <div className="px-2.5 pb-3 text-[18px] font-bold">{PANEL[sec].title}</div>
            {PANEL[sec].items.map((i) => <Link key={i.href} href={i.href} className={navCls(path === i.href)}>{i.label}</Link>)}
          </>
        )}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-3 border-b border-line bg-white px-6 py-2.5">
          <span className="flex size-9 items-center justify-center rounded-full bg-[#f2a33a] text-[13px] font-bold">{initials}</span>
          <span className="leading-tight"><b className="block font-semibold">{user.name}</b><span className="hint">{user.accountName === user.name ? 'арендодатель' : user.accountName}</span></span>
          <form action={logout}>
            <button className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-[#f2f5fa]" aria-label="Выйти" title="Выйти"><LogOut size={18} /></button>
          </form>
        </header>
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-6">{children}</main>
      </div>
    </div>
  );
}

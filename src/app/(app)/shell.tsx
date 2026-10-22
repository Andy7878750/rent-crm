'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Building2, ChartColumn, ChevronDown, ChevronsLeft, ChevronsRight, FileText, LibraryBig, LogOut, Menu, Plus, Settings, X } from 'lucide-react';
import { logout } from '../(auth)/actions';

type NavObj = { id: string; name: string; count: number | null };
type Item = { href: string; label: string; count?: number | null; exact?: boolean };
type Group = { id: string; label: string; icon: React.ElementType; match: string[]; items: Item[] };

const STATIC: Omit<Group, 'items'>[] = [
  { id: 'obj', label: 'Объекты', icon: Building2, match: ['/objects'] },
  { id: 'bills', label: 'Счета', icon: FileText, match: ['/bills', '/report'] },
  { id: 'refs', label: 'Справочники', icon: LibraryBig, match: ['/tariffs', '/requisites'] },
  { id: 'rep', label: 'Отчёты', icon: ChartColumn, match: ['/reports'] },
];
const ITEMS: Record<string, Item[]> = {
  bills: [{ href: '/bills', label: 'К выставлению', exact: true }, { href: '/bills/issued', label: 'Выставленные' }],
  refs: [{ href: '/tariffs', label: 'Тарифы и услуги' }, { href: '/requisites', label: 'Реквизиты' }],
  rep: [
    { href: '/reports/payments', label: 'Оплаты поставщикам' },
    { href: '/reports/months', label: 'Итоги по месяцам' },
    { href: '/reports/usage', label: 'Расход по счётчикам' }],
};

const KEY = 'rc-nav';
const load = (): { open?: string[]; mini?: boolean } => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}'); } catch { return {}; } };
const save = (v: { open: string[]; mini: boolean }) => { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch { /* без сохранения */ } };

export function Shell({ user, objects, children }: { user: { name: string; accountName: string }; objects: NavObj[]; children: React.ReactNode }) {
  const path = usePathname();
  const groups: Group[] = STATIC.map((g) => ({
    ...g,
    items: g.id === 'obj'
      ? [{ href: '/objects', label: 'Все объекты', count: objects.length, exact: true }, ...objects.map((o) => ({ href: `/objects/${o.id}`, label: o.name, count: o.count }))]
      : ITEMS[g.id],
  }));
  const activeGroup = groups.find((g) => g.match.some((m) => path === m || path.startsWith(m + '/')))?.id;
  const isOn = (i: Item) => (i.exact ? path === i.href : path === i.href || path.startsWith(i.href + '/'));

  const [open, setOpen] = useState<string[]>(['obj', 'bills', 'refs', 'rep']);
  const [mini, setMini] = useState(false);
  const [mobile, setMobile] = useState(false);
  useEffect(() => { const s = load(); if (s.open) setOpen(s.open); if (s.mini) setMini(true); }, []);
  useEffect(() => { setMobile(false); }, [path]);
  const toggle = (id: string) => { const next = open.includes(id) ? open.filter((x) => x !== id) : [...open, id]; setOpen(next); save({ open: next, mini }); };
  const setMiniSaved = (v: boolean) => { setMini(v); save({ open, mini: v }); };

  const initials = user.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const compact = mini && !mobile;

  const nav = (
    <nav aria-label="Разделы" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-3">
      {groups.map((g) => {
        const Icon = g.icon;
        const on = activeGroup === g.id;
        const expanded = open.includes(g.id) || on;
        if (compact) {
          return (
            <Link key={g.id} href={g.items[0].href} title={g.label} aria-label={g.label} aria-current={on ? 'page' : undefined}
              className={`flex h-10 items-center justify-center rounded-lg ${on ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-[#f1f4f8]'}`}>
              <Icon size={20} strokeWidth={1.8} />
            </Link>
          );
        }
        return (
          <div key={g.id} className="flex flex-col">
            <button type="button" onClick={() => toggle(g.id)} aria-expanded={expanded}
              className={`flex h-10 items-center gap-3 rounded-lg px-3 text-left text-[14px] font-semibold ${on ? 'text-accent' : 'text-ink hover:bg-[#f1f4f8]'}`}>
              <Icon size={19} strokeWidth={1.8} className={on ? 'text-accent' : 'text-muted'} />
              <span className="flex-1">{g.label}</span>
              <ChevronDown size={16} className={`text-faint transition ${expanded ? '' : '-rotate-90'}`} />
            </button>
            {expanded && (
              <div className="mb-1 ml-[22px] flex flex-col gap-0.5 border-l border-line pl-3">
                {g.items.map((i) => {
                  const a = isOn(i);
                  return (
                    <Link key={i.href} href={i.href} aria-current={a ? 'page' : undefined}
                      className={`flex h-9 items-center justify-between gap-2 rounded-lg px-3 text-[14px] ${a ? 'bg-accent-soft font-semibold text-accent' : 'text-ink-2 hover:bg-[#f1f4f8] hover:text-ink'}`}>
                      <span className="truncate">{i.label}</span>
                      {i.count != null && <span className={`text-[12px] ${a ? 'text-accent' : 'text-faint'}`}>{i.count}</span>}
                    </Link>
                  );
                })}
                {g.id === 'obj' && (
                  <Link href="/objects/new" className="flex h-9 items-center gap-1.5 rounded-lg px-3 text-[14px] font-semibold text-accent hover:bg-accent-soft">
                    <Plus size={16} /> Добавить объект
                  </Link>
                )}
              </div>
            )}
          </div>
        );
      })}
    </nav>
  );

  const settingsOn = path.startsWith('/settings');
  const bottom = (
    <div className="flex flex-col gap-1 border-t border-line px-3 py-3">
      <Link href="/settings" title="Настройки" aria-label={compact ? 'Настройки' : undefined}
        className={`flex h-10 items-center gap-3 rounded-lg px-3 text-[14px] font-semibold ${compact ? 'justify-center' : ''} ${settingsOn ? 'bg-accent-soft text-accent' : 'text-ink hover:bg-[#f1f4f8]'}`}>
        <Settings size={19} strokeWidth={1.8} className={settingsOn ? 'text-accent' : 'text-muted'} />{!compact && 'Настройки'}
      </Link>
      {!mobile && (
        <button type="button" onClick={() => setMiniSaved(!mini)} title={mini ? 'Развернуть меню' : 'Свернуть меню'} aria-label={mini ? 'Развернуть меню' : 'Свернуть меню'}
          className={`flex h-9 items-center gap-3 rounded-lg px-3 text-[13px] text-muted hover:bg-[#f1f4f8] ${compact ? 'justify-center' : ''}`}>
          {mini ? <ChevronsRight size={18} /> : <><ChevronsLeft size={18} /> Свернуть меню</>}
        </button>
      )}
    </div>
  );

  const logo = (
    <Link href="/objects" className="flex items-center gap-2.5" aria-label="Расчётка — на главную">
      <span aria-hidden className="flex size-[30px] flex-none items-center justify-center rounded-[8px] bg-accent text-[15px] font-bold text-white">Р</span>
      {!compact && <span className="text-[17px] font-bold">Расчётка</span>}
    </Link>
  );

  return (
    <div className="flex min-h-screen">
      {/* Боковое меню: светлое, с группами. На узком экране — выезжает по кнопке. */}
      <aside aria-label="Меню" className={`sticky top-0 hidden h-screen flex-none flex-col border-r border-line bg-white lg:flex ${compact ? 'w-[68px]' : 'w-[248px]'}`}>
        <div className={`flex h-[60px] flex-none items-center border-b border-line ${compact ? 'justify-center' : 'px-5'}`}>{logo}</div>
        {nav}
        {bottom}
      </aside>
      {mobile && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-[#1b2433]/30" onClick={() => setMobile(false)} />
          <aside aria-label="Меню" className="absolute inset-y-0 left-0 flex w-[272px] flex-col bg-white shadow-xl">
            <div className="flex h-[60px] flex-none items-center justify-between border-b border-line px-5">{logo}
              <button onClick={() => setMobile(false)} aria-label="Закрыть меню" className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-[#f1f4f8]"><X size={20} /></button>
            </div>
            {nav}
            {bottom}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-[60px] flex-none items-center gap-3 border-b border-line bg-white/95 px-4 backdrop-blur lg:px-6">
          <button onClick={() => setMobile(true)} aria-label="Открыть меню" className="flex size-9 items-center justify-center rounded-lg text-ink-2 hover:bg-[#f1f4f8] lg:hidden"><Menu size={20} /></button>
          <span className="lg:hidden">{logo}</span>
          <div className="flex-1" />
          <span className="flex size-9 items-center justify-center rounded-full bg-accent-soft text-[13px] font-bold text-accent">{initials}</span>
          <span className="hidden leading-tight sm:block"><b className="block text-[14px] font-semibold">{user.name}</b><span className="hint">{user.accountName === user.name ? 'арендодатель' : user.accountName}</span></span>
          <form action={logout}>
            <button className="flex size-9 items-center justify-center rounded-lg text-muted hover:bg-[#f1f4f8]" aria-label="Выйти" title="Выйти"><LogOut size={18} /></button>
          </form>
        </header>
        <main className="flex min-w-0 flex-1 flex-col gap-4 p-4 lg:p-6">{children}</main>
      </div>
    </div>
  );
}

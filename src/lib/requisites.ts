/** Реквизиты арендодателя (accounts.requisites) и строки для подвала отчёта PDF. */

export type Requisites = {
  kind: 'ip' | 'self' | 'person';
  name: string; inn: string; ogrn: string; address: string; phone: string; email: string; noVat: boolean;
  bank: string; bik: string; ks: string; rs: string; sbp: string; showPay: boolean;
};

export function readRequisites(raw: unknown, fallbackName: string): Requisites {
  const r = (raw ?? {}) as Partial<Requisites>;
  const s = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    kind: r.kind === 'self' || r.kind === 'person' ? r.kind : 'ip',
    name: s(r.name) || fallbackName, inn: s(r.inn), ogrn: s(r.ogrn), address: s(r.address), phone: s(r.phone), email: s(r.email),
    noVat: r.noVat !== false, bank: s(r.bank), bik: s(r.bik), ks: s(r.ks), rs: s(r.rs), sbp: s(r.sbp), showPay: r.showPay !== false,
  };
}

/** Подвал отчёта: «ИП Князев А. С. · ИНН … · телефон, почта · без НДС» и «Куда платить: …». */
export function reportFooter(r: Requisites): { line: string; pay: string | null } {
  const line = [r.name, r.inn && `ИНН ${r.inn}`, r.kind === 'ip' && r.ogrn && `ОГРНИП ${r.ogrn}`, [r.phone, r.email].filter(Boolean).join(', '), r.noVat && 'без НДС']
    .filter(Boolean).join(' · ');
  const parts: string[] = [];
  if (r.rs) parts.push(`р/с ${r.rs}${r.bank ? ` в ${r.bank}` : ''}${r.bik ? `, БИК ${r.bik}` : ''}${r.ks ? `, к/с ${r.ks}` : ''}`);
  if (r.sbp) parts.push(`СБП: ${r.sbp}`);
  return { line, pay: r.showPay && parts.length ? `Куда платить: ${parts.join(' · ')}` : null };
}

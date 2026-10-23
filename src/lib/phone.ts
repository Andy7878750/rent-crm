import { AsYouType } from 'libphonenumber-js/min';

const digits = (s: string) => s.replace(/\D/g, '');

/** Российский формат: «+7 (912) 345-67-89». */
function ru(d: string): string {
  if (d[0] === '8') d = '7' + d.slice(1);
  if (d[0] !== '7') d = '7' + d;
  const p = d.slice(1, 11);
  let out = '+7';
  if (p.length) out += ' (' + p.slice(0, 3);
  if (p.length >= 3) out += ')';
  if (p.length > 3) out += ' ' + p.slice(3, 6);
  if (p.length > 6) out += '-' + p.slice(6, 8);
  if (p.length > 8) out += '-' + p.slice(8, 10);
  return out;
}

/**
 * Телефон по мере ввода. Начали с цифры или 8 — российский номер (+7).
 * Начали с «+» и другим кодом страны — номер оформляется по правилам этой страны (+370 …, +375 …).
 * prev — прежнее значение поля: если стёрли только скобку или дефис, стираем и цифру перед ним.
 */
export function formatPhone(raw: string, prev = ''): string {
  let d = digits(raw);
  if (prev && raw.length < prev.length && d === digits(prev)) d = d.slice(0, -1);
  const intl = raw.trim().startsWith('+');
  if (!d) return intl && raw.trim() === '+' ? '+' : '';
  if (!intl || d[0] === '7') return ru(d);
  return new AsYouType().input('+' + d.slice(0, 15));
}

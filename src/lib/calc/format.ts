/** Денежные и числовые помощники. Деньги считаем в копейках, чтобы не копить ошибки округления. */

/** Округление до копеек «половина вверх» (как в бухгалтерии). */
export function round2(x: number): number {
  const s = Math.sign(x);
  return (s * Math.round(Math.abs(x) * 100 + 1e-9)) / 100;
}

/** Сумма рублёвых значений через копейки. */
export function sumMoney(values: number[]): number {
  return values.reduce((a, v) => a + Math.round(v * 100), 0) / 100;
}

/** 15845.8 → «15 845,80» */
export function fmtMoney(n: number): string {
  const [i, f] = round2(n).toFixed(2).split('.');
  return i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ',' + f;
}

/** Количество до 3 знаков: 259.845 → «259,845», 4 → «4». */
export function fmtQty(n: number): string {
  return String(Math.round(n * 1000) / 1000).replace('.', ',');
}

/** Цена до 4 знаков: 13.347912 → «13,3479». */
export function fmtPrice(n: number): string {
  return String(Math.round(n * 10000) / 10000).replace('.', ',');
}

/** Сумма прописью: 8243.68 → «Восемь тысяч двести сорок три рубля 68 копеек». */
export function rubWords(n: number): string {
  const ones = [
    ['', 'один', 'два', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'],
    ['', 'одна', 'две', 'три', 'четыре', 'пять', 'шесть', 'семь', 'восемь', 'девять'],
  ];
  const teens = ['десять', 'одиннадцать', 'двенадцать', 'тринадцать', 'четырнадцать', 'пятнадцать', 'шестнадцать', 'семнадцать', 'восемнадцать', 'девятнадцать'];
  const tens = ['', '', 'двадцать', 'тридцать', 'сорок', 'пятьдесят', 'шестьдесят', 'семьдесят', 'восемьдесят', 'девяносто'];
  const hund = ['', 'сто', 'двести', 'триста', 'четыреста', 'пятьсот', 'шестьсот', 'семьсот', 'восемьсот', 'девятьсот'];
  const plural = (k: number, f: [string, string, string]) => {
    const a = k % 100, b = k % 10;
    return a > 10 && a < 20 ? f[2] : b === 1 ? f[0] : b > 1 && b < 5 ? f[1] : f[2];
  };
  const tri = (k: number, fem: boolean) => {
    const r: string[] = [];
    if (k >= 100) r.push(hund[Math.floor(k / 100)]);
    const t = k % 100;
    if (t >= 10 && t < 20) r.push(teens[t - 10]);
    else {
      if (t >= 20) r.push(tens[Math.floor(t / 10)]);
      if (t % 10) r.push(ones[fem ? 1 : 0][t % 10]);
    }
    return r.join(' ');
  };
  const kopTotal = Math.round(round2(Math.abs(n)) * 100);
  const rub = Math.floor(kopTotal / 100);
  const kop = kopTotal % 100;
  const parts: string[] = [];
  const mln = Math.floor(rub / 1e6), th = Math.floor(rub / 1000) % 1000, rest = rub % 1000;
  if (mln) parts.push(tri(mln, false) + ' ' + plural(mln, ['миллион', 'миллиона', 'миллионов']));
  if (th) parts.push(tri(th, true) + ' ' + plural(th, ['тысяча', 'тысячи', 'тысяч']));
  if (rest || !parts.length) parts.push(rest ? tri(rest, false) : 'ноль');
  const s = parts.join(' ').replace(/\s+/g, ' ').trim() + ' ' + plural(rub, ['рубль', 'рубля', 'рублей']) + ' ' +
    String(kop).padStart(2, '0') + ' ' + plural(kop, ['копейка', 'копейки', 'копеек']);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

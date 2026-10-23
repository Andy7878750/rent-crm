import 'server-only';
import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Отправка писем через SMTP (почта Timeweb). Настройки — в переменных окружения:
 * SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, APP_URL.
 * Без SMTP_PASS письмо не отправляется, а печатается в лог — так удобно в разработке.
 */
const env = (k: string, d = '') => process.env[k] || d;

/** Почта настроена или мы в разработке (там письма печатаются в лог). */
export const mailReady = () => !!env('SMTP_PASS') || process.env.NODE_ENV !== 'production';

export const appUrl = () => env('APP_URL', 'http://localhost:3000').replace(/\/$/, '');

let transport: Transporter | null = null;
function getTransport() {
  if (!transport) {
    const port = Number(env('SMTP_PORT', '465'));
    transport = nodemailer.createTransport({
      host: env('SMTP_HOST', 'smtp.timeweb.ru'),
      port,
      secure: port === 465,
      auth: { user: env('SMTP_USER'), pass: env('SMTP_PASS') },
      connectionTimeout: 10_000,
    });
  }
  return transport;
}

type Letter = { to: string; subject: string; title: string; text: string; button: string; url: string; note: string };

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);

function html(l: Letter) {
  return `<!doctype html><html lang="ru"><body style="margin:0;background:#f2f4f8;font-family:Arial,Helvetica,sans-serif;color:#2c3e50">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 12px"><tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;background:#fff;border-radius:12px;border:1px solid #e3e8ef">
<tr><td style="padding:28px 32px 0;font-weight:bold;font-size:16px"><span style="display:inline-block;width:26px;height:26px;line-height:26px;text-align:center;background:#c8663b;color:#fff;border-radius:7px;margin-right:8px">Р</span>Расчётка</td></tr>
<tr><td style="padding:20px 32px 0;font-size:20px;font-weight:bold">${esc(l.title)}</td></tr>
<tr><td style="padding:10px 32px 0;font-size:15px;line-height:1.5;color:#3d4757">${esc(l.text)}</td></tr>
<tr><td style="padding:22px 32px"><a href="${esc(l.url)}" style="display:inline-block;background:#c8663b;color:#fff;text-decoration:none;font-weight:bold;padding:12px 22px;border-radius:8px">${esc(l.button)}</a></td></tr>
<tr><td style="padding:0 32px 26px;font-size:12px;line-height:1.5;color:#7a8597">${esc(l.note)}<br>Если кнопка не нажимается, скопируйте ссылку: <span style="word-break:break-all">${esc(l.url)}</span></td></tr>
</table></td></tr></table></body></html>`;
}

/** Отправить письмо со ссылкой. Возвращает false, если отправить не удалось. */
export async function sendLetter(l: Letter): Promise<boolean> {
  const text = `${l.title}\n\n${l.text}\n\n${l.button}: ${l.url}\n\n${l.note}\n\n— Расчётка`;
  if (!env('SMTP_PASS')) {
    if (process.env.NODE_ENV === 'production') return false;
    console.log(`[mail] (SMTP не настроен) to=${l.to} subject=${l.subject}\n${text}`);
    return true;
  }
  try {
    await getTransport().sendMail({
      from: env('MAIL_FROM', `Расчётка <${env('SMTP_USER')}>`),
      to: l.to, subject: l.subject, text, html: html(l),
    });
    return true;
  } catch (e) {
    console.error('[mail] ошибка отправки', e);
    return false;
  }
}

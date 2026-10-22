// Проверка входа в почтовый сервер при выкладке (письмо не отправляется).
const { SMTP_HOST, SMTP_PORT = '465', SMTP_USER, SMTP_PASS } = process.env;
try {
  const { default: nodemailer } = await import('nodemailer');
  const port = Number(SMTP_PORT);
  await nodemailer.createTransport({ host: SMTP_HOST, port, secure: port === 465, auth: { user: SMTP_USER, pass: SMTP_PASS }, connectionTimeout: 10000 }).verify();
  console.log(`mail: вход в ${SMTP_HOST} как ${SMTP_USER} — OK`);
} catch (e) {
  console.log(`mail: ошибка входа в ${SMTP_HOST} как ${SMTP_USER}: ${String(e?.message ?? e).slice(0, 200)}`);
}

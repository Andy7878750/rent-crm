#!/usr/bin/env bash
# Выкладка новой версии: распаковка, миграции базы, переключение и перезапуск. Запуск от root.
set -euo pipefail
ARCHIVE="${1:?архив}"
REL="/opt/rent-crm/releases/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REL"
tar -xzf "$ARCHIVE" -C "$REL"
chown -R app:app "$REL"
# Настройки почты из выкладки: старые строки APP_URL/SMTP_*/MAIL_FROM заменяем новыми.
if [ -f /root/mail.env ]; then
  grep -vE '^(APP_URL|SMTP_[A-Z]+|MAIL_FROM)=' /etc/rent-crm.env > /etc/rent-crm.env.new || true
  cat /root/mail.env >> /etc/rent-crm.env.new
  chmod 640 /etc/rent-crm.env.new && chown root:app /etc/rent-crm.env.new
  mv /etc/rent-crm.env.new /etc/rent-crm.env
  rm -f /root/mail.env
fi
set -a; . /etc/rent-crm.env; set +a
if [ -n "${SMTP_PASS:-}" ]; then
  if timeout 6 bash -c "</dev/tcp/$SMTP_HOST/${SMTP_PORT:-465}" 2>/dev/null; then echo "mail: $SMTP_HOST:${SMTP_PORT:-465} доступен, отправка от $SMTP_USER"
  else echo "mail: НЕТ соединения с $SMTP_HOST:${SMTP_PORT:-465} — хостинг может закрывать порт"; fi
else echo "mail: SMTP_PASS не задан — письма не отправляются"; fi
(cd "$REL" && sudo -u app --preserve-env=DATABASE_URL node scripts/migrate.mjs drizzle)
ln -sfn "$REL" /opt/rent-crm/current
systemctl restart rent-crm
sleep 3
systemctl is-active --quiet rent-crm || { journalctl -u rent-crm -n 50 --no-pager; exit 1; }
# Оставляем 5 последних версий.
ls -1dt /opt/rent-crm/releases/* | tail -n +6 | xargs -r rm -rf
rm -f "$ARCHIVE"
echo "released $REL"

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
  grep -vE '^(APP_URL|SMTP_[A-Z]+|MAIL_FROM|REGISTER_ALLOW|REGISTRATION_OPEN|ADMIN_EMAILS)=' /etc/rent-crm.env > /etc/rent-crm.env.new || true
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
# Копия базы перед миграциями (хранятся 10 последних): /var/backups/rent-crm/*.sql.gz
mkdir -p /var/backups/rent-crm && chmod 700 /var/backups/rent-crm
if sudo -u postgres pg_dump rentcrm 2>/dev/null | gzip > "/var/backups/rent-crm/$(date +%Y%m%d-%H%M%S).sql.gz"; then echo "backup: ok"
else echo "backup: НЕ УДАЛОСЬ — миграции всё равно применяются"; fi
ls -1t /var/backups/rent-crm/*.sql.gz 2>/dev/null | tail -n +11 | xargs -r rm -f
(cd "$REL" && sudo -u app --preserve-env=DATABASE_URL node scripts/migrate.mjs drizzle)
ln -sfn "$REL" /opt/rent-crm/current
systemctl restart rent-crm
sleep 3
systemctl is-active --quiet rent-crm || { journalctl -u rent-crm -n 50 --no-pager; exit 1; }
# Оставляем 5 последних версий.
ls -1dt /opt/rent-crm/releases/* | tail -n +6 | xargs -r rm -rf
rm -f "$ARCHIVE"
[ -n "${SMTP_PASS:-}" ] && (cd "$REL" && sudo -u app --preserve-env=SMTP_HOST,SMTP_PORT,SMTP_USER,SMTP_PASS node scripts/mail-check.mjs) || true
# Сколько аккаунтов в базе (без адресов — только число).
echo "mail: аккаунтов в базе: $(sudo -u postgres psql -tA rentcrm -c 'select count(*) from users' 2>/dev/null || echo '?')"
echo "released $REL"

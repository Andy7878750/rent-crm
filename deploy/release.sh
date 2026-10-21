#!/usr/bin/env bash
# Выкладка новой версии: распаковка, миграции базы, переключение и перезапуск. Запуск от root.
set -euo pipefail
ARCHIVE="${1:?архив}"
REL="/opt/rent-crm/releases/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REL"
tar -xzf "$ARCHIVE" -C "$REL"
chown -R app:app "$REL"
set -a; . /etc/rent-crm.env; set +a
(cd "$REL" && sudo -u app --preserve-env=DATABASE_URL node scripts/migrate.mjs drizzle)
ln -sfn "$REL" /opt/rent-crm/current
systemctl restart rent-crm
sleep 3
systemctl is-active --quiet rent-crm || { journalctl -u rent-crm -n 50 --no-pager; exit 1; }
# Оставляем 5 последних версий.
ls -1dt /opt/rent-crm/releases/* | tail -n +6 | xargs -r rm -rf
rm -f "$ARCHIVE"
echo "released $REL"

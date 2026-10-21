#!/usr/bin/env bash
# Первичная настройка сервера Ubuntu (запускается от root, можно запускать повторно).
# Ставит: Node.js 22, PostgreSQL, nginx, certbot, swap 2 ГБ, пользователя app, службу rent-crm.
set -euo pipefail
DOMAIN="${1:?укажите домен}"
EMAIL="${2:-}"
export DEBIAN_FRONTEND=noninteractive

# Запасная память на диске: сервер с 2 ГБ не упадёт при пиках.
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q /swapfile /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

apt-get update -y
apt-get install -y ca-certificates curl gnupg nginx postgresql certbot python3-certbot-nginx ufw unattended-upgrades

if ! command -v node >/dev/null || ! node -v | grep -q '^v22'; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

id app >/dev/null 2>&1 || useradd --system --create-home --home-dir /opt/rent-crm --shell /usr/sbin/nologin app
mkdir -p /opt/rent-crm/releases && chown -R app:app /opt/rent-crm

# База данных и пароль к ней (создаются один раз, пароль хранится только на сервере).
if [ ! -f /etc/rent-crm.env ]; then
  PW="$(openssl rand -hex 24)"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "create user rentcrm with password '$PW';"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "create database rentcrm owner rentcrm;"
  cat > /etc/rent-crm.env <<ENV
DATABASE_URL=postgres://rentcrm:$PW@127.0.0.1:5432/rentcrm
NODE_ENV=production
PORT=3000
HOSTNAME=127.0.0.1
ENV
  chmod 640 /etc/rent-crm.env && chown root:app /etc/rent-crm.env
fi

cat > /etc/systemd/system/rent-crm.service <<'UNIT'
[Unit]
Description=Расчётка (rent-crm)
After=network.target postgresql.service

[Service]
User=app
WorkingDirectory=/opt/rent-crm/current
EnvironmentFile=/etc/rent-crm.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable rent-crm >/dev/null

cat > /etc/nginx/sites-available/rent-crm <<NGINX
server {
  listen 80;
  server_name $DOMAIN;
  client_max_body_size 10m;
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";
  }
}
NGINX
ln -sf /etc/nginx/sites-available/rent-crm /etc/nginx/sites-enabled/rent-crm
rm -f /etc/nginx/sites-enabled/default
nginx -t && systemctl reload nginx

ufw allow OpenSSH >/dev/null && ufw allow 'Nginx Full' >/dev/null && ufw --force enable >/dev/null

# HTTPS-сертификат Let's Encrypt (продлевается сам).
if [ ! -d "/etc/letsencrypt/live/$DOMAIN" ]; then
  if [ -n "$EMAIL" ]; then certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$EMAIL" --redirect
  else certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --register-unsafely-without-email --redirect; fi
fi

echo "setup done: https://$DOMAIN"

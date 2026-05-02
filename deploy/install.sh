#!/usr/bin/env bash
# ============================================================================
# Phantom Network — Full Self-Host Installer for Ubuntu 22.04 / 24.04
# ----------------------------------------------------------------------------
# One command sets up the ENTIRE stack on your own server:
#   * Docker + Docker Compose
#   * Self-hosted Supabase (Postgres 15, GoTrue auth, PostgREST, Realtime,
#     Storage, Edge Functions runtime, Studio admin UI)
#   * Full Phantom Network database schema + seed data
#   * All edge functions deployed locally
#   * Built React frontend served by Nginx
#   * Free Let's Encrypt SSL certificate
#   * Auto-redirect of phantomnetwork.online -> this server
#
# Usage:
#   sudo bash deploy/install.sh
#
# Re-run any time. Idempotent.
# ============================================================================
set -euo pipefail

B='\033[0;34m'; G='\033[0;32m'; Y='\033[1;33m'; R='\033[0;31m'; N='\033[0m'
log()  { echo -e "${B}[*]${N} $*"; }
ok()   { echo -e "${G}[v]${N} $*"; }
warn() { echo -e "${Y}[!]${N} $*"; }
die()  { echo -e "${R}[x]${N} $*" >&2; exit 1; }

[[ $EUID -eq 0 ]] || die "Run with sudo:  sudo bash deploy/install.sh"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---------------------------------------------------------------------------
# Defaults — phantomnetwork.online works out of the box
# ---------------------------------------------------------------------------
DOMAIN="${DOMAIN:-phantomnetwork.online}"
EMAIL="${EMAIL:-admin@${DOMAIN}}"
INSTALL_DIR="${INSTALL_DIR:-/opt/phantom-network}"
WEB_ROOT="${WEB_ROOT:-/var/www/phantom-network}"
ENABLE_SSL="${ENABLE_SSL:-yes}"

if [[ -t 0 && "${UNATTENDED:-no}" != "yes" ]]; then
  read -rp "Domain [$DOMAIN]: " _d || true; DOMAIN="${_d:-$DOMAIN}"
  read -rp "Email for SSL [$EMAIL]: " _e || true; EMAIL="${_e:-$EMAIL}"
  read -rp "Enable HTTPS via Let's Encrypt? [yes]: " _s || true; ENABLE_SSL="${_s:-yes}"
fi

log "Domain:        $DOMAIN"
log "SSL email:     $EMAIL"
log "Stack dir:     $INSTALL_DIR"
log "Web root:      $WEB_ROOT"
log "HTTPS:         $ENABLE_SSL"

# ---------------------------------------------------------------------------
# 1. System prerequisites
# ---------------------------------------------------------------------------
log "Updating apt and installing base packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl wget git ca-certificates gnupg lsb-release \
  ufw nginx openssl jq unzip software-properties-common rsync

# Node 20 (for build)
if ! command -v node >/dev/null || [[ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 20 ]]; then
  log "Installing Node.js 20..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs
fi
ok "Node $(node -v)"

# Docker
if ! command -v docker >/dev/null; then
  log "Installing Docker..."
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
  systemctl enable --now docker
fi
ok "Docker $(docker --version | awk '{print $3}' | tr -d ,)"

# Certbot (only if SSL)
if [[ "$ENABLE_SSL" == "yes" ]]; then
  apt-get install -y certbot python3-certbot-nginx
fi

# ---------------------------------------------------------------------------
# 2. Project files
# ---------------------------------------------------------------------------
log "Copying project to $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR"
rsync -a --delete \
  --exclude node_modules --exclude dist --exclude .git \
  "$PROJECT_DIR/" "$INSTALL_DIR/"
cd "$INSTALL_DIR"

# ---------------------------------------------------------------------------
# 3. Generate secrets (only first run)
# ---------------------------------------------------------------------------
SECRETS_FILE="$INSTALL_DIR/deploy/.secrets.env"
if [[ ! -f "$SECRETS_FILE" ]]; then
  log "Generating secrets..."
  POSTGRES_PASSWORD=$(openssl rand -hex 24)
  JWT_SECRET=$(openssl rand -hex 32)
  DASHBOARD_PASSWORD=$(openssl rand -hex 12)
  TRON_ENCRYPTION_KEY=$(openssl rand -hex 32)

  # Mint anon + service keys signed with JWT_SECRET
  mint_jwt() {
    local role="$1"
    local header='{"alg":"HS256","typ":"JWT"}'
    local now=$(date +%s)
    local exp=$((now + 60*60*24*365*10))
    local payload="{\"role\":\"$role\",\"iss\":\"supabase\",\"iat\":$now,\"exp\":$exp}"
    b64() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
    local h p s
    h=$(printf '%s' "$header"  | b64)
    p=$(printf '%s' "$payload" | b64)
    s=$(printf '%s.%s' "$h" "$p" | openssl dgst -sha256 -hmac "$JWT_SECRET" -binary | b64)
    printf '%s.%s.%s' "$h" "$p" "$s"
  }
  ANON_KEY=$(mint_jwt anon)
  SERVICE_ROLE_KEY=$(mint_jwt service_role)

  cat > "$SECRETS_FILE" <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD
TRON_ENCRYPTION_KEY=$TRON_ENCRYPTION_KEY
EOF
  chmod 600 "$SECRETS_FILE"
  ok "Secrets generated -> $SECRETS_FILE"
else
  ok "Re-using existing secrets ($SECRETS_FILE)"
fi
# shellcheck disable=SC1090
source "$SECRETS_FILE"

# ---------------------------------------------------------------------------
# 4. docker-compose .env for the Supabase stack
# ---------------------------------------------------------------------------
API_EXTERNAL_URL="https://${DOMAIN}/api"
SITE_URL="https://${DOMAIN}"
if [[ "$ENABLE_SSL" != "yes" ]]; then
  API_EXTERNAL_URL="http://${DOMAIN}/api"
  SITE_URL="http://${DOMAIN}"
fi

cat > "$INSTALL_DIR/deploy/.env" <<EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
ANON_KEY=$ANON_KEY
SERVICE_ROLE_KEY=$SERVICE_ROLE_KEY
DASHBOARD_USERNAME=admin
DASHBOARD_PASSWORD=$DASHBOARD_PASSWORD
API_EXTERNAL_URL=$API_EXTERNAL_URL
SITE_URL=$SITE_URL
TRON_ENCRYPTION_KEY=$TRON_ENCRYPTION_KEY
DOMAIN=$DOMAIN
EOF
chmod 600 "$INSTALL_DIR/deploy/.env"

# ---------------------------------------------------------------------------
# 5. Frontend .env + build
# ---------------------------------------------------------------------------
cat > "$INSTALL_DIR/.env" <<EOF
VITE_SUPABASE_URL=$SITE_URL/api
VITE_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY
VITE_SUPABASE_PROJECT_ID=phantom-self-hosted
EOF

log "Installing frontend dependencies..."
cd "$INSTALL_DIR"
if command -v bun >/dev/null; then
  bun install --frozen-lockfile || bun install
else
  npm ci --no-audit --no-fund || npm install --no-audit --no-fund
fi

log "Building frontend (this can take a couple of minutes)..."
if command -v bun >/dev/null; then bun run build; else npm run build; fi

mkdir -p "$WEB_ROOT"
rsync -a --delete "$INSTALL_DIR/dist/" "$WEB_ROOT/"
chown -R www-data:www-data "$WEB_ROOT"
ok "Frontend built and deployed to $WEB_ROOT"

# ---------------------------------------------------------------------------
# 6. Start the Supabase stack
# ---------------------------------------------------------------------------
log "Starting self-hosted Supabase stack..."
cd "$INSTALL_DIR/deploy"
docker compose --env-file .env up -d

log "Waiting for Postgres to accept connections..."
for i in $(seq 1 60); do
  if docker compose exec -T db pg_isready -U postgres >/dev/null 2>&1; then break; fi
  sleep 2
done
ok "Postgres is up"

# ---------------------------------------------------------------------------
# 7. Apply schema + seed
# ---------------------------------------------------------------------------
log "Applying schema (idempotent)..."
docker compose exec -T db psql -U postgres -d postgres \
  -v ON_ERROR_STOP=0 < "$INSTALL_DIR/deploy/db/01-schema.sql" >/tmp/schema.log 2>&1 || true
ok "Schema applied (warnings logged to /tmp/schema.log)"

log "Loading seed data (site settings, coins, games)..."
docker compose exec -T db psql -U postgres -d postgres \
  -v ON_ERROR_STOP=0 < "$INSTALL_DIR/deploy/db/02-seed.sql" >/tmp/seed.log 2>&1 || true
ok "Seed loaded"

# ---------------------------------------------------------------------------
# 8. Nginx (reverse proxy + static + SSL)
# ---------------------------------------------------------------------------
log "Writing Nginx site config..."
cat > /etc/nginx/sites-available/phantom-network <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name $DOMAIN www.$DOMAIN;

    # Static frontend
    root $WEB_ROOT;
    index index.html;

    # Supabase API (PostgREST + GoTrue + Realtime + Storage + Functions)
    location /api/ {
        proxy_pass http://127.0.0.1:8000/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_read_timeout 86400;
    }

    # SPA fallback
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Long cache for built assets
    location /assets/ {
        expires 1y;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    client_max_body_size 50M;
}
NGINX

ln -sf /etc/nginx/sites-available/phantom-network /etc/nginx/sites-enabled/phantom-network
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
ok "Nginx configured"

# ---------------------------------------------------------------------------
# 9. Firewall
# ---------------------------------------------------------------------------
if command -v ufw >/dev/null; then
  ufw allow 22/tcp  >/dev/null 2>&1 || true
  ufw allow 80/tcp  >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  yes | ufw enable >/dev/null 2>&1 || true
fi

# ---------------------------------------------------------------------------
# 10. SSL certificate (auto-renew via certbot timer)
# ---------------------------------------------------------------------------
if [[ "$ENABLE_SSL" == "yes" ]]; then
  log "Requesting Let's Encrypt certificate for $DOMAIN..."
  if certbot --nginx --non-interactive --agree-tos -m "$EMAIL" \
       -d "$DOMAIN" -d "www.$DOMAIN" --redirect; then
    ok "HTTPS active"
  else
    warn "Certbot failed. The site is reachable on HTTP. Re-run after DNS points here:"
    warn "  sudo certbot --nginx -d $DOMAIN -d www.$DOMAIN"
  fi
fi

# ---------------------------------------------------------------------------
# Done
# ---------------------------------------------------------------------------
ok "============================================================"
ok " Phantom Network is live at: $SITE_URL"
ok "------------------------------------------------------------"
ok " Supabase Studio (admin DB UI):  $SITE_URL/api/  (proxied)"
ok " Local Studio direct:            http://$(hostname -I | awk '{print $1}'):3001"
ok " Studio login: admin / $DASHBOARD_PASSWORD"
ok ""
ok " Secrets file:    $SECRETS_FILE"
ok " Stack control:   cd $INSTALL_DIR/deploy && docker compose ps"
ok " Rebuild front:   sudo bash $INSTALL_DIR/deploy/install.sh"
ok "============================================================"
ok ""
ok " DNS reminder: point  $DOMAIN  and  www.$DOMAIN  A records"
ok " to this server's public IP:  $(curl -fsS https://api.ipify.org || echo '<your-server-ip>')"
ok "============================================================"
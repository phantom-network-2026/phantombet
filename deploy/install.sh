#!/usr/bin/env bash
# ============================================================================
# Phantom Network - Self-Hosted Frontend Installer (Ubuntu 22.04 / 24.04)
# ----------------------------------------------------------------------------
# Builds the React frontend and serves it from your Ubuntu server via Nginx.
# The backend (database, auth, edge functions) keeps running on Lovable Cloud.
#
# Usage:   sudo bash deploy/install.sh
# Re-run any time to refresh the build.
# ============================================================================
set -euo pipefail

BLUE='\033[0;34m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
log()  { echo -e "${BLUE}[*]${NC} $*"; }
ok()   { echo -e "${GREEN}[v]${NC} $*"; }
warn() { echo -e "${YELLOW}[!]${NC} $*"; }
die()  { echo -e "${RED}[x]${NC} $*" >&2; exit 1; }

ask() {
  local prompt="$1" default="${2:-}" reply
  if [[ -n "$default" ]]; then
    read -rp "$(echo -e "${YELLOW}?${NC} ${prompt} [${default}]: ")" reply
    echo "${reply:-$default}"
  else
    read -rp "$(echo -e "${YELLOW}?${NC} ${prompt}: ")" reply
    echo "$reply"
  fi
}

[[ $EUID -eq 0 ]] || die "Please run with sudo: sudo bash deploy/install.sh"
command -v apt-get >/dev/null || die "This installer targets Ubuntu/Debian."

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
log "Project root: ${PROJECT_ROOT}"

echo
echo "============================================================"
echo " Phantom Network - Frontend Installer"
echo "============================================================"
echo "Backend stays on Lovable Cloud. We will build the UI and"
echo "serve it from this Ubuntu server with Nginx (+ optional HTTPS)."
echo

DOMAIN="$(ask 'Domain or hostname (e.g. phantom.example.com, or _ for any)' '_')"
INSTALL_DIR="$(ask 'Where to install the built site' '/var/www/phantom-network')"
SETUP_SSL="no"
if [[ "$DOMAIN" != "_" ]]; then
  SETUP_SSL="$(ask 'Set up free HTTPS via Lets Encrypt? (yes/no)' 'yes')"
fi
SSL_EMAIL=""
if [[ "$SETUP_SSL" == "yes" ]]; then
  SSL_EMAIL="$(ask 'Email for Lets Encrypt notifications')"
  [[ -n "$SSL_EMAIL" ]] || die "Email is required for Lets Encrypt."
fi

log "Updating apt and installing base packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y >/dev/null
apt-get install -y curl ca-certificates gnupg nginx ufw rsync >/dev/null
ok "Base packages installed."

if ! command -v node >/dev/null || [[ "$(node -v 2>/dev/null | sed 's/v//; s/\..*//')" -lt 20 ]]; then
  log "Installing Node.js 20.x (NodeSource)..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >/dev/null
  apt-get install -y nodejs >/dev/null
fi
ok "Node $(node -v) / npm $(npm -v) ready."

log "Installing project dependencies..."
cd "$PROJECT_ROOT"
if [[ -f package-lock.json ]]; then
  npm ci --no-audit --no-fund
else
  npm install --no-audit --no-fund
fi

log "Building production bundle..."
npm run build
[[ -d "$PROJECT_ROOT/dist" ]] || die "Build did not produce a dist/ directory."
ok "Build complete."

log "Deploying static files to ${INSTALL_DIR}..."
mkdir -p "$INSTALL_DIR"
rsync -a --delete "$PROJECT_ROOT/dist/" "$INSTALL_DIR/"
chown -R www-data:www-data "$INSTALL_DIR"
ok "Files deployed."

NGINX_CONF="/etc/nginx/sites-available/phantom-network.conf"
log "Writing Nginx config to ${NGINX_CONF}..."
SERVER_NAME="$DOMAIN"

cat > "$NGINX_CONF" <<NGINX
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME};

    root ${INSTALL_DIR};
    index index.html;

    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        try_files \$uri =404;
    }

    location = /index.html {
        add_header Cache-Control "no-store, must-revalidate";
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript image/svg+xml;
    gzip_min_length 1024;

    client_max_body_size 25m;
}
NGINX

ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/phantom-network.conf
[[ -f /etc/nginx/sites-enabled/default ]] && rm -f /etc/nginx/sites-enabled/default

log "Validating Nginx configuration..."
nginx -t
systemctl enable nginx >/dev/null 2>&1 || true
systemctl reload nginx
ok "Nginx reloaded."

if command -v ufw >/dev/null; then
  log "Configuring firewall (OpenSSH + Nginx Full)..."
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 'Nginx Full' >/dev/null 2>&1 || true
  yes | ufw enable >/dev/null 2>&1 || true
  ok "Firewall configured."
fi

if [[ "$SETUP_SSL" == "yes" ]]; then
  log "Installing Certbot and requesting certificate for ${DOMAIN}..."
  apt-get install -y certbot python3-certbot-nginx >/dev/null
  if certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos -m "$SSL_EMAIL" --redirect; then
    ok "HTTPS active at https://${DOMAIN}"
  else
    warn "Certbot failed - ensure DNS for ${DOMAIN} points here, then run:"
    warn "  sudo certbot --nginx -d ${DOMAIN}"
  fi
fi

echo
echo "============================================================"
ok "Install complete."
echo "  Site root : ${INSTALL_DIR}"
echo "  Nginx conf: ${NGINX_CONF}"
if [[ "$SETUP_SSL" == "yes" ]]; then
  echo "  URL       : https://${DOMAIN}"
else
  echo "  URL       : http://${DOMAIN:-server-ip}"
fi
echo
echo "To deploy a new build later, just re-run:"
echo "  sudo bash deploy/install.sh"
echo "============================================================"

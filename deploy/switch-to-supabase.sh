#!/usr/bin/env bash
# ----------------------------------------------------------------------------
# Phantom Network — point a self-hosted deploy at an external Supabase project.
#
# Run this on your Ubuntu server AFTER you've migrated the database
# (deploy/migrate-to-supabase.sh) and deployed your edge functions to the
# new project.
#
# Usage (interactive):
#   sudo bash deploy/switch-to-supabase.sh
#
# Usage (unattended):
#   sudo SUPABASE_URL=https://abc.supabase.co \
#        SUPABASE_ANON_KEY=eyJhbGc... \
#        SUPABASE_PROJECT_ID=abc \
#        bash deploy/switch-to-supabase.sh
# ----------------------------------------------------------------------------
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/phantom-network}"
WEB_ROOT="${WEB_ROOT:-/var/www/phantom-network}"

if [[ $EUID -ne 0 ]]; then
  echo "Please run as root (sudo)." >&2
  exit 1
fi

if [[ ! -d "$APP_DIR" ]]; then
  echo "App directory not found at $APP_DIR" >&2
  echo "Set APP_DIR=/path/to/phantom-network and re-run." >&2
  exit 1
fi

if [[ -z "${SUPABASE_URL:-}" ]]; then
  read -r -p "New Supabase URL (https://<ref>.supabase.co): " SUPABASE_URL
fi
if [[ -z "${SUPABASE_ANON_KEY:-}" ]]; then
  read -r -p "New Supabase anon (publishable) key: " SUPABASE_ANON_KEY
fi
if [[ -z "${SUPABASE_PROJECT_ID:-}" ]]; then
  # Auto-derive project ref from URL if not provided
  SUPABASE_PROJECT_ID="$(echo "$SUPABASE_URL" | sed -E 's#https?://([^.]+)\..*#\1#')"
fi

echo
echo "==> Writing $APP_DIR/.env"
cat > "$APP_DIR/.env" <<EOF
VITE_SUPABASE_URL=$SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY=$SUPABASE_ANON_KEY
VITE_SUPABASE_PROJECT_ID=$SUPABASE_PROJECT_ID
EOF
chmod 600 "$APP_DIR/.env"

echo "==> Stopping local Supabase stack (no longer needed)"
if [[ -f "$APP_DIR/deploy/docker-compose.yml" ]]; then
  (cd "$APP_DIR/deploy" && docker compose down || true)
fi

echo "==> Installing deps & rebuilding frontend"
cd "$APP_DIR"
if command -v bun >/dev/null 2>&1; then
  bun install --frozen-lockfile
  bun run build
else
  npm ci
  npm run build
fi

echo "==> Publishing build to $WEB_ROOT"
mkdir -p "$WEB_ROOT"
rsync -a --delete "$APP_DIR/dist/" "$WEB_ROOT/"

echo "==> Reloading Nginx"
nginx -t && systemctl reload nginx

echo
echo "Done. Your site at https://phantomnetwork.online now talks to:"
echo "  $SUPABASE_URL"
echo
echo "Verify in the browser dev tools: Network tab should show requests to"
echo "${SUPABASE_URL}/rest/v1/... and /auth/v1/..."
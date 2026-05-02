# Self-Hosting the Phantom Network Frontend on Ubuntu

This guide installs the **frontend** of Phantom Network on your own Ubuntu
server. The **backend** (database, authentication, edge functions, file
storage) keeps running on **Lovable Cloud** — no data migration, no
Postgres to babysit, no edge runtime to maintain.

> Tested on Ubuntu **22.04 LTS** and **24.04 LTS** (x86_64 and arm64).
> Minimum server: 1 vCPU, 1 GB RAM, 10 GB disk. The build needs ~2 GB RAM —
> add swap on tiny VPS instances if `npm run build` gets killed.

---

## 1. Get the code onto the server

**Option A — Git clone (recommended, easy updates):**
```bash
sudo apt-get update && sudo apt-get install -y git
cd /opt
sudo git clone <your-repo-url> phantom-network
cd phantom-network
```

**Option B — rsync from your laptop:**
```bash
# On your local machine, from the project root:
rsync -avz --exclude node_modules --exclude dist ./ user@your-server:/opt/phantom-network/
ssh user@your-server
cd /opt/phantom-network
```

---

## 2. Run the installer

```bash
sudo bash deploy/install.sh
```

You will be asked for:

| Prompt | Example | Notes |
|---|---|---|
| Domain or hostname | `phantom.example.com` | Use `_` to accept any host (good for IP-only access) |
| Install directory | `/var/www/phantom-network` | Where the built static files live |
| Set up HTTPS? | `yes` | Skipped automatically when domain is `_` |
| Lets Encrypt email | `you@example.com` | Only asked when HTTPS is enabled |

The script will:

1. Install **Node.js 20**, **Nginx**, **rsync**, and **ufw** if missing.
2. Run `npm ci` (or `npm install`) and `npm run build`.
3. Copy `dist/` to your install directory.
4. Write `/etc/nginx/sites-available/phantom-network.conf` with proper
   **SPA fallback** (so deep links and page refresh work) and aggressive
   caching for hashed assets.
5. Open ports **80** and **443** in `ufw`.
6. (Optional) Request a free Lets Encrypt certificate via Certbot and turn
   on auto-renew.

---

## 3. Done

Visit your domain (or server IP) in a browser. You're talking to your own
Nginx, which serves the React app — and the React app talks directly to
Lovable Cloud for data, auth, and game logic. No extra proxy required.

---

## Updating later

When you publish new changes from Lovable, pull/copy the latest code to
the server and re-run the same script:

```bash
cd /opt/phantom-network
sudo git pull               # if you used git
sudo bash deploy/install.sh # rebuild + redeploy
```

The script is idempotent — re-running just refreshes the build and
reloads Nginx.

---

## Manual install (no script)

```bash
# 1. Install Node 20 + Nginx
sudo apt-get update
sudo apt-get install -y curl nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# 2. Build
cd /opt/phantom-network
npm ci
npm run build

# 3. Deploy static files
sudo mkdir -p /var/www/phantom-network
sudo rsync -a --delete dist/ /var/www/phantom-network/
sudo chown -R www-data:www-data /var/www/phantom-network

# 4. Nginx site (SPA fallback is the important bit)
sudo tee /etc/nginx/sites-available/phantom-network.conf >/dev/null <<'NGINX'
server {
    listen 80;
    server_name your.domain.com;
    root /var/www/phantom-network;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    location = /index.html {
        add_header Cache-Control "no-store, must-revalidate";
    }
    location / {
        try_files $uri $uri/ /index.html;
    }
}
NGINX

sudo ln -sf /etc/nginx/sites-available/phantom-network.conf \
            /etc/nginx/sites-enabled/phantom-network.conf
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

# 5. (Optional) HTTPS
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your.domain.com
```

---

## How it talks to Lovable Cloud

The Lovable Cloud URL and **publishable** anon key are baked into the
build at compile time from `.env`:

```
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...
VITE_SUPABASE_PROJECT_ID=<project-id>
```

These are **publishable** values — safe to ship in the bundle. RLS
policies in the database enforce all access control. **Do not** put
service-role keys or other secrets in `.env`; those belong in Lovable
Cloud edge function secrets.

If you ever want to point a self-hosted build at a *different* backend,
edit `.env` before running the installer and the new values will be
baked into the build.

---

## Troubleshooting

**`npm run build` is killed on a 1 GB VPS.** Add 2 GB swap:
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Page refresh on `/games/blackjack` shows 404.** Nginx is missing the
SPA fallback. Re-run the installer, or check that
`try_files $uri $uri/ /index.html;` is present.

**Certbot fails.** DNS must point at this server first. Verify with
`dig +short your.domain.com`, then re-run `sudo certbot --nginx -d your.domain.com`.

**Realtime / websockets don't connect.** The frontend talks directly to
`*.supabase.co` over 443 — your Nginx is not in that path, so the issue
is upstream (corporate firewall, ISP, etc.).

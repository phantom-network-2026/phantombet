# Phantom Network — One-Command Ubuntu Installer

Self-host the **entire** Phantom Network stack (frontend + database + auth +
realtime + storage + edge functions) on your own Ubuntu server.
No Lovable account required at runtime.

Tested on **Ubuntu 22.04 LTS** and **24.04 LTS**.
Minimum: 2 vCPU / 4 GB RAM / 20 GB disk.

---

## Quick start (3 steps)

### 1. Point DNS at your server
At your domain registrar, create two **A records** pointing to your server's
public IP:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `<your-server-ip>` |
| A | `www` | `<your-server-ip>` |

(Default domain baked into the installer is **`phantomnetwork.online`**.)

### 2. Get the code on the server
```bash
ssh root@your-server
cd /root
git clone <your-github-url> phantom-network
cd phantom-network
```

### 3. Run the installer
```bash
sudo bash deploy/install.sh
```

Press **Enter** at every prompt to accept the defaults
(`phantomnetwork.online`, HTTPS enabled).

That's it. In ~5 minutes you'll have:

- ✅ Full React frontend served by Nginx
- ✅ Self-hosted Supabase (Postgres 15, GoTrue, PostgREST, Realtime, Storage)
- ✅ All edge functions running locally on Deno
- ✅ Complete Phantom Network schema + seed data loaded
- ✅ Free Let's Encrypt SSL certificate (auto-renewing)
- ✅ Firewall configured (ports 22 / 80 / 443)
- ✅ Studio admin UI on `http://<server-ip>:3001`

---

## Fully unattended install

Skip every prompt — useful for CI / cloud-init / Ansible:
```bash
sudo UNATTENDED=yes \
     DOMAIN=phantomnetwork.online \
     EMAIL=admin@phantomnetwork.online \
     bash deploy/install.sh
```

## Different domain
```bash
sudo DOMAIN=mycasino.com EMAIL=me@mycasino.com bash deploy/install.sh
```

## HTTP only (no SSL, e.g. for local LAN)
```bash
sudo ENABLE_SSL=no DOMAIN=192.168.1.50 bash deploy/install.sh
```

---

## What gets installed where

| Path | Purpose |
|------|---------|
| `/opt/phantom-network/` | Source + docker-compose stack |
| `/var/www/phantom-network/` | Built static frontend served by Nginx |
| `/etc/nginx/sites-available/phantom-network` | Nginx vhost (frontend + `/api/` proxy to Kong) |
| `/opt/phantom-network/deploy/.secrets.env` | Generated Postgres / JWT / dashboard passwords (chmod 600) |
| Docker volumes `phantom_db_data`, `phantom_storage_data` | Persistent DB + uploaded files |

---

## Day-2 commands

```bash
# View running containers
cd /opt/phantom-network/deploy && docker compose ps

# Tail logs
docker compose logs -f db auth functions

# Restart whole stack
docker compose restart

# Stop / start
docker compose down
docker compose up -d

# Rebuild frontend after pulling new code
cd /opt/phantom-network && git pull
sudo bash deploy/install.sh         # safe to re-run

# Manual SSL renew (cron does this automatically)
sudo certbot renew

# Open Studio (admin DB UI) — login printed at end of install
ssh -L 3001:localhost:3001 root@your-server
# then visit http://localhost:3001
```

---

## Database backup & restore

```bash
# Backup
cd /opt/phantom-network/deploy
docker compose exec -T db pg_dump -U postgres postgres | gzip > ~/phantom-$(date +%F).sql.gz

# Restore
gunzip -c ~/phantom-2026-05-02.sql.gz | docker compose exec -T db psql -U postgres postgres
```

---

## What's bundled in `deploy/`

| File | Description |
|------|-------------|
| `install.sh` | The one-shot installer (idempotent — safe to re-run) |
| `docker-compose.yml` | The Supabase stack (db, auth, rest, realtime, storage, functions, studio, kong) |
| `kong.yml` | API gateway routing rules (mirrors official Supabase setup) |
| `db/01-schema.sql` | Full public schema dump (tables, RLS, functions, triggers) |
| `db/02-seed.sql` | Seed data: site_settings, exchange_coins, games |
| `.secrets.env` | Auto-generated on first run — keep this safe |
| `.env` | Auto-generated docker-compose env file |

---

## Troubleshooting

**`certbot` failed**
DNS hasn't propagated yet. Wait a few minutes and run:
```bash
sudo certbot --nginx -d phantomnetwork.online -d www.phantomnetwork.online
```

**Build was killed (out of memory)**
Add 2 GB swap on small VPS:
```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**Migrating off Lovable Cloud**
Export your live data from Lovable Cloud → Database → export each table as
CSV, then import via Studio (`http://<server-ip>:3001` → Table Editor →
Import).

**Need to point the frontend at a different backend later**
Edit `/opt/phantom-network/.env`, change `VITE_SUPABASE_URL` /
`VITE_SUPABASE_PUBLISHABLE_KEY`, then re-run `sudo bash deploy/install.sh`.
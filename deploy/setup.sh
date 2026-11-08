#!/usr/bin/env bash
# BadgeFit server setup, for a fresh Ubuntu 22.04/24.04 server. Run as root (or with sudo):
#
#   curl -fsSL https://raw.githubusercontent.com/Mokedad/Police-Training-App/claude/police-fitness-app-6cw4hy/deploy/setup.sh | sudo bash
#
# or from a copy of the repository:   sudo bash deploy/setup.sh
#
# It installs Docker if needed, gets the code, asks for your domains, writes deploy/.env,
# prepares the website, opens the firewall, starts everything and sets a nightly backup.
# Safe to run again: it updates the code and restarts with your existing settings.
set -euo pipefail

REPO="${BADGEFIT_REPO:-https://github.com/Mokedad/Police-Training-App.git}"
BRANCH="${BADGEFIT_BRANCH:-claude/police-fitness-app-6cw4hy}"
DIR="${BADGEFIT_DIR:-/opt/badgefit}"

say() { printf '\n\033[1;34m==>\033[0m %s\n' "$*"; }
die() { printf '\n\033[1;31mError:\033[0m %s\n' "$*" >&2; exit 1; }

[ "$(id -u)" -eq 0 ] || die "run this as root: sudo bash $0"

say "Docker"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
docker compose version >/dev/null 2>&1 || die "Docker Compose v2 is missing (apt install docker-compose-plugin)"
command -v git >/dev/null 2>&1 || { apt-get update -y && apt-get install -y git; }

say "Code ($BRANCH)"
if [ -d "$DIR/.git" ]; then
  git -C "$DIR" fetch --depth 1 origin "$BRANCH"
  git -C "$DIR" checkout -q -B "$BRANCH" FETCH_HEAD
else
  git clone --depth 1 --branch "$BRANCH" "$REPO" "$DIR"
fi
cd "$DIR/deploy"

if [ ! -f .env ]; then
  say "Your settings"
  ask() { local v; read -r -p "$1: " v </dev/tty; [ -n "$v" ] || die "$1 is required"; printf '%s' "$v"; }
  SITE=$(ask "Website domain (e.g. badgefit.com.au)")
  read -r -p "App domain [app.$SITE]: " APP </dev/tty || APP=""
  APP=${APP:-app.$SITE}
  EMAIL=$(ask "Your email (for HTTPS certificate notices)")
  read -r -p "Spotify Client ID (Enter to skip): " SPOT </dev/tty || SPOT=""
  sed -e "s|^SITE_DOMAIN=.*|SITE_DOMAIN=$SITE|" \
      -e "s|^APP_DOMAIN=.*|APP_DOMAIN=$APP|" \
      -e "s|^ACME_EMAIL=.*|ACME_EMAIL=$EMAIL|" \
      -e "s|^RP_ID=.*|RP_ID=$APP|" \
      -e "s|^ORIGIN=.*|ORIGIN=https://$APP|" \
      -e "s|^SPOTIFY_CLIENT_ID=.*|SPOTIFY_CLIENT_ID=$SPOT|" .env.example > .env
  chmod 600 .env
fi
# Settings added in later versions, appended to an older .env with their defaults.
grep -q '^PASSKEYS=' .env || echo 'PASSKEYS=0' >> .env
for k in GOOGLE_CLIENT_ID GOOGLE_CLIENT_SECRET APPLE_SERVICES_ID APPLE_TEAM_ID APPLE_KEY_ID APPLE_PRIVATE_KEY; do
  grep -q "^$k=" .env || echo "$k=" >> .env
done
# shellcheck disable=SC1091
set -a; . ./.env; set +a

say "Checking DNS"
IP=$(curl -fsS https://api.ipify.org || true)
for d in "$SITE_DOMAIN" "$APP_DOMAIN"; do
  got=$(getent ahostsv4 "$d" | awk 'NR==1{print $1}')
  if [ -n "$IP" ] && [ "$got" != "$IP" ]; then
    echo "  $d points to '${got:-nothing}', this server is $IP."
    echo "  Add an A record for $d → $IP at your domain registrar, wait a few minutes, then run this again."
    echo "  (HTTPS certificates cannot be issued until it points here.)"
  else
    echo "  $d → ${got:-?} ok"
  fi
done

say "Website"
rm -rf site && cp -r ../badgefit-site site
APP_URL="https://$APP_DOMAIN/"
sed -i -e "s|APP_URL|$APP_URL|g" -e "s|SOURCE_URL|${REPO%.git}|g" site/index.html
for k in INSTAGRAM_URL TIKTOK_URL YOUTUBE_URL; do
  v=$(grep "^$k=" .env 2>/dev/null | cut -d= -f2- || true)
  sed -i "s|$k|${v:-#}|g" site/index.html
done
mkdir -p data coach-auth caddy-data caddy-config

say "Firewall"
if command -v ufw >/dev/null 2>&1; then
  ufw allow OpenSSH >/dev/null; ufw allow 80/tcp >/dev/null; ufw allow 443/tcp >/dev/null; ufw allow 443/udp >/dev/null
  ufw --force enable >/dev/null
  echo "  open: SSH, 80, 443"
fi

say "Building and starting (the first build takes a few minutes)"
docker compose --env-file .env up -d --build
docker image prune -f >/dev/null

say "Nightly backup at 03:17"
chmod +x backup.sh
# A fresh server has no crontab: `crontab -l` fails and grep then matches nothing, so both are
# allowed to fail here, or `set -e` stops the script before it finishes.
{ crontab -l 2>/dev/null | grep -v badgefit-backup || true; echo "17 3 * * * $DIR/deploy/backup.sh >/var/log/badgefit-backup.log 2>&1 # badgefit-backup"; } | crontab -

say "Done"
cat <<EOF
  Website:  https://$SITE_DOMAIN
  App:      https://$APP_DOMAIN

  Next:
   1. Open https://$APP_DOMAIN and create YOUR profile first: the first one becomes the admin.
   2. Jarvis: Settings → Admin dashboard → AI Coach → choose a provider and paste its API key.
   3. On your phone: open the app address in Safari/Chrome → Share → Add to Home Screen.

  Logs:    cd $DIR/deploy && docker compose logs -f
  Update:  sudo bash $DIR/deploy/setup.sh
EOF

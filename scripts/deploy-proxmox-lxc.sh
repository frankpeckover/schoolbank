#!/usr/bin/env bash
set -euo pipefail

# Run this inside the Ubuntu Proxmox/LXC container that hosts the app.
# It expects Node.js 20+ and git to already be installed.

APP_NAME="${APP_NAME:-myntix}"
APP_DIR="${APP_DIR:-/opt/myntix/app}"
APP_USER="${APP_USER:-myntix}"
BRANCH="${BRANCH:-main}"
PORT="${PORT:-3000}"
REPO_URL="${REPO_URL:-https://github.com/frankpeckover/schoolbank.git}"
SERVICE_NAME="${SERVICE_NAME:-myntix}"

if ! command -v git >/dev/null 2>&1; then
  echo "git is required. Install it first: sudo apt install git"
  exit 1
fi

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js 20+ is required. Install Node before running this script."
  exit 1
fi

NODE_MAJOR="$(node -p "Number(process.versions.node.split('.')[0])")"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "Node.js 20+ is required. Current version: $(node --version)"
  exit 1
fi

if ! id "$APP_USER" >/dev/null 2>&1; then
  useradd --system --create-home --shell /usr/sbin/nologin "$APP_USER"
fi

mkdir -p "$(dirname "$APP_DIR")"

if [ -d "$APP_DIR/.git" ]; then
  git -C "$APP_DIR" fetch origin "$BRANCH"
  git -C "$APP_DIR" checkout "$BRANCH"
  git -C "$APP_DIR" pull --ff-only origin "$BRANCH"
else
  git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

if [ ! -f "$APP_DIR/.env.production" ] && [ ! -f "$APP_DIR/.env.local" ]; then
  echo "Missing $APP_DIR/.env.production or $APP_DIR/.env.local"
  echo "Create one from .env.example and add the production values before starting the service."
  exit 1
fi

chown -R "$APP_USER:$APP_USER" "$APP_DIR"

sudo -u "$APP_USER" bash -lc "cd '$APP_DIR' && npm ci && npm run check:env && npm run build"

cat >"/etc/systemd/system/${SERVICE_NAME}.service" <<SERVICE
[Unit]
Description=${APP_NAME} Next.js app
After=network.target

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=NODE_ENV=production
Environment=PORT=${PORT}
ExecStart=/usr/bin/npm run start -- --hostname 0.0.0.0 --port ${PORT}
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"
systemctl --no-pager --full status "$SERVICE_NAME"

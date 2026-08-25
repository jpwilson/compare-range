#!/usr/bin/env bash
# One-command deploy to a Hetzner (or any) box with Docker installed.
#   ./deploy/deploy.sh root@1.2.3.4 [comparerange.com]
# Copies the source over rsync, builds the image on the box, and (re)starts it.
set -euo pipefail
HOST="${1:?usage: deploy.sh user@host [domain]}"
DOMAIN="${2:-}"
DIR="${REMOTE_DIR:-/opt/compare-range}"
cd "$(dirname "$0")/.."

ssh "$HOST" "command -v docker >/dev/null || (curl -fsSL https://get.docker.com | sh); mkdir -p '$DIR'"
rsync -az --delete --exclude node_modules --exclude dist --exclude .git --exclude design ./ "$HOST:$DIR/"
ssh "$HOST" "cd '$DIR' && { [ -n '$DOMAIN' ] && echo 'SITE_ADDRESS=$DOMAIN' > .env || rm -f .env; } && docker compose up -d --build --remove-orphans && docker image prune -f >/dev/null"
echo "Deployed. ${DOMAIN:+https://$DOMAIN}${DOMAIN:-http://${HOST#*@}}"

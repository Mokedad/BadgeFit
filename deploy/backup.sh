#!/usr/bin/env bash
# Nightly backup of everything people created: accounts, passkeys, training data, the community
# feed and uploaded photos (deploy/data). Keeps the last 14 in deploy/backups/.
# Copy that folder off the server now and then (e.g. scp, or rclone to Google Drive): a backup
# on the same disk does not survive the disk.
set -euo pipefail
cd "$(dirname "$0")"
mkdir -p backups
stamp=$(date +%Y-%m-%d_%H%M)
tar czf "backups/badgefit-$stamp.tar.gz" data .env
ls -1t backups/badgefit-*.tar.gz | tail -n +15 | xargs -r rm --
echo "backup ok: backups/badgefit-$stamp.tar.gz"

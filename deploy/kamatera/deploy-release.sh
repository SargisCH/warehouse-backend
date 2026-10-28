#!/usr/bin/env bash
set -euo pipefail
umask 027
release="${1:?Pass a release ID}"
[[ "$release" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || { echo 'Invalid release ID' >&2; exit 1; }
root=/srv/warehouse-api
exec 9>"$root/deploy.lock"
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
archive="$root/incoming/$release.tar.gz"
destination="$root/releases/$release"
test -r "$root/shared/.env"
test -r "$archive"
command -v node
command -v npm
command -v pm2
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 24 ]] || { echo 'Node 24 required' >&2; exit 1; }
previous="$(readlink -f "$root/current" || true)"
mkdir "$destination"
tar -xzf "$archive" -C "$destination" --no-same-owner
ln -s "$root/shared/.env" "$destination/.env"
ln -s "$root/shared/storage" "$destination/storage"
cd "$destination"
npm ci --omit=dev --no-audit --no-fund
node dist/src/drizzle/migrate.js
rollback() {
  echo 'Activation failed; restoring previous code (database migrations remain applied).' >&2
  if [[ -n "$previous" && -f "$previous/deploy/kamatera/ecosystem.config.cjs" ]]; then
    pm2 startOrRestart "$previous/deploy/kamatera/ecosystem.config.cjs" --update-env
    pm2 save
  else
    pm2 delete warehouse-api || true
  fi
}
trap rollback ERR
pm2 startOrRestart "$destination/deploy/kamatera/ecosystem.config.cjs" --update-env
port="$(node -e 'require("dotenv").config(); const p = process.env.PORT || "3300"; if (!/^\d+$/.test(p)) process.exit(1); process.stdout.write(p)')"
healthy=false
for attempt in {1..15}; do
  sleep 2
  if curl --fail --silent --output /dev/null "http://127.0.0.1:$port/api/v1/"; then
    healthy=true
    break
  fi
done
[[ "$healthy" == true ]]
pm2 save
ln -s "$destination" "$root/current.next"
mv -Tf "$root/current.next" "$root/current"
trap - ERR
rm -f "$archive"
echo "Activated $release"

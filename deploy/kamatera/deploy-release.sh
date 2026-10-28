#!/usr/bin/env bash
set -euo pipefail
umask 027
stage='checking server prerequisites'
trap 'status=$?; echo "Deployment failed while $stage (exit $status)" >&2; exit "$status"' ERR
fail() { echo "Deployment error: $*" >&2; exit 1; }
echo 'Server deployment started.'
release="${1:?Pass a release ID}"
[[ "$release" =~ ^[a-f0-9]{40}-[0-9]+-[0-9]+$ ]] || { echo 'Invalid release ID' >&2; exit 1; }
root=/srv/warehouse-api
exec 9>"$root/deploy.lock"
flock -n 9 || { echo 'Another deployment is running' >&2; exit 1; }
archive="$root/incoming/$release.tar.gz"
destination="$root/releases/$release"
test -r "$root/shared/.env" || fail "Missing or unreadable $root/shared/.env for SSH user $(id -un). Create this file with the production environment settings."
test -r "$archive" || fail "Missing or unreadable release archive: $archive"
for directory in "$root/releases" "$root/shared/storage"; do
  test -d "$directory" && test -w "$directory" || fail "Missing or unwritable directory: $directory for SSH user $(id -un)"
done
for tool in node npm pm2 curl tar flock; do
  command -v "$tool" >/dev/null || fail "$tool is unavailable in the non-interactive SSH PATH."
done
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 24 ]] || { echo 'Node 24 required' >&2; exit 1; }
previous="$(readlink -f "$root/current" || true)"
stage='extracting the release'
echo 'Extracting release...'
mkdir "$destination"
tar -xzf "$archive" -C "$destination" --no-same-owner
ln -s "$root/shared/.env" "$destination/.env"
ln -s "$root/shared/storage" "$destination/storage"
cd "$destination"
stage='installing runtime dependencies'
echo 'Installing runtime dependencies...'
npm ci --omit=dev --no-audit --no-fund
stage='applying database migrations'
echo 'Applying database migrations...'
node dist/src/drizzle/migrate.js
rollback() {
  echo "Deployment failed while $stage." >&2
  echo 'Activation failed; restoring previous code (database migrations remain applied).' >&2
  if [[ -n "$previous" && -f "$previous/deploy/kamatera/ecosystem.config.cjs" ]]; then
    pm2 startOrRestart "$previous/deploy/kamatera/ecosystem.config.cjs" --update-env
    pm2 save
  else
    pm2 delete warehouse-api || true
  fi
}
trap rollback ERR
stage='starting the API with PM2'
echo 'Starting API with PM2...'
pm2 startOrRestart "$destination/deploy/kamatera/ecosystem.config.cjs" --update-env
stage='checking API startup'
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
stage='saving the active release'
pm2 save
ln -s "$destination" "$root/current.next"
mv -Tf "$root/current.next" "$root/current"
trap - ERR
rm -f "$archive"
echo "Activated $release"

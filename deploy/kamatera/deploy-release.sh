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
# Non-interactive SSH does not load the deployment user's shell startup files.
deployment_nvm_dir="${NVM_DIR:-$HOME/.nvm}"
if [[ -s "$deployment_nvm_dir/nvm.sh" ]]; then
  echo 'Loading Node 24 from nvm...'
  export NVM_DIR="$deployment_nvm_dir"
  set +u
  source "$NVM_DIR/nvm.sh" --no-use || fail 'Unable to load nvm.'
  nvm use 24 --silent || fail 'Install Node 24 for the deployment user with: nvm install 24'
  set -u
fi
for tool in node npm pm2 curl tar flock; do
  command -v "$tool" >/dev/null || fail "$tool is unavailable in the non-interactive SSH PATH."
done
[[ "$(node -p 'process.versions.node.split(".")[0]')" == 24 ]] || { echo 'Node 24 required' >&2; exit 1; }
deployment_node="$(node -p 'process.execPath')"
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
# PM2 may keep a previously registered absolute script path on restart. Check
# process metadata rather than treating a successful HTTP response as activation.
api_matches_release() {
  pm2 jlist | node -e '
    const fs = require("fs");
    const path = require("path");
    const target = path.resolve(process.argv[1]);
    const apps = JSON.parse(fs.readFileSync(0, "utf8"))
      .filter(app => app.name === "warehouse-api");
    const env = apps[0]?.pm2_env;
    const matches = apps.length === 1 &&
      env.pm_exec_path === path.join(target, "dist/src/main.js") &&
      env.pm_cwd === target &&
      env.exec_interpreter === process.execPath &&
      (process.argv[2] !== "online" || env.status === "online");
    process.exit(matches ? 0 : 1);
  ' "$1" "${2:-paths}"
}

start_release() {
  local target="$1"
  local config="$target/deploy/kamatera/ecosystem.config.cjs"
  pm2 startOrRestart "$config" --interpreter "$deployment_node" --update-env || return
  if ! api_matches_release "$target"; then
    echo 'PM2 retained stale API configuration; recreating warehouse-api.'
    if pm2 describe warehouse-api >/dev/null 2>&1; then
      pm2 delete warehouse-api || return
    fi
    pm2 start "$config" --only warehouse-api --interpreter "$deployment_node" --update-env || return
  fi
  api_matches_release "$target"
}

rollback() {
  local deploy_status=$?
  trap - ERR
  echo "Deployment failed while $stage." >&2
  echo 'Activation failed; restoring previous code (database migrations remain applied).' >&2
  if [[ -n "$previous" && -f "$previous/deploy/kamatera/ecosystem.config.cjs" ]]; then
    if start_release "$previous"; then
      pm2 save || echo 'Failed to save restored PM2 configuration.' >&2
    else
      echo 'Failed to restore the previous API release.' >&2
    fi
  else
    pm2 delete warehouse-api || true
  fi
  exit "$deploy_status"
}
trap rollback ERR
stage='starting the API with PM2'
echo 'Starting API with PM2...'
start_release "$destination"
stage='checking API startup'
port="$(node -e 'require("dotenv").config(); const p = process.env.PORT || "3300"; if (!/^\d+$/.test(p)) process.exit(1); process.stdout.write(p)')"
healthy=false
for attempt in {1..15}; do
  sleep 2
  if api_matches_release "$destination" online &&
    curl --fail --silent --output /dev/null "http://127.0.0.1:$port/api/v1/"; then
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

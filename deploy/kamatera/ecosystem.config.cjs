const path = require('path');
const fs = require('fs');
const release = path.resolve(__dirname, '../..');
const workerEnv = '/srv/warehouse-api/shared/.env.worker';
module.exports = {
  apps: [{
    name: 'warehouse-api',
    cwd: release,
    script: path.join(release, 'dist/src/main.js'),
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    time: true,
    min_uptime: '10s',
    max_restarts: 5,
    env: { NODE_ENV: 'production' },
  }, ...(fs.existsSync(workerEnv) ? [{
    name: 'warehouse-assistant-worker',
    cwd: release,
    script: path.join(release, 'dist/scripts/assistant-worker.js'),
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    time: true,
    min_uptime: '10s',
    max_restarts: 5,
    env: {
      NODE_ENV: 'production',
      DOTENV_CONFIG_PATH: workerEnv,
    },
  }] : [])],
};

const path = require('path');
const release = path.resolve(__dirname, '../..');
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
  }],
};

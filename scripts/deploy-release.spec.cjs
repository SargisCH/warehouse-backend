const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const script = fs.readFileSync(path.join(__dirname, '../deploy/kamatera/deploy-release.sh'), 'utf8');
const helpers = script.slice(script.indexOf('api_matches_release() {'), script.indexOf('trap rollback ERR'));

function run(mode, invocation = 'start_release "$TEST_TARGET"') {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'warehouse-deploy-'));
  try {
    const target = path.join(directory, 'new-release');
    fs.mkdirSync(path.join(target, 'deploy/kamatera'), { recursive: true });
    fs.writeFileSync(path.join(target, 'deploy/kamatera/ecosystem.config.cjs'), 'module.exports = {};');
    const callsFile = path.join(directory, 'calls');
    const stateFile = path.join(directory, 'state');
    const fake = path.join(directory, 'pm2');
    fs.writeFileSync(fake, `#!${process.execPath}
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2), action = args[0], mode = process.env.TEST_MODE;
fs.appendFileSync(process.env.TEST_CALLS, JSON.stringify(args) + '\\n');
const record = (target, interpreter = process.execPath, status = 'online') => [{name:'warehouse-api',pm2_env:{pm_exec_path:path.join(target,'dist/src/main.js'),pm_cwd:target,exec_interpreter:interpreter,status}}];
const save = value => fs.writeFileSync(process.env.TEST_STATE, JSON.stringify(value));
if(action === 'startOrRestart') {
  if(mode === 'restart-fails') process.exit(9);
  const target = mode === 'correct' || mode === 'wrong-interpreter' ? process.env.TEST_TARGET : '/old-release';
  save(record(target, mode === 'wrong-interpreter' ? '/old-node' : process.execPath));
} else if(action === 'start') {
  if(mode === 'start-fails') process.exit(8);
  save(record(mode === 'retains-old-path' ? '/old-release' : process.env.TEST_TARGET, process.execPath, mode === 'offline' ? 'stopped' : 'online'));
} else if(action === 'jlist') {
  process.stdout.write(fs.readFileSync(process.env.TEST_STATE));
} else if(action === 'describe') {
  process.exit(fs.existsSync(process.env.TEST_STATE) ? 0 : 1);
} else if(action === 'delete') {
  if(mode === 'delete-fails') process.exit(7);
  save([]);
} else if(action !== 'save') process.exit(10);
`, { mode: 0o755 });
    const result = spawnSync('bash', ['-c', `set -euo pipefail\ndeployment_node="$TEST_NODE"\n${helpers}\n${invocation}`], {
      env: { ...process.env, PATH: directory + path.delimiter + process.env.PATH, TEST_MODE: mode, TEST_CALLS: callsFile, TEST_STATE: stateFile, TEST_TARGET: target, TEST_NODE: process.execPath },
      encoding: 'utf8',
    });
    const calls = fs.existsSync(callsFile) ? fs.readFileSync(callsFile, 'utf8').trim().split('\n').map(JSON.parse) : [];
    return { ...result, calls };
  } finally {
    fs.rmSync(directory, { recursive: true, force: true });
  }
}

test('a matching release does not recreate the API', () => {
  const result = run('correct');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.calls.some(args => args[0] === 'delete'), false);
});

for (const mode of ['stale-path', 'wrong-interpreter']) {
  test(`recreates only warehouse-api when PM2 keeps ${mode}`, () => {
    const result = run(mode);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.calls.find(args => args[0] === 'delete'), ['delete', 'warehouse-api']);
    const start = result.calls.find(args => args[0] === 'start');
    assert.equal(start[start.indexOf('--only') + 1], 'warehouse-api');
    assert.equal(start[start.indexOf('--interpreter') + 1], process.execPath);
  });
}

for (const mode of ['retains-old-path', 'restart-fails', 'start-fails', 'delete-fails']) {
  test(`fails activation instead of accepting ${mode}`, () => {
    const result = run(mode);
    assert.notEqual(result.status, 0);
  });
}

test('an offline process cannot pass the final release check', () => {
  const result = run('offline', 'start_release "$TEST_TARGET"\napi_matches_release "$TEST_TARGET" online');
  assert.notEqual(result.status, 0);
});

for (const mode of ['stale-path', 'restart-fails']) {
  test(`rollback preserves the original failure when recovery uses ${mode}`, () => {
    const result = run(mode, 'previous="$TEST_TARGET"\nstage="checking startup"\ntrap rollback ERR\nbash -c "exit 42"\necho unexpected-success');
    assert.equal(result.status, 42);
    assert.ok(result.calls.some(args => args[0] === 'startOrRestart'), result.stderr);
    if (mode === 'stale-path') assert.ok(result.calls.some(args => args[0] === 'save'));
  });
}

const { spawn } = require('child_process');
const path = require('path');

const root = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const spawnOptions = { cwd: root, stdio: 'inherit', shell: process.platform === 'win32' };

const processes = [
  spawn(npmCommand, ['run', 'server'], spawnOptions),
  spawn(npmCommand, ['run', 'client', '--', '--host', '127.0.0.1'], spawnOptions),
];

let shuttingDown = false;

function shutdown(code = 0) {
  if (shuttingDown) return;
  shuttingDown = true;
  for (const child of processes) {
    if (!child.killed) child.kill();
  }
  process.exit(code);
}

for (const child of processes) {
  child.on('exit', (code) => {
    if (!shuttingDown && code !== 0) shutdown(code || 1);
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

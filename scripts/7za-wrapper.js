const { spawn } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
const real7za = path.join(
  __dirname, '..', 'node_modules', '7zip-bin', 'win', 'x64', '7za.exe'
);

const child = spawn(real7za, args, { stdio: ['inherit', 'pipe', 'pipe'] });

let stderr = '';

child.stderr.on('data', (data) => {
  stderr += data.toString();
  process.stderr.write(data);
});

child.stdout.on('data', (data) => {
  process.stdout.write(data);
});

child.on('close', (code) => {
  // Exit code 2 with symlink errors = extraction succeeded but symlinks failed
  // This is expected on Windows without admin/Developer Mode
  if (code === 2 && stderr.includes('Cannot create symbolic link')) {
    process.exit(0);
  }
  process.exit(code);
});

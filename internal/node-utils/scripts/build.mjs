import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';

// The deployment image may run workspace stub scripts before pnpm has linked
// optional/transitive tooling dependencies. Keep the checked-in runtime stub
// usable in that phase; a normal local install still rebuilds declarations.
if (
  !existsSync(new URL('../node_modules/dayjs/package.json', import.meta.url))
) {
  console.log(
    '[node-utils] workspace dependencies are not linked during filtered deployment install; keeping the checked-in stub',
  );
  process.exit(0);
}

const pnpmCommand =
  process.env.npm_execpath && process.env.npm_execpath.endsWith('.cjs')
    ? [process.execPath, process.env.npm_execpath]
    : ['pnpm'];

const steps = [
  ['exec', 'tsdown', '--no-dts'],
  [
    'exec',
    'tsc',
    '-p',
    'tsconfig.build.json',
    '--emitDeclarationOnly',
    '--declaration',
    '--outDir',
    'dist',
  ],
];

for (const args of steps) {
  const [command, ...commandArgs] = pnpmCommand;
  let cmd = command;
  if (cmd.includes(' ')) {
    cmd = `"${command}"`;
  }
  const result = spawnSync(cmd, [...commandArgs, ...args], {
    shell: true,
    stdio: 'inherit',
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

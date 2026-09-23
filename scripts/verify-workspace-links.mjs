import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const checks = new Set();

async function exists(file) {
  try {
    await access(file);
    return true;
  } catch {
    return false;
  }
}

async function walk(dir) {
  const { readdir } = await import('node:fs/promises');
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.name === 'package.json') checks.add(full);
  }
}

await walk(path.join(root, 'packages'));
await walk(path.join(root, 'apps'));

const missing = [];
for (const manifest of checks) {
  const pkg = JSON.parse(await readFile(manifest, 'utf8'));
  const deps = { ...pkg.dependencies, ...pkg.optionalDependencies };
  for (const [name, version] of Object.entries(deps)) {
    if (!String(version).startsWith('workspace:')) continue;
    const link = path.join(
      path.dirname(manifest),
      'node_modules',
      ...name.split('/'),
    );
    if (!(await exists(link)))
      missing.push(`${pkg.name ?? manifest} -> ${name}`);
  }
}

if (missing.length > 0) {
  console.error('[runtime] missing workspace links:');
  for (const item of missing) console.error(`  ${item}`);
  process.exit(1);
}
console.log(`[runtime] verified workspace links for ${checks.size} packages`);

import { constants } from 'node:fs';
import { access, cp, mkdir, rm } from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const packagesDir = path.join(root, 'packages');
const backupDir = path.join(root, 'internal', 'vendor-vben');
const marker = path.join(packagesDir, 'effects', 'access', 'package.json');
const backupMarker = path.join(backupDir, 'effects', 'access', 'package.json');

async function exists(file) {
  try {
    await access(file, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

if (await exists(marker)) {
  console.log('[workspace-recovery] shared packages are present');
  process.exit(0);
}

if (!(await exists(backupMarker))) {
  throw new Error(
    '[workspace-recovery] packages/ is missing and internal/vendor-vben is unavailable',
  );
}

console.log('[workspace-recovery] restoring shared packages from internal/vendor-vben');
await rm(packagesDir, { recursive: true, force: true });
await mkdir(packagesDir, { recursive: true });
await cp(backupDir, packagesDir, { recursive: true });
console.log('[workspace-recovery] shared packages restored successfully');

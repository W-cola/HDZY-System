import fs from 'node:fs/promises';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
const root = path.resolve(process.cwd());
const rootDataDir = path.resolve(root, '../../data/pg');
const dataDir = path.resolve(process.env.PGLITE_DATA_DIR ?? rootDataDir);
let close, db;
if (process.env.DATABASE_URL) {
  db = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  close = () => db.end();
} else {
  await fs.mkdir(dataDir, { recursive: true });
  db = new PGlite(dataDir);
  await db.waitReady;
  close = () => db.close();
}
try {
  await db.query(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())',
  );
  const dir = path.join(root, 'db/migrations');
  for (const file of (await fs.readdir(dir))
    .filter((x) => /^\d+_.*\.sql$/.test(x))
    .sort()) {
    const version = file.split('_', 1)[0];
    if (
      (
        await db.query('SELECT 1 FROM schema_migrations WHERE version=$1', [
          version,
        ])
      ).rows.length > 0
    )
      continue;
    const sql = await fs.readFile(path.join(dir, file), 'utf8');
    if (typeof db.exec === 'function') await db.exec(sql);
    else await db.query(sql);
    await db.query('INSERT INTO schema_migrations(version) VALUES($1)', [
      version,
    ]);
    console.log(`applied ${file}`);
  }
  console.log('数据库迁移完成');
} finally {
  await close();
}

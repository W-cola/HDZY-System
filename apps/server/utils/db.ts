import fs from 'node:fs/promises';
import path from 'node:path';

import { PGlite } from '@electric-sql/pglite';
import pg from 'pg';
// 平台从工作区根目录启动服务，统一使用根目录 data/pg；不要依赖编译产物的 import.meta.url。
const WORKSPACE_ROOT =
  path.basename(process.cwd()) === 'server'
    ? path.resolve(process.cwd(), '../..')
    : path.resolve(process.cwd());
const DEFAULT_PGLITE_DATA_DIR = path.join(WORKSPACE_ROOT, 'data/pg');

function getConfiguredPglitePath() {
  const configured = process.env.PGLITE_DATA_DIR;
  const dataDir = path.resolve(configured ?? DEFAULT_PGLITE_DATA_DIR);
  const rootDataDir = path.join(WORKSPACE_ROOT, 'data/pg');
  if (dataDir !== rootDataDir)
    throw new Error(`PGlite 仅允许使用工作区根目录数据库：${rootDataDir}`);
  return dataDir;
}

let pool: pg.Pool | undefined;
let localDb: PGlite | undefined;
let localDbPromise: Promise<PGlite> | undefined;
let localDbPath: string | undefined;

function assertSingleLocalPath(dataDir: string) {
  if (localDbPath && localDbPath !== dataDir)
    throw new Error(
      `PGlite 数据目录已锁定为 ${localDbPath}，禁止切换到 ${dataDir}`,
    );
  localDbPath = dataDir;
}

function isProductionDatabase() {
  return Boolean(process.env.DATABASE_URL);
}

export function getPool() {
  if (!isProductionDatabase()) return null;
  pool ??= new pg.Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
  return pool;
}

export async function getDatabase() {
  const production = getPool();
  if (production) return production;
  localDbPromise ??= (async () => {
    const dataDir = getConfiguredPglitePath();
    assertSingleLocalPath(dataDir);
    await fs.mkdir(dataDir, { recursive: true });
    localDb ??= new PGlite(dataDir);
    await localDb.waitReady;
    return localDb;
  })();
  return localDbPromise;
}

export function getDatabaseMode() {
  return getPool() ? 'postgresql' : 'pglite';
}

export async function closeDatabase() {
  const currentPool = pool;
  pool = undefined;
  if (currentPool) await currentPool.end();
  const currentDb = localDb;
  localDb = undefined;
  localDbPromise = undefined;
  if (currentDb) await currentDb.close();
}

export async function query<T = any>(text: string, values: any[] = []) {
  const db = await getDatabase();
  if (db instanceof PGlite) {
    return db.query<T>(text, values);
  }
  return db.query<T>(text, values);
}

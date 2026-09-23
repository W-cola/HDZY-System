import { getDatabase } from './db';
import {
  ensureSystemMenuEntries,
  systemMenus,
  systemSettings,
} from './system-data';
type Database = Awaited<ReturnType<typeof getDatabase>>;
let initialized = false;
let initializing: Promise<void> | undefined;
export function getLastPersistError() {
  return undefined;
}
export function initializeSystemData() {
  initializing ??= initialize();
  return initializing;
}
async function ensureDefaultRolePermissions(db: Database) {
  const defaultRoles = [
    ['admin', 'admin', '管理员', 'allReadOwnWrite'],
    ['sales-director', 'sales-director', '销售总监', 'department'],
    ['sales', 'sales', '销售', 'self'],
    ['finance', 'finance', '财务', 'all'],
    ['delivery', 'delivery', '交付', 'department'],
    ['project-manager', 'project-manager', '项目经理', 'department'],
    ['hr', 'hr', '人力资源', 'hrOnly'],
    ['leader', 'leader', '领导', 'allRead'],
  ];
  for (const [id, code, name, scope] of defaultRoles)
    await db.query(
      'INSERT INTO sys_role(id,code,name,builtin,status,data_scope,remark) VALUES($1,$2,$3,false,1,$4,$5) ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name,status=1,data_scope=EXCLUDED.data_scope',
      [id, code, name, scope, '基础角色'],
    );
  const superRole = await db.query<{ id: string }>(
    "SELECT id FROM sys_role WHERE code='super' AND status=1",
  );
  if (superRole.rows[0])
    await db.query(
      'INSERT INTO sys_role_menu(role_id,menu_id) SELECT $1,id FROM sys_menu WHERE status=1 ON CONFLICT DO NOTHING',
      [superRole.rows[0].id],
    );
  const customerPages = [
    'm-customer',
    'm-customer-list',
    'm-customer-transfer',
    'm-contact',
    'm-follow-up',
    'm-opportunity',
  ];
  const contractPages = [
    'm-contract',
    'm-contract-list',
    'm-invoice',
    'm-payment',
  ];
  const analyticsPages = ['m-analytics-center', 'm-sales-analytics'];
  const defaults: Record<string, string[]> = {
    admin: [...customerPages, ...contractPages, ...analyticsPages, 'm-hr'],
    hr: ['m-hr', 'm-employees'],
    leader: [...customerPages, ...contractPages, ...analyticsPages],
    sales: customerPages.concat([
      'm-contract',
      'm-contract-list',
      ...analyticsPages,
    ]),
    'sales-director': customerPages.concat([
      'm-contract',
      'm-contract-list',
      ...analyticsPages,
    ]),
    delivery: ['m-contract', 'm-contract-list'],
    'project-manager': ['m-contract', 'm-contract-list'],
    finance: [
      'm-contract',
      'm-contract-list',
      'm-invoice',
      'm-payment',
      ...analyticsPages,
    ],
  };
  const actionDefaults: Record<string, string[]> = {
    admin: [
      'customer:create',
      'customer:view',
      'customer:update',
      'customer:delete',
      'contact:create',
      'contact:view',
      'contact:update',
      'contact:delete',
      'followup:create',
      'followup:update',
      'followup:delete',
      'opportunity:create',
      'opportunity:view',
      'opportunity:update',
      'opportunity:delete',
      'contract:create',
      'contract:view',
      'contract:update',
      'contract:delete',
      'invoice:create',
      'invoice:view',
      'payment:create',
      'payment:view',
    ],
    'sales-director': [
      'customer:view',
      'customer:create',
      'customer:update',
      'customer:export',
      'contact:view',
      'contact:create',
      'contact:update',
      'followup:list:view',
      'followup:create',
      'followup:update',
      'opportunity:view',
      'opportunity:create',
      'opportunity:update',
      'contract:view',
    ],
    sales: [
      'customer:view',
      'customer:create',
      'customer:update',
      'contact:view',
      'contact:create',
      'contact:update',
      'followup:list:view',
      'followup:create',
      'followup:update',
      'opportunity:view',
      'opportunity:create',
      'opportunity:update',
      'contract:view',
    ],
    leader: [
      'customer:view',
      'contact:view',
      'followup:list:view',
      'opportunity:view',
      'contract:view',
    ],
    finance: [
      'contract:view',
      'invoice:view',
      'invoice:create',
      'payment:view',
      'payment:create',
    ],
    delivery: ['contract:view'],
    'project-manager': ['contract:view'],
    hr: ['hr:employee:view'],
  };
  for (const [code, menus] of Object.entries(defaults)) {
    const role = await db.query<{ id: string }>(
      'SELECT id FROM sys_role WHERE code=$1 AND status=1',
      [code],
    );
    for (const menu of menus)
      if (role.rows[0])
        await db.query(
          'INSERT INTO sys_role_menu(role_id,menu_id) SELECT $1,id FROM sys_menu WHERE id=$2 AND status=1 ON CONFLICT DO NOTHING',
          [role.rows[0].id, menu],
        );
  }
  for (const [code, authCodes] of Object.entries(actionDefaults)) {
    const role = await db.query<{ id: string }>(
      'SELECT id FROM sys_role WHERE code=$1 AND status=1',
      [code],
    );
    if (!role.rows[0]) continue;
    await db.query(
      'INSERT INTO sys_role_menu(role_id,menu_id) SELECT $1,id FROM sys_menu WHERE auth_code=ANY($2::text[]) AND status=1 ON CONFLICT DO NOTHING',
      [role.rows[0].id, authCodes],
    );
  }
}
async function initialize() {
  const db = await getDatabase();
  await db.query(
    "DELETE FROM sys_role_menu WHERE menu_id IN ('m-overview','m-workspace','m-project','m-analytics') OR menu_id IN (SELECT id FROM sys_menu WHERE pid IN ('m-overview','m-workspace','m-project','m-analytics'))",
  );
  await db.query(
    "DELETE FROM sys_menu WHERE id IN ('m-overview','m-workspace','m-project','m-analytics') OR pid IN ('m-overview','m-workspace','m-project','m-analytics')",
  );
  await db.query(
    "DELETE FROM sys_menu WHERE id='m-archives' OR (pid='m-contract' AND (name='Archives' OR path='archives'))",
  );
  await db.query(
    "DELETE FROM sys_menu WHERE id IN ('m-payroll','m-finance') OR pid IN ('m-payroll','m-finance')",
  );
  const { ensureBaseSeed } = await import('./base-seed');
  await ensureBaseSeed();
  // 已有数据库不会重放基线 SQL，因此新增员工附件列必须在启动时幂等迁移。
  await db.query(
    "ALTER TABLE hr_employee ADD COLUMN IF NOT EXISTS id_card_file jsonb NOT NULL DEFAULT '{}'::jsonb",
  );
  await db.query(
    "ALTER TABLE hr_employee ADD COLUMN IF NOT EXISTS id_card_front_file jsonb NOT NULL DEFAULT '{}'::jsonb",
  );
  await db.query(
    "ALTER TABLE hr_employee ADD COLUMN IF NOT EXISTS id_card_back_file jsonb NOT NULL DEFAULT '{}'::jsonb",
  );
  await db.query(
    "ALTER TABLE hr_employee ADD COLUMN IF NOT EXISTS bank_card_file jsonb NOT NULL DEFAULT '{}'::jsonb",
  );
  ensureSystemMenuEntries();
  // 迁移历史 button 节点的空路径，并确保后续同步不会把空路径写回唯一索引。
  await db.query(
    "UPDATE sys_menu SET path='__action/' || id WHERE type='button' AND (path='' OR path IS NULL)",
  );
  // 将内置菜单目录幂等同步到数据库，避免“动态菜单可见但角色权限树不存在”的分裂状态。
  for (const menu of systemMenus) {
    await db.query(
      'INSERT INTO sys_menu(id,pid,name,title,type,path,component,auth_code,icon,status,sort) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT (id) DO UPDATE SET pid=EXCLUDED.pid,title=EXCLUDED.title,type=EXCLUDED.type,path=EXCLUDED.path,component=EXCLUDED.component,auth_code=EXCLUDED.auth_code,icon=EXCLUDED.icon,sort=EXCLUDED.sort,status=sys_menu.status',
      [
        menu.id,
        menu.pid,
        menu.name,
        menu.title,
        menu.type,
        menu.type === 'button' ? `__action/${menu.id}` : menu.path,
        menu.component,
        menu.authCode,
        menu.icon,
        menu.status,
        menu.sort,
      ],
    );
  }
  await ensureDefaultRolePermissions(db);
  const setting = await db.query<{ setting_value: Record<string, unknown> }>(
    "SELECT setting_value FROM sys_setting WHERE setting_key='global'",
  );
  if (setting.rows[0]?.setting_value)
    Object.assign(systemSettings, setting.rows[0].setting_value);
  initialized = true;
}
export function schedulePersist() {
  return Promise.resolve();
}
export function flushSystemData() {
  return Promise.resolve();
}
export async function persistSystemData(_existingDb?: Database) {
  throw new Error(
    'persistSystemData 已禁用：系统数据必须通过数据库 CRUD 持久化',
  );
}

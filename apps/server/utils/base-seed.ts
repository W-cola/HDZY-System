import { query } from './db';
import { hashPassword } from './password';

export async function ensureBaseSeed() {
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
    await query(
      'INSERT INTO sys_role(id,code,name,builtin,status,data_scope,remark) VALUES($1,$2,$3,false,1,$4,$5) ON CONFLICT (id) DO NOTHING',
      [id, code, name, scope, '基础角色'],
    );
  // 公司组织结构：部门层级与岗位使用固定 ID 幂等初始化，绝不删除或覆盖已有业务数据。
  const departments = [
    ['company', null, '北京华档致远科技有限公司', '管理员', 1, '系统根部门'],
    ['ceo', 'company', '总经办', '管理员', 1, '公司领导及综合管理'],
    ['archive-business', 'company', '档案事业部', '', 2, ''],
    ['finance-dept', 'company', '财务部', '', 3, ''],
    ['research-innovation', 'company', '科研创新事业部', '', 4, ''],
    ['sales-center', 'archive-business', '销售中心', '', 1, ''],
    ['delivery-center', 'archive-business', '交付中心', '', 2, ''],
    ['eco-development', 'research-innovation', '生态发展中心', '', 1, ''],
    ['integrated-services', 'research-innovation', '综合服务中心', '', 2, ''],
  ];
  for (const [id, pid, name, leader, sort, remark] of departments)
    await query(
      'INSERT INTO sys_department(id,pid,name,leader,status,sort,remark) VALUES($1,$2,$3,$4,1,$5,$6) ON CONFLICT (id) DO UPDATE SET pid=EXCLUDED.pid,name=EXCLUDED.name,status=1,sort=EXCLUDED.sort,remark=EXCLUDED.remark,updated_at=now()',
      [id, pid, name, leader, sort, remark],
    );
  const positions = [
    ['p1', 'ceo', 'GENERAL_MANAGER', '总经理', 1],
    ['p2', 'ceo', 'DEPUTY_GENERAL_MANAGER', '副总经理', 2],
    ['p3', 'archive-business', 'ARCHIVE_DIRECTOR', '事业部负责人', 1],
    ['p4', 'finance-dept', 'FINANCE_DIRECTOR', '财务负责人', 1],
    ['p5', 'research-innovation', 'RESEARCH_DIRECTOR', '事业部负责人', 1],
    ['p6', 'sales-center', 'SALES_MANAGER', '销售负责人', 1],
    ['p7', 'delivery-center', 'DELIVERY_MANAGER', '交付负责人', 1],
    ['p8', 'eco-development', 'ECO_MANAGER', '中心负责人', 1],
    ['p9', 'integrated-services', 'SERVICE_MANAGER', '中心负责人', 1],
  ];
  for (const [id, deptId, code, name, sort] of positions)
    await query(
      "INSERT INTO sys_position(id,dept_id,code,name,status,sort,remark) VALUES($1,$2,$3,$4,1,$5,'') ON CONFLICT (id) DO UPDATE SET dept_id=EXCLUDED.dept_id,name=EXCLUDED.name,status=1,sort=EXCLUDED.sort",
      [id, deptId, code, name, sort],
    );
  await query(
    `INSERT INTO sys_role(id,code,name,builtin,status,data_scope,remark) VALUES('super','super','超级管理员',true,1,'all','系统全量权限') ON CONFLICT (id) DO UPDATE SET status=1,data_scope='all'`,
  );
  const existingAdmin = await query<{ id: string }>(
    "SELECT id FROM sys_user WHERE id='u1' OR username='admin' LIMIT 1",
  );
  const password = process.env.INITIAL_ADMIN_PASSWORD?.trim();
  if (!existingAdmin.rows[0] && !password)
    throw new Error('首次初始化必须配置 INITIAL_ADMIN_PASSWORD');
  if (!existingAdmin.rows[0])
    await query(
      `INSERT INTO sys_user(id,username,password,real_name,dept_id,position_id,status,locked,must_change_password,remark) VALUES('u1','admin',$1,'系统管理员','ceo','p1',1,false,true,'首次登录必须修改密码') ON CONFLICT (id) DO NOTHING`,
      [hashPassword(password!)],
    );
  await query(
    `INSERT INTO sys_user_role(user_id,role_id) VALUES('u1','super') ON CONFLICT DO NOTHING`,
  );
  return password;
}

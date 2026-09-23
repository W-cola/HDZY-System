import { eventHandler, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { getDatabase } from '~/utils/db';
import { hashPassword } from '~/utils/password';
import { requireRoles } from '~/utils/rbac';
import {
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
import { systemSettings } from '~/utils/system-data';
export default eventHandler(async (event) => {
  const actor = await requireRoles(event, ['super', 'admin']);
  if (!actor) return;
  const b = await readBody(event);
  if (!b?.username?.trim() || !b?.realName?.trim() || !b?.deptId)
    return useResponseError('请完整填写姓名、登录账号和主部门');
  const temporaryPassword = `Init-${crypto.randomUUID().slice(0, 8)}!a9`;
  const suppliedPassword =
    typeof b.password === 'string' && b.password.length > 0
      ? b.password
      : temporaryPassword;
  const min = Number(systemSettings.passwordMinLength ?? 8);
  const max = Number(systemSettings.passwordMaxLength ?? 32);
  if (suppliedPassword.length < min || suppliedPassword.length > max)
    return useResponseError(`密码长度必须为 ${min}-${max} 位`);
  if (
    systemSettings.passwordRequireLettersAndNumbers &&
    (!/[A-Za-z]/.test(suppliedPassword) || !/[0-9]/.test(suppliedPassword))
  )
    return useResponseError('密码必须同时包含字母和数字');
  const roles = Array.isArray(b.roles) ? b.roles : [];
  if (roles.includes('super'))
    return useResponseError('不能在用户创建时直接授予超级管理员角色');
  if (roles.length === 0) return useResponseError('请至少选择一个用户角色');
  const db: any = await getDatabase();
  const run = async (tx: any) => {
    const id = `u${Date.now()}`;
    const result = await tx.query(
      'INSERT INTO sys_user(id,username,password,real_name,phone,email,dept_id,position_id,leader_id,status,locked,must_change_password,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,false,true,$11) RETURNING id,username,real_name AS "realName",phone,email,dept_id AS "deptId",position_id AS "positionId",leader_id AS "leaderId",status,locked,must_change_password AS "mustChangePassword",remark',
      [
        id,
        b.username.trim(),
        hashPassword(suppliedPassword),
        b.realName.trim(),
        b.phone ?? '',
        b.email ?? '',
        b.deptId,
        b.positionId || null,
        b.leaderId || null,
        b.status ?? 1,
        b.remark ?? '',
      ],
    );
    for (const code of b.roles ?? []) {
      const role = await tx.query(
        'SELECT id FROM sys_role WHERE code=$1 AND status=1',
        [code],
      );
      if (!role.rows[0])
        throw Object.assign(new Error('INVALID_ROLE'), { business: true });
      await tx.query(
        'INSERT INTO sys_user_role(user_id,role_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [id, role.rows[0].id],
      );
    }
    return result.rows[0];
  };
  try {
    const user =
      'transaction' in db
        ? await db.transaction(run)
        : await (async () => {
            const c = await db.connect();
            try {
              await c.query('BEGIN');
              const x = await run(c);
              await c.query('COMMIT');
              return x;
            } catch (error) {
              await c.query('ROLLBACK');
              throw error;
            } finally {
              c.release();
            }
          })();
    recordAudit(event, {
      module: '用户管理',
      action: '创建账号',
      target: user.realName,
      detail: `创建账号 ${user.username}`,
    });
    return useResponseSuccess({
      ...user,
      roles: b.roles ?? [],
      temporaryPassword: suppliedPassword,
      mustChangePassword: true,
    });
  } catch (error: any) {
    if (error?.message === 'INVALID_ROLE')
      return useResponseError('所选角色不存在或已停用');
    if (error?.code === '23505') return useResponseError('登录账号已存在');
    if (error?.code === '23503')
      return useResponseError('部门、岗位、直属上级或角色不存在');
    throw error;
  }
});

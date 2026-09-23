import { eventHandler, getRouterParam, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { getDatabase } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { hashPassword } from '~/utils/password';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id')!;
  const b = await readBody(event);
  const db: any = await getDatabase();
  const run = async (tx: any) => {
    const found = await tx.query(
      'SELECT u.*,exists(SELECT 1 FROM sys_user_role ur JOIN sys_role r ON r.id=ur.role_id WHERE ur.user_id=u.id AND r.code=$2) AS "isSuper" FROM sys_user u WHERE u.id=$1 FOR UPDATE',
      [id, 'super'],
    );
    if (!found.rows[0]) return null;
    const u = found.rows[0];
    if (!u.isSuper && Array.isArray(b.roles) && b.roles.includes('super'))
      throw Object.assign(new Error('SUPER_ASSIGN_FORBIDDEN'), {
        business: true,
      });
    const removesSuper = Array.isArray(b.roles) && !b.roles.includes('super');
    if (u.isSuper && (b.status === 0 || removesSuper)) {
      const count = await tx.query(
        'SELECT count(*)::int AS count FROM sys_user x JOIN sys_user_role ur ON ur.user_id=x.id JOIN sys_role r ON r.id=ur.role_id WHERE x.status=1 AND r.code=$1',
        ['super'],
      );
      if (Number(count.rows[0].count) <= 1)
        throw Object.assign(new Error('LAST_SUPER'), { business: true });
    }
    const password = b.password ? hashPassword(b.password) : u.password;
    const result = await tx.query(
      'UPDATE sys_user SET username=$1,password=$2,real_name=$3,phone=$4,email=$5,dept_id=$6,position_id=$7,leader_id=$8,status=$9,locked=$10,must_change_password=$11,remark=$12 WHERE id=$13 RETURNING id,username,real_name AS "realName",phone,email,dept_id AS "deptId",position_id AS "positionId",leader_id AS "leaderId",status,locked,must_change_password AS "mustChangePassword",remark',
      [
        b.username ?? u.username,
        password,
        b.realName ?? u.real_name,
        b.phone ?? u.phone,
        b.email ?? u.email,
        b.deptId ?? u.dept_id,
        b.positionId === undefined ? u.position_id : b.positionId || null,
        b.leaderId === undefined ? u.leader_id : b.leaderId || null,
        b.status ?? u.status,
        b.locked ?? u.locked,
        b.mustChangePassword ?? u.must_change_password,
        b.remark ?? u.remark,
        id,
      ],
    );
    if (Array.isArray(b.roles)) {
      await tx.query('DELETE FROM sys_user_role WHERE user_id=$1', [id]);
      for (const code of b.roles) {
        const role = await tx.query(
          'SELECT id FROM sys_role WHERE code=$1 AND status=1',
          [code],
        );
        if (!role.rows[0])
          throw Object.assign(new Error('INVALID_ROLE'), { business: true });
        await tx.query(
          'INSERT INTO sys_user_role(user_id,role_id) VALUES($1,$2)',
          [id, role.rows[0].id],
        );
      }
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
    if (!user) return useResponseError('用户不存在');
    recordAudit(event, {
      module: '用户管理',
      action: '编辑账号',
      target: user.realName,
      detail: `更新账号 ${user.username}`,
    });
    return useResponseSuccess({ ...user, roles: b.roles });
  } catch (error: any) {
    if (error?.message === 'LAST_SUPER')
      return useResponseError('系统必须至少保留一个启用状态的超级管理员');
    if (error?.message === 'INVALID_ROLE')
      return useResponseError('所选角色不存在或已停用');
    if (error?.message === 'SUPER_ASSIGN_FORBIDDEN')
      return useResponseError('不能给普通用户授予超级管理员角色');
    if (error?.code === '23505') return useResponseError('登录账号已存在');
    if (error?.code === '23503')
      return useResponseError('部门、岗位、直属上级或角色不存在');
    throw error;
  }
});

import { eventHandler, getRouterParam } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { hashPassword } from '~/utils/password';
import { requireRoles } from '~/utils/rbac';
import { useResponseError, useResponseSuccess } from '~/utils/response';
export default eventHandler(async (event) => {
  const actor = await requireRoles(event, ['super', 'admin']);
  if (!actor) return;
  const id = getRouterParam(event, 'id')!;
  const temporaryPassword = `Reset-${crypto.randomUUID().slice(0, 8)}!a9`;
  const result = await query<any>(
    'UPDATE sys_user SET password=$1,must_change_password=true WHERE id=$2 RETURNING real_name AS "realName"',
    [hashPassword(temporaryPassword), id],
  );
  if (!result.rows[0]) return useResponseError('用户不存在');
  recordAudit(event, {
    module: '用户管理',
    action: '重置密码',
    target: result.rows[0].realName,
    detail: '管理员重置用户密码并要求首次登录修改',
  });
  return useResponseSuccess({
    temporaryPassword,
    mustChangePassword: true,
  });
});

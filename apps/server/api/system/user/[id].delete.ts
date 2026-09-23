import { eventHandler, getRouterParam } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id')!;
  const found = await query<any>(
    'SELECT id,username,real_name AS "realName",status FROM sys_user WHERE id=$1',
    [id],
  );
  if (!found.rows[0]) return useResponseError('用户不存在');
  const user = found.rows[0];
  if (user.username === 'admin') return useResponseError('系统管理员不能删除');
  const superCount = await query(
    'SELECT count(*)::int AS count FROM sys_user u JOIN sys_user_role ur ON ur.user_id=u.id JOIN sys_role r ON r.id=ur.role_id WHERE r.code=$1 AND u.status=1',
    ['super'],
  );
  const targetSuper = await query(
    'SELECT 1 FROM sys_user_role ur JOIN sys_role r ON r.id=ur.role_id WHERE ur.user_id=$1 AND r.code=$2',
    [id, 'super'],
  );
  if (targetSuper.rows[0] && Number(superCount.rows[0]?.count) <= 1)
    return useResponseError('系统必须至少保留一个启用状态的超级管理员');
  await query('UPDATE sys_user SET status=0, locked=true WHERE id=$1', [id]);
  recordAudit(event, {
    module: '用户管理',
    action: '停用账号',
    target: user.realName,
    detail: '停用用户账号；为保留历史业务和审计引用，不执行物理删除',
  });
  return useResponseSuccess({ id, disabled: true });
});

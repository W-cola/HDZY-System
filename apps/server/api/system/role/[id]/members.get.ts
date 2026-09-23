import { eventHandler, getRouterParam } from 'h3';
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
  const role = await query('SELECT 1 FROM sys_role WHERE id=$1', [id]);
  if (!role.rows[0]) return useResponseError('角色不存在');
  const result = await query(
    'SELECT u.id,u.username,u.real_name AS "realName",u.status,u.dept_id AS "deptId" FROM sys_user u JOIN sys_user_role ur ON ur.user_id=u.id WHERE ur.role_id=$1 ORDER BY u.real_name',
    [id],
  );
  return useResponseSuccess(result.rows);
});

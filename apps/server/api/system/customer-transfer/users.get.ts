import { eventHandler } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, usePageResponseSuccess } from '~/utils/response';

export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const r = await query(
    `SELECT u.id,u.username,u.real_name AS "realName",u.dept_id AS "deptId",u.status
     FROM sys_user u
     WHERE u.status=1 AND u.locked=false
       AND EXISTS (
         SELECT 1 FROM sys_user_role ur
         JOIN sys_role r ON r.id=ur.role_id
         WHERE ur.user_id=u.id AND r.code='sales'
       )
     ORDER BY u.real_name`,
  );
  return usePageResponseSuccess('1', '1000', r.rows);
});

import { eventHandler } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, useResponseSuccess } from '~/utils/response';

export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const result = await query(`
    SELECT d.id,d.pid,d.name,d.leader,d.status,d.sort,d.remark,
      count(DISTINCT u.id)::int AS "userCount",
      count(DISTINCT p.id)::int AS "positionCount"
    FROM sys_department d
    LEFT JOIN sys_user u ON u.dept_id=d.id
    LEFT JOIN sys_position p ON p.dept_id=d.id
    GROUP BY d.id
    ORDER BY d.pid NULLS FIRST,d.sort,d.name
  `);
  return useResponseSuccess(result.rows);
});

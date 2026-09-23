import { eventHandler } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, useResponseSuccess } from '~/utils/response';

function tree(items: any[], pid: null | string = null): any[] {
  return items
    .filter((x) => x.pid === pid)
    .map((x) => ({ ...x, children: tree(items, x.id) }));
}
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const [departments, positions] = await Promise.all([
    query(
      'SELECT id,pid,name,leader,status,sort,remark FROM sys_department ORDER BY sort,name',
    ),
    query(
      'SELECT id,dept_id AS "deptId",code,name,status,sort,remark FROM sys_position ORDER BY dept_id,sort,name',
    ),
  ]);
  return useResponseSuccess({
    departments: tree(departments.rows),
    positions: positions.rows,
  });
});

import { eventHandler, getQuery } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, usePageResponseSuccess } from '~/utils/response';

export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const q = getQuery(event);
  const conditions: string[] = [];
  const values: any[] = [];
  const add = (sql: string, value: any) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };
  if (q.name) add('p.name ILIKE ?', `%${String(q.name)}%`);
  if (q.code) add('p.code ILIKE ?', `%${String(q.code)}%`);
  if (q.deptId) add('p.dept_id = ?', String(q.deptId));
  if (q.status !== undefined && q.status !== '')
    add('p.status = ?', Number(q.status));
  const where =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const result = await query(
    `
    SELECT p.id,p.name,p.code,p.dept_id AS "deptId",p.status,p.sort,p.remark,
      d.name AS "deptName",count(u.id)::int AS members
    FROM sys_position p JOIN sys_department d ON d.id=p.dept_id
    LEFT JOIN sys_user u ON u.position_id=p.id
    ${where} GROUP BY p.id,d.name ORDER BY p.dept_id,p.sort,p.name
  `,
    values,
  );
  return usePageResponseSuccess(
    String(q.page ?? 1),
    String(q.pageSize ?? 20),
    result.rows,
  );
});

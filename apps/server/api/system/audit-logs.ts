import { eventHandler, getQuery } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, usePageResponseSuccess } from '~/utils/response';
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const q = getQuery(event);
  const values: any[] = [];
  const conditions: string[] = [];
  const add = (sql: string, v: any) => {
    values.push(v);
    conditions.push(sql.replace('?', `$${values.length}`));
  };
  if (q.keyword)
    add(
      '(operator||module||action||target||ip||detail) ILIKE ?',
      `%${String(q.keyword)}%`,
    );
  if (q.result) add('result=?', String(q.result));
  if (q.module) add('module ILIKE ?', `%${String(q.module)}%`);
  if (q.operator) add('operator ILIKE ?', `%${String(q.operator)}%`);
  const result = await query(
    `SELECT id,operator,module,action,target,result,ip,detail,to_char(created_at,'YYYY-MM-DD HH24:MI:SS') AS "createdAt" FROM sys_operation_log ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''} ORDER BY created_at DESC`,
    values,
  );
  return usePageResponseSuccess(
    String(q.page ?? 1),
    String(q.pageSize ?? 20),
    result.rows,
  );
});

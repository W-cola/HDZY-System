import { eventHandler, getQuery } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import {
  unAuthorizedResponse,
  usePageResponseSuccess,
  useResponseError,
} from '~/utils/response';
export default eventHandler(async (event) => {
  const user = verifyAccessToken(event);
  if (!user) return unAuthorizedResponse(event);
  if (!user.roles?.some((role: string) => ['admin', 'super'].includes(role)))
    return useResponseError('只有系统管理员可以访问回收站');
  const q = getQuery(event);
  const values: any[] = [];
  const where = ['f.deleted = true'];
  if (q.keyword) {
    values.push(`%${String(q.keyword)}%`);
    where.push(
      `(f.subject ILIKE $${values.length} OR cu.name ILIKE $${values.length})`,
    );
  }
  const r = await query(
    `SELECT f.id,cu.name AS "customerName",co.name AS "contactName",f.subject,f.content,to_char(f.follow_up_time,'YYYY-MM-DD HH24:MI:SS') AS "followUpTime",to_char(f.deleted_at,'YYYY-MM-DD HH24:MI:SS') AS "deletedAt",du.real_name AS "deletedBy" FROM crm_follow_up f JOIN crm_customer cu ON cu.id=f.customer_id LEFT JOIN crm_contact co ON co.id=f.contact_id LEFT JOIN sys_user du ON du.id=f.deleted_by WHERE ${where.join(' AND ')} ORDER BY f.deleted_at DESC`,
    values,
  );
  return usePageResponseSuccess(
    String(q.page ?? 1),
    String(q.pageSize ?? 20),
    r.rows,
  );
});

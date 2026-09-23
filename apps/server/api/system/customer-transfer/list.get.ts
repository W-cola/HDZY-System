import { eventHandler, getQuery } from 'h3';
import { query } from '~/utils/db';
import { requirePermission } from '~/utils/rbac';
import { usePageResponseSuccess } from '~/utils/response';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'customer:transfer:view');
  if (!user) return;
  const q = getQuery(event);
  const values: any[] = [];
  const where = ['c.deleted=false'];
  if (q.ownerId) {
    values.push(String(q.ownerId));
    where.push(`c.owner_id=$${values.length}`);
  }
  if (q.keyword) {
    values.push(`%${String(q.keyword)}%`);
    where.push(`c.name ILIKE $${values.length}`);
  }
  const r = await query(
    `SELECT c.id,c.name,c.level,c.status,c.owner_id AS "ownerId",u.real_name AS "ownerName",c.region,c.industry,(SELECT count(*)::int FROM crm_contact x WHERE x.customer_id=c.id AND x.deleted=false) AS "contactCount",(SELECT count(*)::int FROM crm_follow_up x WHERE x.customer_id=c.id AND x.deleted=false) AS "followUpCount",(SELECT count(*)::int FROM crm_opportunity x WHERE x.customer_id=c.id AND x.deleted=false AND x.status='进行中') AS "opportunityCount" FROM crm_customer c LEFT JOIN sys_user u ON u.id=c.owner_id WHERE ${where.join(' AND ')} ORDER BY c.updated_at DESC`,
    values,
  );
  return usePageResponseSuccess(
    String(q.page ?? 1),
    String(q.pageSize ?? 20),
    r.rows,
  );
});

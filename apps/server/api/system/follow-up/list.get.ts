import { eventHandler, getQuery } from 'h3';
import {
  dataScopeCondition,
  requirePermission,
} from '~/utils/rbac';
import { usePageResponseSuccess } from '~/utils/response';
import { getPageParams, queryPage } from '~/utils/sql-pagination';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'followup:list:view');
  if (!user) return;
  const q = getQuery(event);
  const values: any[] = [];
  const where: string[] = [
    'f.deleted = false',
    'cu.deleted = false',
    '(co.id IS NULL OR co.deleted = false)',
  ];
  where.push(dataScopeCondition(user, 'f.owner_id', values));
  const add = (sql: string, value: any) => {
    values.push(value);
    where.push(sql.replace('?', `$${values.length}`));
  };
  if (q.keyword) {
    const v = `%${String(q.keyword)}%`;
    values.push(v, v, v);
    where.push(
      `(f.subject ILIKE $${values.length - 2} OR f.content ILIKE $${values.length - 1} OR cu.name ILIKE $${values.length})`,
    );
  }
  if (q.customerId) add('f.customer_id=?', String(q.customerId));
  if (q.followUpType) add('f.follow_up_type=?', String(q.followUpType));
  if (q.status) add('f.status=?', String(q.status));
  if (q.intentionLevel) add('f.intention_level=?', String(q.intentionLevel));
  const ownerId = Array.isArray(q.ownerId)
    ? q.ownerId[0]
    : q.ownerId && typeof q.ownerId === 'object'
      ? (q.ownerId.value ?? q.ownerId.id)
      : q.ownerId;
  if (ownerId) add('f.owner_id=?', String(ownerId));
  const { page, pageSize } = getPageParams(q);
  const fromWhere = `FROM crm_follow_up f JOIN crm_customer cu ON cu.id=f.customer_id LEFT JOIN crm_contact co ON co.id=f.contact_id LEFT JOIN crm_opportunity op ON op.id=f.opportunity_id AND op.deleted=false LEFT JOIN sys_user u ON u.id=f.owner_id ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''}`;
  const result = await queryPage(
    `SELECT f.id,f.customer_id AS "customerId",cu.name AS "customerName",f.contact_id AS "contactId",co.name AS "contactName",f.opportunity_id AS "opportunityId",op.name AS "opportunityName",to_char(f.follow_up_time,'YYYY-MM-DD HH24:MI:SS') AS "followUpTime",f.follow_up_type AS "followUpType",f.subject,f.content,f.result,f.intention_level AS "intentionLevel",f.next_plan AS "nextPlan",to_char(f.next_follow_time,'YYYY-MM-DD HH24:MI:SS') AS "nextFollowTime",f.status,u.real_name AS "ownerName",to_char(f.created_at,'YYYY-MM-DD HH24:MI:SS') AS "createdAt",f.remark ${fromWhere} ORDER BY f.follow_up_time DESC`,
    `SELECT COUNT(*)::int AS total ${fromWhere}`,
    values,
    page,
    pageSize,
  );
  return usePageResponseSuccess(String(page), String(pageSize), result.rows, {
    total: result.total,
    alreadyPaginated: true,
  });
});

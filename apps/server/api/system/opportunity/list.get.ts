import { eventHandler, getQuery } from 'h3';
import {
  dataScopeCondition,
  requirePermission,
} from '~/utils/rbac';
import { usePageResponseSuccess } from '~/utils/response';
import { getPageParams, queryPage } from '~/utils/sql-pagination';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'opportunity:list:view');
  if (!user) return;
  const q = getQuery(event);
  const values: any[] = [];
  const where = ['o.deleted=false', 'c.deleted=false'];
  where.push(dataScopeCondition(user, 'o.owner_id', values));
  const add = (sql: string, value: any) => {
    values.push(value);
    where.push(sql.replace('?', `$${values.length}`));
  };
  if (q.keyword) {
    const value = `%${String(q.keyword)}%`;
    values.push(value, value);
    where.push(
      `(o.name ILIKE $${values.length - 1} OR c.name ILIKE $${values.length})`,
    );
  }
  const getFilterValue = (value: any): string | undefined => {
    if (Array.isArray(value)) return getFilterValue(value[0]);
    if (value && typeof value === 'object')
      return getFilterValue(value.value ?? value.id ?? value.key);
    const normalized =
      value === undefined || value === null ? '' : String(value).trim();
    return normalized || undefined;
  };
  if (q.customerId) add('o.customer_id=?', String(q.customerId));
  const stage = getFilterValue(q.stageFilter ?? q.stage);
  const status = getFilterValue(q.statusFilter ?? q.status);
  const source = getFilterValue(q.sourceFilter ?? q.source);
  if (stage) add('o.stage=?', stage);
  if (status) add('o.status=?', status);
  if (source) add('o.source=?', source);
  const amountMin = Number(getFilterValue(q.amountMin));
  const amountMax = Number(getFilterValue(q.amountMax));
  if (Number.isFinite(amountMin) && amountMin >= 0)
    add('o.amount>=?', amountMin);
  if (Number.isFinite(amountMax) && amountMax >= 0)
    add('o.amount<=?', amountMax);
  const expectedCloseMonth = getFilterValue(
    q.expectedCloseMonth ?? q.expectedCloseDate,
  );
  if (expectedCloseMonth) {
    if (/^\d{4}-\d{2}$/.test(expectedCloseMonth)) {
      values.push(`${expectedCloseMonth}-01`);
      where.push(`o.expected_close_date >= $${values.length}::date`);
      values.push(`${expectedCloseMonth}-01`);
      where.push(
        `o.expected_close_date < ($${values.length}::date + interval '1 month')`,
      );
    } else if (/^\d{4}-\d{2}-\d{2}$/.test(expectedCloseMonth)) {
      add('o.expected_close_date=?', expectedCloseMonth);
    }
  }
  const ownerId = Array.isArray(q.ownerId)
    ? q.ownerId[0]
    : q.ownerId && typeof q.ownerId === 'object'
      ? (q.ownerId.value ?? q.ownerId.id)
      : q.ownerId;
  if (ownerId) add('o.owner_id=?', String(ownerId));
  const { page, pageSize } = getPageParams(q);
  const fromWhere = `FROM crm_opportunity o JOIN crm_customer c ON c.id=o.customer_id LEFT JOIN crm_contact pc ON pc.id=o.primary_contact_id LEFT JOIN sys_user u ON u.id=o.owner_id WHERE ${where.join(' AND ')}`;
  const result = await queryPage(
    `SELECT o.id,o.name,o.customer_id AS "customerId",c.name AS "customerName",o.primary_contact_id AS "primaryContactId",pc.name AS "primaryContactName",o.owner_id AS "ownerId",u.real_name AS "ownerName",o.source,o.stage,o.status,o.amount::float AS amount,o.probability::float AS probability,(o.amount*o.probability/100)::float AS "weightedAmount",to_char(o.expected_close_date,'YYYY-MM-DD') AS "expectedCloseDate",o.next_plan AS "nextPlan",to_char(o.next_follow_time,'YYYY-MM-DD HH24:MI:SS') AS "nextFollowTime",o.risk_level AS "riskLevel",o.description,o.won_at AS "wonAt",o.lost_at AS "lostAt",o.lost_reason AS "lostReason",to_char(o.created_at,'YYYY-MM-DD HH24:MI:SS') AS "createdAt",to_char(o.updated_at,'YYYY-MM-DD HH24:MI:SS') AS "updatedAt" ${fromWhere} ORDER BY o.updated_at DESC`,
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

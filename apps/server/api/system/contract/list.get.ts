import { eventHandler, getQuery } from 'h3';
import {
  dataScopeCondition,
  requirePermission,
} from '~/utils/rbac';
import { usePageResponseSuccess } from '~/utils/response';
import { getPageParams, queryPage } from '~/utils/sql-pagination';
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'contract:list:view');
  if (!user) return;
  const q: any = getQuery(event);
  const values: any[] = [];
  const where = ['x.deleted=false', 'c.deleted=false'];
  where.push(dataScopeCondition(user, 'x.owner_id', values));
  const add = (sql: string, v: any) => {
    values.push(v);
    where.push(sql.replace('?', `$${values.length}`));
  };
  if (q.keyword) {
    const v = `%${q.keyword}%`;
    values.push(v, v, v);
    where.push(
      `(x.contract_no ILIKE $${values.length - 2} OR x.contract_name ILIKE $${values.length - 1} OR c.name ILIKE $${values.length})`,
    );
  }
  if (q.customerId) add('x.customer_id=?', q.customerId);
  if (q.projectType) add('x.project_type=?', q.projectType);
  if (q.status) add('x.status=?', q.status);
  if (q.ownerId) add('x.owner_id=?', q.ownerId);
  if (q.projectNo) add('x.project_no ILIKE ?', `%${q.projectNo}%`);
  if (q.ownerName) add('u.real_name ILIKE ?', `%${q.ownerName}%`);
  if (q.paymentMethod) add('x.payment_method=?', q.paymentMethod);
  if (q.signedAtFrom) add('x.signed_at>=?', q.signedAtFrom);
  if (q.signedAtTo) add('x.signed_at<?', `${q.signedAtTo}T23:59:59.999`);
  if (q.amountMin !== undefined && q.amountMin !== '')
    add('x.amount>=?', Number(q.amountMin));
  if (q.amountMax !== undefined && q.amountMax !== '')
    add('x.amount<=?', Number(q.amountMax));
  const { page, pageSize } = getPageParams(q);
  const fromWhere = `FROM crm_contract x JOIN crm_customer c ON c.id=x.customer_id LEFT JOIN sys_user u ON u.id=x.owner_id WHERE ${where.join(' AND ')}`;
  const result = await queryPage(
    `SELECT x.id,x.contract_no AS "contractNo",x.contract_name AS "contractName",x.customer_id AS "customerId",c.name AS "customerName",x.contact_name AS "contactName",x.project_name AS "projectName",x.project_no AS "projectNo",x.archive_no AS "archiveNo",to_char(x.archived_at,'YYYY-MM-DD') AS "archivedAt",to_char(x.signed_at,'YYYY-MM-DD') AS "signedAt",x.amount::float AS amount,x.owner_id AS "ownerId",u.real_name AS "ownerName",x.project_type AS "projectType",x.payment_method AS "paymentMethod",x.quality_deposit::float AS "qualityDeposit",x.project_period AS "projectPeriod",x.status,x.remark,x.items,COALESCE(x.items->'attachments','[]'::jsonb) AS attachments ${fromWhere} ORDER BY x.updated_at DESC`,
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

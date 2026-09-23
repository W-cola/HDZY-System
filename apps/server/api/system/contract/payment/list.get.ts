import { eventHandler, getQuery } from 'h3';
import {
  dataScopeCondition,
  requirePermission,
} from '~/utils/rbac';
import { usePageResponseSuccess } from '~/utils/response';
import { getPageParams, queryPage } from '~/utils/sql-pagination';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'payment:list:view');
  if (!user) return;
  const q: any = getQuery(event);
  const values: any[] = [];
  const where = [
    "p.status <> '已作废'",
    dataScopeCondition(user, 'c.owner_id', values),
    '(c.id IS NULL OR c.deleted IS NOT TRUE)',
  ];
  if (q.contractId) {
    values.push(String(q.contractId));
    where.push(`p.contract_id=$${values.length}`);
  }
  if (q.customerId) {
    values.push(String(q.customerId));
    where.push(`p.customer_id=$${values.length}`);
  }
  if (q.keyword) {
    values.push(`%${String(q.keyword).trim()}%`);
    where.push(
      `(c.contract_name ILIKE $${values.length} OR c.project_no ILIKE $${values.length})`,
    );
  }
  const { page, pageSize } = getPageParams(q);
  const fromWhere = `FROM crm_contract_payment p LEFT JOIN crm_contract c ON c.id=p.contract_id LEFT JOIN crm_customer cu ON cu.id=p.customer_id LEFT JOIN crm_contract_invoice i ON i.id=p.invoice_id WHERE ${where.join(' AND ')}`;
  const result = await queryPage(
    `SELECT p.id,p.contract_id AS "contractId",c.contract_no AS "contractNo",c.contract_name AS "contractName",c.project_no AS "projectNo",c.customer_id AS "customerId",cu.name AS "customerName",p.payment_amount::float AS "paymentAmount",to_char(p.payment_date,'YYYY-MM-DD') AS "paymentDate",p.payment_method AS "paymentMethod",p.payment_account AS "paymentAccount",p.receipt_no AS "receiptNo",p.status,p.invoice_id AS "invoiceId",i.invoice_no AS "invoiceNo",p.remark,to_char(p.created_at,'YYYY-MM-DD HH24:MI:SS') AS "createdAt" ${fromWhere} ORDER BY p.payment_date DESC NULLS LAST,p.created_at DESC`,
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

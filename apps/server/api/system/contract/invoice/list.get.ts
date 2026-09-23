import { eventHandler, getQuery } from 'h3';
import {
  dataScopeCondition,
  requirePermission,
} from '~/utils/rbac';
import { usePageResponseSuccess } from '~/utils/response';
import { getPageParams, queryPage } from '~/utils/sql-pagination';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'invoice:list:view');
  if (!user) return;
  const q: any = getQuery(event);
  const values: any[] = [];
  const where = ["i.status <> '已作废'", 'c.deleted IS NOT TRUE'];
  where.push(dataScopeCondition(user, 'c.owner_id', values));
  if (q.contractId) {
    values.push(String(q.contractId));
    where.push(`i.contract_id=$${values.length}`);
  }
  if (q.customerId) {
    values.push(String(q.customerId));
    where.push(`i.customer_id=$${values.length}`);
  }
  const { page, pageSize } = getPageParams(q);
  const fromWhere = `FROM crm_contract_invoice i JOIN crm_contract c ON c.id=i.contract_id JOIN crm_customer cu ON cu.id=i.customer_id LEFT JOIN crm_customer_invoice_profile p ON p.id=i.invoice_profile_id WHERE ${where.join(' AND ')}`;
  const result = await queryPage(
    `SELECT i.id,i.contract_id AS "contractId",c.contract_no AS "contractNo",c.contract_name AS "contractName",i.customer_id AS "customerId",cu.name AS "customerName",i.invoice_profile_id AS "invoiceProfileId",p.invoice_title AS "invoiceTitle",p.taxpayer_no AS "taxpayerNo",i.invoice_amount::float AS "invoiceAmount",i.invoice_type AS "invoiceType",i.invoice_no AS "invoiceNo",to_char(i.issued_at,'YYYY-MM-DD') AS "issuedAt",i.status,i.file_id AS "fileId",i.file_name AS "fileName",i.file_size AS "fileSize",i.remark,to_char(i.created_at,'YYYY-MM-DD HH24:MI:SS') AS "createdAt" ${fromWhere} ORDER BY i.created_at DESC`,
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

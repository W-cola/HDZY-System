import { eventHandler, getQuery } from 'h3';
import { query } from '~/utils/db';
import { canAccessCustomer, requirePermission } from '~/utils/rbac';
import { usePageResponseSuccess } from '~/utils/response';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'customer:invoice-profile:list:view');
  if (!user) return;
  const q: any = getQuery(event);
  if (!q.customerId || !(await canAccessCustomer(user, String(q.customerId))))
    return usePageResponseSuccess(1, 100, []);
  const result = await query(
    `SELECT id,customer_id AS "customerId",invoice_title AS "invoiceTitle",taxpayer_no AS "taxpayerNo",invoice_type AS "invoiceType",registered_address AS "registeredAddress",registered_phone AS "registeredPhone",bank_name AS "bankName",bank_account AS "bankAccount",invoice_email AS "invoiceEmail",invoice_phone AS "invoicePhone",to_char(effective_from,'YYYY-MM-DD') AS "effectiveFrom",to_char(effective_to,'YYYY-MM-DD') AS "effectiveTo",is_current AS "isCurrent",status,change_reason AS "changeReason",remark,to_char(created_at,'YYYY-MM-DD HH24:MI:SS') AS "createdAt" FROM crm_customer_invoice_profile WHERE customer_id=$1 ORDER BY is_current DESC,effective_from DESC,created_at DESC`,
    [String(q.customerId)],
  );
  return usePageResponseSuccess(
    String(q.page ?? 1),
    String(q.pageSize ?? 100),
    result.rows,
  );
});

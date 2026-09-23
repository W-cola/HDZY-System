import { eventHandler } from 'h3';
import { z } from 'zod';
import { query } from '~/utils/db';
import {
  dataScopeCondition,
  isFinance,
  requirePermission,
} from '~/utils/rbac';
import { useResponseError, useResponseSuccess } from '~/utils/response';
import { money, parseBody, text } from '~/utils/validation';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'invoice:create');
  if (!user) return;
  const b: any = await parseBody(
    event,
    z.object({
      contractId: text(128),
      invoiceAmount: money.refine((v) => v > 0),
      invoiceProfileId: text(128).optional(),
      invoiceType: text(50).optional(),
      invoiceNo: text(100).optional(),
      issuedAt: text(50).optional(),
      status: z.enum(['有效', '已作废']).optional(),
      fileId: text(128).optional(),
      fileName: text(255).optional(),
      fileSize: z.coerce
        .number()
        .int()
        .nonnegative()
        .max(20 * 1024 * 1024)
        .optional(),
      remark: text(1000).optional(),
    }),
  );
  if (!b) return;
  const amount = Number(b.invoiceAmount);
  const scopeValues: any[] = [];
  const scope = dataScopeCondition(user, 'c.owner_id', scopeValues).replaceAll(
    /\$(\d+)/g,
    (_m, n) => `$${Number(n) + 1}`,
  );
  const contract = await query<any>(
    `SELECT c.id,c.customer_id,c.amount FROM crm_contract c WHERE c.id=$1 AND c.deleted IS NOT TRUE AND (${scope})`,
    [b.contractId, ...scopeValues],
  );
  if (!contract.rows[0])
    return useResponseError('合同不存在、已删除或无权操作');
  if (!isFinance(user) && b.status === '已作废')
    return useResponseError('销售只能录入有效发票，作废由财务处理');
  if (b.invoiceProfileId) {
    const profile = await query(
      'SELECT id FROM crm_customer_invoice_profile WHERE id=$1 AND customer_id=$2',
      [b.invoiceProfileId, contract.rows[0].customer_id],
    );
    if (!profile.rows[0]) return useResponseError('所选客户开票资料无效');
  }
  const total = await query<any>(
    "SELECT COALESCE(SUM(invoice_amount),0)::float AS total FROM crm_contract_invoice WHERE contract_id=$1 AND status <> '已作废'",
    [b.contractId],
  );
  if (
    Number(total.rows[0]?.total ?? 0) + amount >
    Number(contract.rows[0].amount) + 0.01
  )
    return useResponseError('本次开票后累计金额不能超过合同金额');
  const id = `ci${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const result = await query(
    'INSERT INTO crm_contract_invoice(id,contract_id,customer_id,invoice_profile_id,invoice_amount,invoice_type,invoice_no,issued_at,status,file_id,file_name,file_size,remark,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *',
    [
      id,
      b.contractId,
      contract.rows[0].customer_id,
      b.invoiceProfileId || null,
      amount,
      b.invoiceType || '进度款',
      b.invoiceNo || '',
      b.issuedAt || null,
      b.status || '有效',
      b.fileId || '',
      b.fileName || '',
      Number(b.fileSize || 0),
      b.remark || '',
      user.id,
    ],
  );
  return useResponseSuccess(result.rows[0]);
});

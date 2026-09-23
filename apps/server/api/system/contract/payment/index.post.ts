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
  const user = await requirePermission(event, 'payment:create');
  if (!user) return;
  const b: any = await parseBody(
    event,
    z.object({
      id: text(128).optional(),
      contractId: text(128).optional(),
      customerId: text(128).optional(),
      paymentAmount: money.refine((v) => v > 0),
      paymentDate: text(50).optional(),
      paymentMethod: text(50).optional(),
      paymentAccount: text(100).optional(),
      receiptNo: text(100).optional(),
      status: z
        .enum([
          '已到账',
          '待到账',
          '已取消',
          '待确认',
          '已确认',
          '已驳回',
          '已作废',
        ])
        .optional(),
      invoiceId: text(128).optional(),
      remark: text(1000).optional(),
    }),
  );
  if (!b) return;
  const amount = Number(b.paymentAmount);
  if (!Number.isFinite(amount) || amount <= 0)
    return useResponseError('请填写有效的回款金额');
  if (!b.contractId) return useResponseError('请选择合同');
  const values: any[] = [];
  const scope = dataScopeCondition(user, 'c.owner_id', values).replaceAll(
    /\$(\d+)/g,
    (_m, n) => `$${Number(n) + 1}`,
  );
  const contract = await query<any>(
    `SELECT c.id,c.customer_id FROM crm_contract c WHERE c.id=$1 AND c.deleted IS NOT TRUE AND (${scope})`,
    [b.contractId, ...values],
  );
  if (!contract.rows[0])
    return useResponseError('合同不存在、已删除或无权操作');
  const requestedStatus = b.status || '待确认';
  if (!isFinance(user) && requestedStatus !== '待确认')
    return useResponseError('销售录入的回款必须先提交待确认，财务负责审核');
  if (b.invoiceId) {
    const invoice = await query<any>(
      'SELECT id,contract_id FROM crm_contract_invoice WHERE id=$1 AND contract_id=$2',
      [b.invoiceId, b.contractId],
    );
    if (!invoice.rows[0]) return useResponseError('关联发票无效');
  }
  const id = b.id || `cp${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
  const result = await query(
    'INSERT INTO crm_contract_payment(id,contract_id,customer_id,payment_amount,payment_date,payment_method,payment_account,receipt_no,status,invoice_id,remark,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) ON CONFLICT (id) DO UPDATE SET contract_id=EXCLUDED.contract_id,customer_id=EXCLUDED.customer_id,payment_amount=EXCLUDED.payment_amount,payment_date=EXCLUDED.payment_date,payment_method=EXCLUDED.payment_method,payment_account=EXCLUDED.payment_account,receipt_no=EXCLUDED.receipt_no,status=EXCLUDED.status,invoice_id=EXCLUDED.invoice_id,remark=EXCLUDED.remark,updated_at=now() RETURNING *',
    [
      id,
      b.contractId,
      contract.rows[0].customer_id,
      amount,
      b.paymentDate || null,
      b.paymentMethod || '',
      b.paymentAccount || '',
      b.receiptNo || '',
      requestedStatus,
      b.invoiceId || null,
      b.remark || '',
      user.id,
    ],
  );
  return useResponseSuccess(result.rows[0]);
});

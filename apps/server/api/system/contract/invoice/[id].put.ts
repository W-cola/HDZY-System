import { eventHandler, getRouterParam } from 'h3';
import { z } from 'zod';
import { query } from '~/utils/db';
import { requirePermission } from '~/utils/rbac';
import { useResponseError, useResponseSuccess } from '~/utils/response';
import { money, parseBody, text } from '~/utils/validation';
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'invoice:update');
  if (!user) return;
  const b: any = await parseBody(
    event,
    z.object({
      invoiceAmount: money.refine((v) => v > 0),
      invoiceType: text(50).optional(),
      invoiceNo: text(100).optional(),
      issuedAt: text(50).optional(),
      status: z.enum(['有效', '已作废']).optional(),
      remark: text(1000).optional(),
    }),
  );
  const id = getRouterParam(event, 'id');
  const current = await query<any>(
    'SELECT id,contract_id FROM crm_contract_invoice WHERE id=$1',
    [id],
  );
  if (!current.rows[0]) return useResponseError('发票不存在');
  const result = await query(
    'UPDATE crm_contract_invoice SET invoice_amount=$1,invoice_type=$2,invoice_no=$3,issued_at=$4,status=$5,remark=$6,updated_at=now() WHERE id=$7 RETURNING *',
    [
      Number(b.invoiceAmount),
      b.invoiceType || '进度款',
      b.invoiceNo || '',
      b.issuedAt || null,
      b.status || '有效',
      b.remark || '',
      id,
    ],
  );
  return useResponseSuccess(result.rows[0]);
});

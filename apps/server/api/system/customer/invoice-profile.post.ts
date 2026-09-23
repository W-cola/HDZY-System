import { eventHandler, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { canAccessCustomer, requirePermission } from '~/utils/rbac';
import {
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'customer:invoice-profile:create');
  if (!user) return;
  const b: any = await readBody(event);
  if (!b?.customerId || !b.invoiceTitle?.trim() || !b.taxpayerNo?.trim())
    return useResponseError('请填写客户、发票抬头和纳税人识别号');
  if (!(await canAccessCustomer(user, String(b.customerId))))
    return useResponseError('无权操作其他销售负责的客户');
  const customer = await query(
    'SELECT id FROM crm_customer WHERE id=$1 AND deleted=false',
    [String(b.customerId)],
  );
  if (!customer.rows[0]) return useResponseError('客户不存在');
  const id = `inv${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  try {
    await query(
      'UPDATE crm_customer_invoice_profile SET is_current=false,status=$1,effective_to=COALESCE($2::date,CURRENT_DATE) WHERE customer_id=$3 AND is_current=true',
      ['历史', b.effectiveFrom || null, String(b.customerId)],
    );
    const result = await query(
      `INSERT INTO crm_customer_invoice_profile(id,customer_id,invoice_title,taxpayer_no,invoice_type,registered_address,registered_phone,bank_name,bank_account,invoice_email,invoice_phone,effective_from,is_current,status,change_reason,remark,created_by) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,true,'当前有效',$13,$14,$15) RETURNING *`,
      [
        id,
        String(b.customerId),
        b.invoiceTitle.trim(),
        b.taxpayerNo.trim(),
        b.invoiceType || '增值税普通发票',
        b.registeredAddress || '',
        b.registeredPhone || '',
        b.bankName || '',
        b.bankAccount || '',
        b.invoiceEmail || '',
        b.invoicePhone || '',
        b.effectiveFrom || new Date().toISOString().slice(0, 10),
        b.changeReason || '',
        b.remark || '',
        user.id,
      ],
    );
    recordAudit(event, {
      module: '客户中心',
      action: '新增开票信息',
      target: id,
      detail: b.invoiceTitle.trim(),
    });
    return useResponseSuccess(result.rows[0]);
  } catch (error) {
    throw error;
  }
});

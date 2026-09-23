import { eventHandler, readBody } from 'h3';
import { query } from '~/utils/db';
import { requirePermission } from '~/utils/rbac';
import { useResponseError, useResponseSuccess } from '~/utils/response';
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'contact:create');
  if (!user) return;
  const b = await readBody(event);
  if (!b?.customerId) return useResponseError('请选择所属客户');
  if (!b?.name?.trim()) return useResponseError('联系人姓名不能为空');
  const customer = await query(
    'SELECT id,status FROM crm_customer WHERE id=$1 AND deleted=false',
    [b.customerId],
  );
  if (!customer.rows[0]) return useResponseError('所属客户不存在');
  if (Number(customer.rows[0].status) !== 1)
    return useResponseError('停用客户不能新增联系人');
  if (!user.roles.includes('super') && !user.roles.includes('admin')) {
    const owner = await query('SELECT owner_id FROM crm_customer WHERE id=$1', [
      b.customerId,
    ]);
    if (owner.rows[0]?.owner_id !== user.id)
      return useResponseError('无权操作其他销售负责的客户');
  }
  try {
    const r = await query(
      'INSERT INTO crm_contact(id,customer_id,name,gender,position,contact_type,contact_business,mobile,telephone,email,wechat,is_primary,status,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *',
      [
        `ct${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
        b.customerId,
        b.name.trim(),
        b.gender ?? '',
        b.position ?? '',
        Array.isArray(b.contactRole)
          ? b.contactRole.join('、')
          : (b.contactRole ?? b.contactType ?? '其他'),
        Array.isArray(b.contactBusiness)
          ? b.contactBusiness.join('、')
          : (b.contactBusiness ?? ''),
        b.mobile ?? '',
        b.telephone ?? '',
        b.email ?? '',
        b.wechat ?? '',
        Boolean(b.isPrimary),
        b.status ?? '正常',
        b.remark ?? '',
      ],
    );
    return useResponseSuccess(r.rows[0]);
  } catch (error: any) {
    if (error?.code === '23505')
      return useResponseError('该客户已有主要联系人');
    throw error;
  }
});

import { eventHandler, getRouterParam, readBody } from 'h3';
import { query } from '~/utils/db';
import { requirePermission } from '~/utils/rbac';
import { useResponseError, useResponseSuccess } from '~/utils/response';
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'contact:update');
  if (!user) return;
  const b = await readBody(event);
  const id = getRouterParam(event, 'id');
  if (!b?.customerId || !b?.name?.trim())
    return useResponseError('所属客户和联系人姓名不能为空');
  if (b.status === '离职' && b.isPrimary)
    return useResponseError('离职联系人不能设为主要联系人');
  const customer = await query(
    'SELECT id,status FROM crm_customer WHERE id=$1 AND deleted=false',
    [b.customerId],
  );
  if (!customer.rows[0]) return useResponseError('所属客户不存在或已删除');
  if (!user.roles.includes('super') && !user.roles.includes('admin')) {
    const owner = await query('SELECT owner_id FROM crm_customer WHERE id=$1', [
      b.customerId,
    ]);
    if (owner.rows[0]?.owner_id !== user.id)
      return useResponseError('无权操作其他销售负责的客户');
  }
  try {
    const r = await query(
      'UPDATE crm_contact SET customer_id=$1,name=$2,gender=$3,position=$4,contact_type=$5,contact_business=$6,mobile=$7,telephone=$8,email=$9,wechat=$10,is_primary=$11,status=$12,remark=$13,updated_at=now() WHERE id=$14 AND deleted=false RETURNING *',
      [
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
        id,
      ],
    );
    return r.rows[0]
      ? useResponseSuccess(r.rows[0])
      : useResponseError('联系人不存在');
  } catch (error: any) {
    if (error?.code === '23505')
      return useResponseError('该客户已有主要联系人');
    throw error;
  }
});

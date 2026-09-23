import { eventHandler, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { canAccessCustomer, requirePermission } from '~/utils/rbac';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';

function dateValue(value: any) {
  return value ? new Date(String(value)) : null;
}
async function validate(b: any) {
  if (!b?.customerId) return '请选择所属客户';
  if (!b?.subject?.trim() || !b?.content?.trim())
    return '请填写跟进主题和跟进内容';
  const customer = await query(
    'SELECT id,status FROM crm_customer WHERE id=$1 AND deleted=false',
    [b.customerId],
  );
  if (!customer.rows[0]) return '所属客户不存在';
  if (Number(customer.rows[0].status) !== 1) return '停用客户不能新增跟进记录';
  if (b.opportunityId) {
    const opportunity = await query(
      'SELECT customer_id,status,deleted FROM crm_opportunity WHERE id=$1',
      [b.opportunityId],
    );
    if (!opportunity.rows[0] || opportunity.rows[0].deleted)
      return '销售机会不存在';
    if (opportunity.rows[0].customer_id !== b.customerId)
      return '销售机会不属于所选客户';
    if (opportunity.rows[0].status !== '进行中')
      return '已结束的销售机会不能新增跟进';
  }
  if (b.contactId) {
    const contact = await query(
      'SELECT id,customer_id,status FROM crm_contact WHERE id=$1 AND deleted=false',
      [b.contactId],
    );
    if (!contact.rows[0]) return '联系人不存在';
    if (contact.rows[0].customer_id !== b.customerId)
      return '联系人不属于所选客户';
    if (contact.rows[0].status === '离职')
      return '离职联系人不能作为新的跟进对象';
  }
  const follow = dateValue(b.followUpTime);
  const next = dateValue(b.nextFollowTime);
  if (!follow || Number.isNaN(follow.getTime())) return '请填写有效的跟进时间';
  if (next && (Number.isNaN(next.getTime()) || next <= follow))
    return '下次跟进时间必须晚于本次跟进时间';
  return null;
}
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'followup:create');
  if (!user) return unAuthorizedResponse(event);
  const b = await readBody(event);
  if (!(await canAccessCustomer(user, String(b?.customerId ?? ''))))
    return useResponseError('无权操作其他销售负责的客户');
  const error = await validate(b);
  if (error) return useResponseError(error);
  const id = `fu${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  const r = await query(
    'INSERT INTO crm_follow_up(id,customer_id,contact_id,opportunity_id,follow_up_time,follow_up_type,subject,content,result,intention_level,next_plan,next_follow_time,status,owner_id,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING id',
    [
      id,
      b.customerId,
      b.contactId || null,
      b.opportunityId || null,
      new Date(b.followUpTime),
      b.followUpType || '电话沟通',
      b.subject.trim(),
      b.content.trim(),
      b.result || '',
      b.intentionLevel || '中',
      b.nextPlan || '',
      b.nextFollowTime ? new Date(b.nextFollowTime) : null,
      b.status || '待跟进',
      user.id,
      b.remark || '',
    ],
  );
  recordAudit(event, {
    module: '跟进记录',
    action: '新增跟进',
    target: b.subject,
    detail: `新增客户跟进：${b.subject}`,
  });
  return useResponseSuccess(r.rows[0]);
});

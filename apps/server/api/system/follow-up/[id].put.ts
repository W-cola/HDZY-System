import { eventHandler, getRouterParam, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import {
  dataScopeCondition,
  requirePermission,
} from '~/utils/rbac';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'followup:update');
  if (!user) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id');
  const scopeValues: any[] = [];
  const scope = dataScopeCondition(user, 'c.owner_id', scopeValues).replaceAll(
    /\$(\d+)/g,
    (_m, n) => `$${Number(n) + 1}`,
  );
  const access = await query(
    `SELECT f.id FROM crm_follow_up f JOIN crm_customer c ON c.id=f.customer_id WHERE f.id=$1 AND f.deleted=false AND (${scope})`,
    [id, ...scopeValues],
  );
  if (!access.rows[0]) return useResponseError('跟进记录不存在或无权操作');
  const b = await readBody(event);
  if (!b?.customerId || !b?.subject?.trim() || !b?.content?.trim())
    return useResponseError('所属客户、跟进主题和跟进内容不能为空');
  const customer = await query(
    'SELECT status FROM crm_customer WHERE id=$1 AND deleted=false',
    [b.customerId],
  );
  if (!customer.rows[0]) return useResponseError('所属客户不存在');
  if (Number(customer.rows[0].status) !== 1)
    return useResponseError('停用客户不能编辑为新的跟进记录');
  if (b.opportunityId) {
    const opportunity = await query(
      'SELECT customer_id,status,deleted FROM crm_opportunity WHERE id=$1',
      [b.opportunityId],
    );
    if (!opportunity.rows[0] || opportunity.rows[0].deleted)
      return useResponseError('销售机会不存在');
    if (opportunity.rows[0].customer_id !== b.customerId)
      return useResponseError('销售机会不属于所选客户');
    if (opportunity.rows[0].status !== '进行中')
      return useResponseError('已结束的销售机会不能新增跟进');
  }
  if (b.contactId) {
    const c = await query(
      'SELECT customer_id,status FROM crm_contact WHERE id=$1 AND deleted=false',
      [b.contactId],
    );
    if (!c.rows[0]) return useResponseError('联系人不存在');
    if (c.rows[0].customer_id !== b.customerId)
      return useResponseError('联系人不属于所选客户');
    if (c.rows[0].status === '离职')
      return useResponseError('离职联系人不能作为新的跟进对象');
  }
  const follow = new Date(b.followUpTime);
  const next = b.nextFollowTime ? new Date(b.nextFollowTime) : null;
  if (Number.isNaN(follow.getTime()))
    return useResponseError('请填写有效的跟进时间');
  if (next && (Number.isNaN(next.getTime()) || next <= follow))
    return useResponseError('下次跟进时间必须晚于本次跟进时间');
  const r = await query(
    'UPDATE crm_follow_up SET customer_id=$1,contact_id=$2,opportunity_id=$3,follow_up_time=$4,follow_up_type=$5,subject=$6,content=$7,result=$8,intention_level=$9,next_plan=$10,next_follow_time=$11,status=$12,remark=$13,updated_at=now() WHERE id=$14 AND deleted=false RETURNING id',
    [
      b.customerId,
      b.contactId || null,
      b.opportunityId || null,
      follow,
      b.followUpType || '电话沟通',
      b.subject.trim(),
      b.content.trim(),
      b.result || '',
      b.intentionLevel || '中',
      b.nextPlan || '',
      next,
      b.status || '待跟进',
      b.remark || '',
      id,
    ],
  );
  if (!r.rows[0]) return useResponseError('跟进记录不存在');
  recordAudit(event, {
    module: '跟进记录',
    action: '编辑跟进',
    target: b.subject,
    detail: `编辑客户跟进：${b.subject}`,
  });
  return useResponseSuccess(r.rows[0]);
});

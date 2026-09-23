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
const STAGES = new Set([
  '丢单',
  '决策中',
  '初步接触',
  '商务谈判',
  '方案报价',
  '赢单',
  '需求确认',
]);
const PROBABILITY: Record<string, number> = {
  初步接触: 10,
  需求确认: 25,
  方案报价: 45,
  商务谈判: 65,
  决策中: 80,
  赢单: 100,
  丢单: 0,
};
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'opportunity:update');
  if (!user) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id');
  const body = await readBody(event);
  const scopeValues: any[] = [];
  const rawScope = dataScopeCondition(user, 'c.owner_id', scopeValues);
  const scope = rawScope.replaceAll(/\$(\d+)/g, (_m, n) => `$${Number(n) + 1}`);
  const old = await query<any>(
    `SELECT o.* FROM crm_opportunity o JOIN crm_customer c ON c.id=o.customer_id WHERE o.id=$1 AND o.deleted=false AND (${scope})`,
    [id, ...scopeValues],
  );
  if (!old.rows[0]) return useResponseError('销售机会不存在');
  const current = old.rows[0];
  const stage = body.stage ?? current.stage;
  const status = body.status ?? current.status;
  if (!STAGES.has(stage)) return useResponseError('销售机会阶段无效');
  if (
    status === '丢单' &&
    !String(body.lostReason ?? current.lost_reason ?? '').trim()
  )
    return useResponseError('丢单必须填写丢单原因');
  if (body.customerId || body.primaryContactId) {
    const customerId = body.customerId ?? current.customer_id;
    const customer = await query(
      'SELECT id,status FROM crm_customer WHERE id=$1 AND deleted=false',
      [customerId],
    );
    if (!customer.rows[0] || Number(customer.rows[0].status) !== 1)
      return useResponseError('所属客户不存在或已停用');
    if (body.primaryContactId) {
      const contact = await query(
        'SELECT customer_id,status FROM crm_contact WHERE id=$1 AND deleted=false',
        [body.primaryContactId],
      );
      if (!contact.rows[0] || contact.rows[0].customer_id !== customerId)
        return useResponseError('主要联系人不属于所选客户');
      if (contact.rows[0].status === '离职')
        return useResponseError('离职联系人不能作为主要联系人');
    }
  }
  const result = await query(
    "UPDATE crm_opportunity SET customer_id=$1,primary_contact_id=$2,owner_id=$3,name=$4,source=$5,stage=$6,status=$7,amount=$8,probability=$9,expected_close_date=$10,next_plan=$11,next_follow_time=$12,risk_level=$13,description=$14,won_at=CASE WHEN $7='赢单' THEN coalesce(won_at,now()) ELSE won_at END,lost_at=CASE WHEN $7='丢单' THEN coalesce(lost_at,now()) ELSE lost_at END,lost_reason=$15,updated_at=now() WHERE id=$16 RETURNING id",
    [
      body.customerId ?? current.customer_id,
      body.primaryContactId === undefined
        ? current.primary_contact_id
        : body.primaryContactId || null,
      body.ownerId ?? current.owner_id,
      body.name?.trim() || current.name,
      body.source ?? current.source,
      stage,
      status,
      Number(body.amount ?? current.amount),
      Number(body.probability ?? PROBABILITY[stage] ?? current.probability),
      body.expectedCloseDate ?? current.expected_close_date,
      body.nextPlan ?? current.next_plan,
      body.nextFollowTime === undefined
        ? current.next_follow_time
        : body.nextFollowTime
          ? new Date(body.nextFollowTime)
          : null,
      body.riskLevel ?? current.risk_level,
      body.description ?? current.description,
      body.lostReason ?? current.lost_reason,
      id,
    ],
  );
  if (stage !== current.stage)
    await query(
      'INSERT INTO crm_opportunity_stage_history(id,opportunity_id,from_stage,to_stage,operator_id,note) VALUES($1,$2,$3,$4,$5,$6)',
      [
        `opph${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        id,
        current.stage,
        stage,
        user.id,
        body.stageNote || '阶段推进',
      ],
    );
  recordAudit(event, {
    module: '销售机会',
    action: '编辑机会',
    target: result.rows[0].id,
    detail: `更新销售机会${current.name}`,
  });
  return useResponseSuccess(result.rows[0]);
});

import { eventHandler, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { canAccessCustomer, requirePermission } from '~/utils/rbac';
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

async function validate(body: any) {
  if (!body?.customerId || !body?.name?.trim())
    return '请选择所属客户并填写机会名称';
  const customer = await query(
    'SELECT id,status FROM crm_customer WHERE id=$1 AND deleted=false',
    [body.customerId],
  );
  if (!customer.rows[0]) return '所属客户不存在';
  if (Number(customer.rows[0].status) !== 1) return '停用客户不能新增销售机会';
  if (body.primaryContactId) {
    const contact = await query(
      'SELECT customer_id,status FROM crm_contact WHERE id=$1 AND deleted=false',
      [body.primaryContactId],
    );
    if (!contact.rows[0]) return '主要联系人不存在';
    if (contact.rows[0].customer_id !== body.customerId)
      return '主要联系人不属于所选客户';
    if (contact.rows[0].status === '离职')
      return '离职联系人不能作为主要联系人';
  }
  if (body.stage && !STAGES.has(body.stage)) return '销售机会阶段无效';
  if (body.status === '丢单' && !body.lostReason?.trim())
    return '丢单必须填写丢单原因';
  return null;
}

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'opportunity:create');
  if (!user) return unAuthorizedResponse(event);
  const body = await readBody(event);
  if (!(await canAccessCustomer(user, String(body?.customerId ?? ''))))
    return useResponseError('无权操作其他销售负责的客户');
  const error = await validate(body);
  if (error) return useResponseError(error);
  const stage = body.stage || '初步接触';
  const status = body.status || '进行中';
  const id = `opp${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
  try {
    const result = await query(
      `INSERT INTO crm_opportunity(id,customer_id,primary_contact_id,owner_id,name,source,stage,status,amount,probability,expected_close_date,next_plan,next_follow_time,risk_level,description,lost_reason) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16) RETURNING id`,
      [
        id,
        body.customerId,
        body.primaryContactId || null,
        body.ownerId || user.id,
        body.name.trim(),
        body.source || '',
        stage,
        status,
        Number(body.amount || 0),
        Number(body.probability ?? PROBABILITY[stage] ?? 10),
        body.expectedCloseDate || null,
        body.nextPlan || '',
        body.nextFollowTime ? new Date(body.nextFollowTime) : null,
        body.riskLevel || '正常',
        body.description || '',
        body.lostReason || '',
      ],
    );
    await query(
      'INSERT INTO crm_opportunity_stage_history(id,opportunity_id,from_stage,to_stage,operator_id,note) VALUES($1,$2,$3,$4,$5,$6)',
      [
        `opph${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
        id,
        '',
        stage,
        user.id,
        '创建销售机会',
      ],
    );
    recordAudit(event, {
      module: '销售机会',
      action: '新增机会',
      target: body.name,
      detail: `新增销售机会：${body.name}`,
    });
    return useResponseSuccess(result.rows[0]);
  } catch (error: any) {
    if (error?.code === '23505')
      return useResponseError('该客户下已存在同名销售机会');
    throw error;
  }
});

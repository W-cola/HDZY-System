import { eventHandler, getRouterParam } from 'h3';
import { query } from '~/utils/db';
import { dataScopeCondition, requireAuth } from '~/utils/rbac';
import {
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  const user = await requireAuth(event);
  if (!user) return;
  const id = getRouterParam(event, 'id');
  const scopeValues: any[] = [];
  const scope = dataScopeCondition(user, 'c.owner_id', scopeValues).replaceAll(
    /\$(\d+)/g,
    (_m, n) => `$${Number(n) + 1}`,
  );
  const r = await query<any>(
    `SELECT o.*,c.name AS "customerName",pc.name AS "primaryContactName",u.real_name AS "ownerName",(o.amount*o.probability/100)::float AS "weightedAmount" FROM crm_opportunity o JOIN crm_customer c ON c.id=o.customer_id LEFT JOIN crm_contact pc ON pc.id=o.primary_contact_id LEFT JOIN sys_user u ON u.id=o.owner_id WHERE o.id=$1 AND o.deleted=false AND (${scope})`,
    [id, ...scopeValues],
  );
  if (!r.rows[0]) return useResponseError('销售机会不存在');
  const [history, follows] = await Promise.all([
    query(
      `SELECT h.id,h.from_stage AS "fromStage",h.to_stage AS "toStage",h.note,u.real_name AS operator,to_char(h.created_at,'YYYY-MM-DD HH24:MI:SS') AS "createdAt" FROM crm_opportunity_stage_history h LEFT JOIN sys_user u ON u.id=h.operator_id WHERE h.opportunity_id=$1 ORDER BY h.created_at DESC`,
      [id],
    ),
    query(
      `SELECT f.id,f.subject,f.follow_up_type AS "followUpType",f.content,f.result,to_char(f.follow_up_time,'YYYY-MM-DD HH24:MI:SS') AS "followUpTime",co.name AS "contactName" FROM crm_follow_up f LEFT JOIN crm_contact co ON co.id=f.contact_id WHERE f.opportunity_id=$1 AND f.deleted=false ORDER BY f.follow_up_time DESC`,
      [id],
    ),
  ]);
  return useResponseSuccess({
    opportunity: r.rows[0],
    stageHistory: history.rows,
    followUps: follows.rows,
  });
});

import { eventHandler, getRouterParam } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import {
  dataScopeCondition,
  requirePermission,
} from '~/utils/rbac';
import { useResponseError, useResponseSuccess } from '~/utils/response';
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'customer:delete');
  if (!user) return;
  const id = getRouterParam(event, 'id');
  const scopeValues: any[] = [];
  const rawScope = dataScopeCondition(user, 'c.owner_id', scopeValues);
  const scope = rawScope.replaceAll(/\$(\d+)/g, (_m, n) => `$${Number(n) + 1}`);
  const customer = await query<{ name: string }>(
    `SELECT c.name FROM crm_customer c WHERE c.id=$1 AND c.deleted=false AND (${scope})`,
    [id, ...scopeValues],
  );
  if (!customer.rows[0])
    return useResponseError('客户不存在、已在回收站或无权操作');
  const refs = await query<{ contacts: number; followUps: number }>(
    'SELECT (SELECT count(*) FROM crm_contact WHERE customer_id=$1 AND deleted=false)::int AS contacts, (SELECT count(*) FROM crm_follow_up WHERE customer_id=$1 AND deleted=false)::int AS "followUps"',
    [id],
  );
  if (Number(refs.rows[0]?.contacts) || Number(refs.rows[0]?.followUps))
    return useResponseError('该客户仍有关联联系人或跟进记录，请先处理关联数据');
  await query(
    'UPDATE crm_customer SET deleted=true,deleted_at=now(),deleted_by=$1,delete_reason=$2,updated_at=now() WHERE id=$3',
    [user.id, '', id],
  );
  recordAudit(event, {
    module: '客户单位',
    action: '删除客户',
    target: customer.rows[0].name,
    detail: `删除客户单位：${customer.rows[0].name}`,
  });
  return useResponseSuccess({ id });
});

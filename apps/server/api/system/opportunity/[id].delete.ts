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
  const user = await requirePermission(event, 'opportunity:delete');
  if (!user) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id');
  const scopeValues: any[] = [];
  const rawScope = dataScopeCondition(user, 'c.owner_id', scopeValues);
  const scope = rawScope.replaceAll(/\$(\d+)/g, (_m, n) => `$${Number(n) + 3}`);
  const body = await readBody<{ reason?: string }>(event).catch(() => ({}));
  const result = await query<any>(
    `UPDATE crm_opportunity SET deleted=true,deleted_at=now(),deleted_by=$1,delete_reason=$2,updated_at=now() WHERE id=$3 AND deleted=false AND EXISTS (SELECT 1 FROM crm_customer c WHERE c.id=crm_opportunity.customer_id AND (${scope})) RETURNING name`,
    [user.id, body?.reason?.trim() || '业务人员移入回收站', id, ...scopeValues],
  );
  if (!result.rows[0]) return useResponseError('销售机会不存在或已在回收站');
  recordAudit(event, {
    module: '销售机会',
    action: '删除机会',
    target: result.rows[0].name,
    detail: `销售机会移入回收站：${result.rows[0].name}`,
  });
  return useResponseSuccess({ id });
});

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
  const user = await requirePermission(event, 'followup:delete');
  if (!user) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id');
  const body = await readBody<{ reason?: string }>(event).catch(() => ({}));
  const scopeValues: any[] = [];
  const rawScope = dataScopeCondition(user, 'c.owner_id', scopeValues);
  const scope = rawScope.replaceAll(/\$(\d+)/g, (_m, n) => `$${Number(n) + 1}`);
  const old = await query(
    `SELECT f.subject FROM crm_follow_up f JOIN crm_customer c ON c.id=f.customer_id WHERE f.id=$1 AND f.deleted=false AND (${scope})`,
    [id, ...scopeValues],
  );
  if (!old.rows[0]) return useResponseError('跟进记录不存在或已在回收站');
  await query(
    'UPDATE crm_follow_up SET deleted=true, deleted_at=now(), deleted_by=$1, delete_reason=$2, updated_at=now() WHERE id=$3',
    [user.id, body?.reason?.trim() ?? '', id],
  );
  recordAudit(event, {
    module: '跟进记录',
    action: '删除跟进',
    target: old.rows[0].subject,
    detail: `删除客户跟进：${old.rows[0].subject}`,
  });
  return useResponseSuccess({ id });
});

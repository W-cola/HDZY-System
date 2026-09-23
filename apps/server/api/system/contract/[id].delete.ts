import { eventHandler, getRouterParam } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { dataScopeCondition } from '~/utils/rbac';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  const user = verifyAccessToken(event);
  if (!user) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id');
  const scopeValues: any[] = [];
  const scope = dataScopeCondition(
    user as any,
    'owner_id',
    scopeValues,
  ).replaceAll(/\$(\d+)/g, (_m, n) => `$${Number(n) + 2}`);
  const r = await query<any>(
    `UPDATE crm_contract SET deleted=true,deleted_at=now(),deleted_by=$1,updated_at=now() WHERE id=$2 AND deleted=false AND (${scope}) RETURNING contract_name`,
    [user.id, id, ...scopeValues],
  );
  if (!r.rows[0]) return useResponseError('合同不存在、已删除或无权操作');
  recordAudit(event, {
    module: '合同中心',
    action: '删除合同',
    target: id,
    detail: r.rows[0].contract_name,
  });
  return useResponseSuccess({ id });
});

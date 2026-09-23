import { eventHandler, getRouterParam } from 'h3';
import { query } from '~/utils/db';
import {
  dataScopeCondition,
  requirePermission,
} from '~/utils/rbac';
import {
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'contact:update');
  if (!user) return;
  const id = getRouterParam(event, 'id');
  const scopeValues: any[] = [];
  const rawScope = dataScopeCondition(user, 'c.owner_id', scopeValues);
  const scope = rawScope.replaceAll(/\$(\d+)/g, (_m, n) => `$${Number(n) + 1}`);
  const found = await query(
    `SELECT ct.customer_id,ct.status FROM crm_contact ct JOIN crm_customer c ON c.id=ct.customer_id WHERE ct.id=$1 AND ct.deleted=false AND (${scope})`,
    [id, ...scopeValues],
  );
  if (!found.rows[0]) return useResponseError('联系人不存在或已删除');
  if (found.rows[0].status === '离职')
    return useResponseError('离职联系人不能设为主要联系人');
  await query('UPDATE crm_contact SET is_primary=false WHERE customer_id=$1', [
    found.rows[0].customer_id,
  ]);
  const r = await query(
    'UPDATE crm_contact SET is_primary=true,updated_at=now() WHERE id=$1 RETURNING id',
    [id],
  );
  return useResponseSuccess(r.rows[0]);
});

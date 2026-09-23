import { eventHandler, getRouterParam } from 'h3';
import { query } from '~/utils/db';
import { requirePermission } from '~/utils/rbac';
import { useResponseError, useResponseSuccess } from '~/utils/response';
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'invoice:delete');
  if (!user) return;
  const id = getRouterParam(event, 'id');
  const result = await query(
    'DELETE FROM crm_contract_invoice WHERE id=$1 RETURNING id',
    [id],
  );
  if (!result.rows[0]) return useResponseError('发票不存在');
  return useResponseSuccess({ id });
});

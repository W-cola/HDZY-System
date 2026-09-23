import { eventHandler, getRouterParam } from 'h3';
import { query } from '~/utils/db';
import { requirePermission } from '~/utils/rbac';
import {
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'hr:employee:delete');
  if (!user) return;
  const id = getRouterParam(event, 'id') || '';
  const result = await query<{ name: string }>(
    'DELETE FROM hr_employee WHERE id=$1 RETURNING name',
    [id],
  );
  if (!result.rows[0]) return useResponseError('员工档案不存在');
  return useResponseSuccess({ name: result.rows[0].name, deletedBy: user.id });
});

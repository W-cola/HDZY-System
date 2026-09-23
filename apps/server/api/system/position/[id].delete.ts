import { eventHandler, getRouterParam } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id')!;
  const found = await query<{ name: string }>(
    'SELECT name FROM sys_position WHERE id=$1',
    [id],
  );
  if (!found.rows[0]) return useResponseError('岗位不存在');
  const linked = await query(
    'SELECT 1 FROM sys_user WHERE position_id=$1 LIMIT 1',
    [id],
  );
  if (linked.rows[0]) return useResponseError('岗位存在关联用户，不能删除');
  await query('UPDATE sys_position SET status=0 WHERE id=$1', [id]);
  recordAudit(event, {
    module: '组织管理',
    action: '停用岗位',
    target: found.rows[0].name,
    detail: '停用岗位；为保留历史组织关系，不执行物理删除',
  });
  return useResponseSuccess({ id, disabled: true });
});

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
  const found = await query<{ name: string; pid: null | string }>(
    'SELECT name,pid FROM sys_department WHERE id=$1',
    [id],
  );
  if (!found.rows[0]) return useResponseError('部门不存在');
  const d = found.rows[0];
  if (d.pid === null) return useResponseError('公司根组织不能删除');
  const children = await query(
    'SELECT 1 FROM sys_department WHERE pid=$1 LIMIT 1',
    [id],
  );
  if (children.rows[0]) return useResponseError('部门存在下级组织，不能删除');
  const linked = await query(
    'SELECT 1 FROM sys_user WHERE dept_id=$1 UNION ALL SELECT 1 FROM sys_position WHERE dept_id=$1 LIMIT 1',
    [id],
  );
  if (linked.rows[0])
    return useResponseError('部门存在关联用户或岗位，不能删除');
  await query('UPDATE sys_department SET status=0 WHERE id=$1', [id]);
  recordAudit(event, {
    module: '组织管理',
    action: '停用部门',
    target: d.name,
    detail: '停用部门；为保留历史组织关系，不执行物理删除',
  });
  return useResponseSuccess({ id, disabled: true });
});

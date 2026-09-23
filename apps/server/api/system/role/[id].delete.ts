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
  const found = await query<any>(
    'SELECT id,name,builtin FROM sys_role WHERE id=$1',
    [id],
  );
  if (!found.rows[0]) return useResponseError('角色不存在');
  if (found.rows[0].builtin) return useResponseError('内置角色不能删除');
  const member = await query(
    'SELECT 1 FROM sys_user_role WHERE role_id=$1 LIMIT 1',
    [id],
  );
  if (member.rows[0]) return useResponseError('角色仍有成员，不能删除');
  await query('UPDATE sys_role SET status=0 WHERE id=$1', [id]);
  recordAudit(event, {
    module: '角色管理',
    action: '停用角色',
    target: found.rows[0].name,
    detail: '停用角色；为保留历史权限和审计引用，不执行物理删除',
  });
  return useResponseSuccess({ id, disabled: true });
});

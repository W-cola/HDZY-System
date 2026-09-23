import { eventHandler, getRouterParam } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { isProtectedMenu, protectedMenuMessage } from '~/utils/menu-security';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id')!;
  const found = await query<any>('SELECT id,title FROM sys_menu WHERE id=$1', [
    id,
  ]);
  if (!found.rows[0]) return useResponseError('菜单不存在');
  if (isProtectedMenu(id)) {
    recordAudit(event, {
      module: '菜单管理',
      action: '删除菜单',
      target: found.rows[0].title,
      result: '失败',
      detail: protectedMenuMessage,
    });
    return useResponseError(protectedMenuMessage);
  }
  const child = await query('SELECT 1 FROM sys_menu WHERE pid=$1 LIMIT 1', [
    id,
  ]);
  if (child.rows[0]) return useResponseError('存在下级菜单或按钮，不能删除');
  const granted = await query(
    'SELECT 1 FROM sys_role_menu WHERE menu_id=$1 LIMIT 1',
    [id],
  );
  if (granted.rows[0]) return useResponseError('菜单已被角色授权，不能删除');
  await query('DELETE FROM sys_menu WHERE id=$1', [id]);
  recordAudit(event, {
    module: '菜单管理',
    action: '删除菜单',
    target: found.rows[0].title,
    detail: '删除菜单或按钮',
  });
  return useResponseSuccess(true);
});

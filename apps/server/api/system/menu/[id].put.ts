import { eventHandler, getRouterParam, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { isProtectedMenu, protectedMenuMessage } from '~/utils/menu-security';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
const types = new Set(['button', 'catalog', 'menu']);
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id')!;
  const current = await query<any>('SELECT * FROM sys_menu WHERE id=$1', [id]);
  if (!current.rows[0]) return useResponseError('菜单不存在');
  const m = current.rows[0];
  const b = await readBody(event);
  if (
    isProtectedMenu(id) &&
    (b.status === 0 || (b.pid !== undefined && b.pid !== m.pid))
  ) {
    recordAudit(event, {
      module: '菜单管理',
      action: '编辑菜单',
      target: m.title,
      result: '失败',
      detail: protectedMenuMessage,
    });
    return useResponseError(protectedMenuMessage);
  }
  const pid = b.pid === undefined ? m.pid : b.pid || null;
  if (b.type && !types.has(b.type)) return useResponseError('菜单类型无效');
  if (pid === id) return useResponseError('上级菜单不能是自身');
  try {
    const r = await query(
      'UPDATE sys_menu SET pid=$1,name=$2,title=$3,type=$4,path=$5,component=$6,auth_code=$7,icon=$8,status=$9,sort=$10 WHERE id=$11 RETURNING id,pid,name,title,type,path,component,auth_code AS "authCode",icon,status,sort',
      [
        pid,
        b.name ?? m.name,
        b.title ?? m.title,
        b.type ?? m.type,
        b.path ?? m.path,
        b.component ?? m.component,
        b.authCode ?? m.auth_code,
        b.icon ?? m.icon,
        b.status ?? m.status,
        b.sort ?? m.sort,
        id,
      ],
    );
    const menu = r.rows[0];
    recordAudit(event, {
      module: '菜单管理',
      action: '编辑菜单',
      target: menu.title,
      detail: `更新${menu.type} ${menu.name}`,
    });
    return useResponseSuccess(menu);
  } catch (error: any) {
    if (error?.code === '23503') return useResponseError('上级菜单不存在');
    if (error?.code === '23505')
      return useResponseError('菜单名称或路由路径已存在');
    throw error;
  }
});

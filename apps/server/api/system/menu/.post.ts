import { eventHandler, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
const types = new Set(['button', 'catalog', 'menu']);
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const b = await readBody(event);
  const pid = b?.pid ?? null;
  if (!b?.name || !b?.title || !b?.type)
    return useResponseError('请完整填写菜单名称、标题和类型');
  if (!types.has(b.type)) return useResponseError('菜单类型无效');
  try {
    const id = `m${Date.now()}`;
    const r = await query(
      'INSERT INTO sys_menu(id,pid,name,title,type,path,component,auth_code,icon,status,sort) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id,pid,name,title,type,path,component,auth_code AS "authCode",icon,status,sort',
      [
        id,
        pid,
        b.name,
        b.title,
        b.type,
        b.path ?? '',
        b.component ?? '',
        b.authCode ?? '',
        b.icon ?? '',
        b.status ?? 1,
        b.sort ?? 1,
      ],
    );
    const menu = r.rows[0];
    recordAudit(event, {
      module: '菜单管理',
      action: '新增菜单',
      target: menu.title,
      detail: `新增${menu.type} ${menu.name}`,
    });
    return useResponseSuccess(menu);
  } catch (error: any) {
    if (error?.code === '23503') return useResponseError('上级菜单不存在');
    if (error?.code === '23505')
      return useResponseError('菜单名称或路由路径已存在');
    throw error;
  }
});

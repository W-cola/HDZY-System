import { eventHandler, getRouterParam, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { getDatabase } from '~/utils/db';
import { normalizeRolePermissionIds } from '~/utils/permission-policy';
import { verifyAccessToken } from '~/utils/jwt-utils';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id')!;
  const b = await readBody(event);
  const requested = Array.isArray(b?.permissions)
    ? b.permissions.filter((x: any) => typeof x === 'string')
    : [];
  const db: any = await getDatabase();
  const run = async (tx: any) => {
    const role = await tx.query(
      'SELECT id,code,name FROM sys_role WHERE id=$1 FOR UPDATE',
      [id],
    );
    if (!role.rows[0]) return null;
    if (role.rows[0].code === 'super')
      throw Object.assign(new Error('BUILTIN_SUPER'), { business: true });
    const menuRows = await tx.query(
      'SELECT id,pid,auth_code AS "authCode" FROM sys_menu WHERE status=1',
    );
    const roleData = await tx.query('SELECT data_scope FROM sys_role WHERE id=$1', [id]);
    const normalized = normalizeRolePermissionIds(
      roleData.rows[0]?.data_scope,
      menuRows.rows,
      requested,
    );
    const valid = menuRows.rows.filter((menu: any) => normalized.includes(menu.id));
    if (valid.length !== normalized.length)
      throw Object.assign(new Error('INVALID_MENU'), { business: true });
    const all = new Set<string>();
    for (const menu of valid) {
      all.add(menu.id);
      let pid = menu.pid;
      while (pid) {
        all.add(pid);
        const p = await tx.query('SELECT pid FROM sys_menu WHERE id=$1', [pid]);
        pid = p.rows[0]?.pid;
      }
    }
    await tx.query('DELETE FROM sys_role_menu WHERE role_id=$1', [id]);
    for (const menuId of all)
      await tx.query(
        'INSERT INTO sys_role_menu(role_id,menu_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [id, menuId],
      );
    return { role: role.rows[0], permissions: [...all] };
  };
  try {
    const result =
      'transaction' in db
        ? await db.transaction(run)
        : await (async () => {
            const c = await db.connect();
            try {
              await c.query('BEGIN');
              const x = await run(c);
              await c.query('COMMIT');
              return x;
            } catch (error) {
              await c.query('ROLLBACK');
              throw error;
            } finally {
              c.release();
            }
          })();
    if (!result) return useResponseError('角色不存在');
    recordAudit(event, {
      module: '角色管理',
      action: '调整权限',
      target: result.role.name,
      detail: `更新菜单权限，共 ${requested.length} 项`,
    });
    return useResponseSuccess(result.permissions);
  } catch (error: any) {
    if (error?.message === 'BUILTIN_SUPER')
      return useResponseError('超级管理员拥有全部权限，系统不允许修改其权限');
    if (error?.message === 'INVALID_MENU')
      return useResponseError('存在无效的菜单权限');
    throw error;
  }
});

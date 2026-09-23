import { eventHandler, readBody } from 'h3';
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
  const b = await readBody(event);
  if (!b?.name || !b?.code || !b?.dataScope)
    return useResponseError('请完整填写角色名称、编码和数据范围');
  try {
    const id = `r${Date.now()}`;
    const result = await query(
      'INSERT INTO sys_role(id,code,name,builtin,status,data_scope,remark) VALUES($1,$2,$3,false,$4,$5,$6) RETURNING id,code,name,builtin,status,data_scope AS "dataScope",remark',
      [id, b.code, b.name, b.status ?? 1, b.dataScope, b.remark ?? ''],
    );
    const role = result.rows[0];
    if (Array.isArray(b.permissions))
      for (const menuId of b.permissions)
        await query(
          'INSERT INTO sys_role_menu(role_id,menu_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
          [id, menuId],
        );
    recordAudit(event, {
      module: '角色管理',
      action: '新增角色',
      target: role.name,
      detail: `新增角色 ${role.code}`,
    });
    return useResponseSuccess({
      ...role,
      permissions: b.permissions ?? [],
      members: 0,
    });
  } catch (error: any) {
    if (error?.code === '23505') return useResponseError('角色编码已存在');
    throw error;
  }
});

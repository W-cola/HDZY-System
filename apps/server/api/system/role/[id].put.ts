import { eventHandler, getRouterParam, readBody } from 'h3';
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
  const b = await readBody(event);
  const current = await query<any>('SELECT * FROM sys_role WHERE id=$1', [id]);
  if (!current.rows[0]) return useResponseError('角色不存在');
  const r = current.rows[0];
  if (r.code === 'super')
    return useResponseError('超级管理员是系统内置角色，不允许编辑');
  try {
    const result = await query(
      'UPDATE sys_role SET code=$1,name=$2,status=$3,data_scope=$4,remark=$5 WHERE id=$6 RETURNING id,code,name,builtin,status,data_scope AS "dataScope",remark',
      [
        b.code ?? r.code,
        b.name ?? r.name,
        b.status ?? r.status,
        b.dataScope ?? r.data_scope,
        b.remark ?? r.remark,
        id,
      ],
    );
    const role = result.rows[0];
    recordAudit(event, {
      module: '角色管理',
      action: '编辑角色',
      target: role.name,
      detail: `更新角色 ${role.code}`,
    });
    return useResponseSuccess(role);
  } catch (error: any) {
    if (error?.code === '23505') return useResponseError('角色编码已存在');
    throw error;
  }
});

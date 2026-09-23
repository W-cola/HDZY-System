import { eventHandler, getRouterParam, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { isPositiveInteger, normalizeId } from '~/utils/organization-rules';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id')!;
  const current = await query('SELECT * FROM sys_position WHERE id=$1', [id]);
  if (!current.rows[0]) return useResponseError('岗位不存在');
  const p = current.rows[0];
  const b = await readBody(event);
  const deptId = b.deptId === undefined ? p.dept_id : normalizeId(b.deptId);
  const sort = b.sort === undefined ? p.sort : b.sort;
  if (!deptId) return useResponseError('所属部门不能为空');
  if (!isPositiveInteger(sort))
    return useResponseError('排序必须是大于等于1的正整数');
  try {
    const result = await query(
      'UPDATE sys_position SET dept_id=$1,code=$2,name=$3,status=$4,sort=$5,remark=$6 WHERE id=$7 RETURNING id,dept_id AS "deptId",code,name,status,sort,remark',
      [
        deptId,
        b.code ?? p.code,
        b.name ?? p.name,
        b.status ?? p.status,
        Number(sort),
        b.remark ?? p.remark,
        id,
      ],
    );
    const updated = result.rows[0];
    recordAudit(event, {
      module: '组织管理',
      action: '编辑岗位',
      target: updated.name,
      detail: `更新岗位 ${updated.code}`,
    });
    return useResponseSuccess(updated);
  } catch (error: any) {
    if (error?.code === '23503') return useResponseError('所属部门不存在');
    if (error?.code === '23505')
      return useResponseError('岗位编码、名称或排序号已存在');
    throw error;
  }
});

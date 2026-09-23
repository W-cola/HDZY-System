import { eventHandler, readBody } from 'h3';
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
  const b = await readBody(event);
  const deptId = normalizeId(b?.deptId);
  if (!b?.name?.trim() || !b?.code?.trim() || !deptId)
    return useResponseError('请完整填写岗位名称、编码和所属部门');
  let sort = b?.sort;
  if (sort === undefined) {
    const next = await query<{ sort: number }>(
      'SELECT coalesce(max(sort),0)+1 AS sort FROM sys_position WHERE dept_id=$1',
      [deptId],
    );
    sort = next.rows[0]?.sort ?? 1;
  }
  if (!isPositiveInteger(sort))
    return useResponseError('排序必须是大于等于1的正整数');
  try {
    const id = `p${Date.now()}`;
    const result = await query(
      'INSERT INTO sys_position(id,dept_id,code,name,status,sort,remark) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,dept_id AS "deptId",code,name,status,sort,remark',
      [
        id,
        deptId,
        b.code.trim(),
        b.name.trim(),
        b.status ?? 1,
        Number(sort),
        b.remark ?? '',
      ],
    );
    const position = result.rows[0];
    recordAudit(event, {
      module: '组织管理',
      action: '新增岗位',
      target: position.name,
      detail: `新增岗位 ${position.code}`,
    });
    return useResponseSuccess(position);
  } catch (error: any) {
    if (error?.code === '23503') return useResponseError('所属部门不存在');
    if (error?.code === '23505')
      return useResponseError('岗位编码、名称或排序号已存在');
    throw error;
  }
});

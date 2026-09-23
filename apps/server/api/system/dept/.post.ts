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
  const pid = normalizeId(b?.pid) ?? null;
  if (!b?.name?.trim()) return useResponseError('部门名称不能为空');
  let sort = b?.sort;
  if (sort === undefined) {
    const next = await query<{ sort: number }>(
      'SELECT coalesce(max(sort),0)+1 AS sort FROM sys_department WHERE pid IS NOT DISTINCT FROM $1',
      [pid],
    );
    sort = next.rows[0]?.sort ?? 1;
  }
  if (!isPositiveInteger(sort))
    return useResponseError('排序必须是大于等于1的正整数');
  try {
    const id = `dept${Date.now()}`;
    const result = await query(
      'INSERT INTO sys_department(id,pid,name,leader,status,sort,remark) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id,pid,name,leader,status,sort,remark',
      [
        id,
        pid,
        b.name.trim(),
        b.leader ?? '',
        b.status ?? 1,
        Number(sort),
        b.remark ?? '',
      ],
    );
    const department = result.rows[0];
    recordAudit(event, {
      module: '组织管理',
      action: '新增部门',
      target: department.name,
      detail: `新增部门并归属上级 ${pid ?? '根组织'}`,
    });
    return useResponseSuccess(department);
  } catch (error: any) {
    if (error?.code === '23503') return useResponseError('上级部门不存在');
    if (error?.code === '23505')
      return useResponseError('同级部门名称或排序号已存在');
    throw error;
  }
});

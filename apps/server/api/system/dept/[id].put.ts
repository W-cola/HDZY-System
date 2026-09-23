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
  const current = await query('SELECT * FROM sys_department WHERE id=$1', [id]);
  if (!current.rows[0]) return useResponseError('部门不存在');
  const d = current.rows[0];
  const b = await readBody(event);
  const pid = b.pid === undefined ? d.pid : (normalizeId(b.pid) ?? null);
  const sort = b.sort === undefined ? d.sort : b.sort;
  if (!isPositiveInteger(sort))
    return useResponseError('排序必须是大于等于1的正整数');
  if (pid === id) return useResponseError('上级部门不能是自身');
  if (pid) {
    const parent = await query('SELECT 1 FROM sys_department WHERE id=$1', [
      pid,
    ]);
    if (!parent.rows[0]) return useResponseError('上级部门不存在');
    let cursor = pid;
    while (cursor) {
      if (cursor === id)
        return useResponseError('上级部门不能选择当前部门的下级组织');
      const next = await query<{ pid: null | string }>(
        'SELECT pid FROM sys_department WHERE id=$1',
        [cursor],
      );
      cursor = next.rows[0]?.pid ?? '';
    }
  }
  try {
    const result = await query(
      'UPDATE sys_department SET pid=$1,name=$2,leader=$3,status=$4,sort=$5,remark=$6,updated_at=now() WHERE id=$7 RETURNING id,pid,name,leader,status,sort,remark',
      [
        pid,
        b.name ?? d.name,
        b.leader ?? d.leader,
        b.status ?? d.status,
        Number(sort),
        b.remark ?? d.remark,
        id,
      ],
    );
    const updated = result.rows[0];
    recordAudit(event, {
      module: '组织管理',
      action: '编辑部门',
      target: updated.name,
      detail: '更新部门信息或组织层级',
    });
    return useResponseSuccess(updated);
  } catch (error: any) {
    if (error?.code === '23505')
      return useResponseError('同级部门名称或排序号已存在');
    throw error;
  }
});

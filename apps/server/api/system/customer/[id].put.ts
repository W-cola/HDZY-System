import { eventHandler, getRouterParam } from 'h3';
import { z } from 'zod';
import { query } from '~/utils/db';
import {
  dataScopeCondition,
  requirePermission,
} from '~/utils/rbac';
import { useResponseError, useResponseSuccess } from '~/utils/response';
import { parseBody } from '~/utils/validation';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'customer:update');
  if (!user) return;
  const b = await parseBody(
    event,
    z.object({
      name: z.string().trim().min(1).max(200),
      shortName: z.string().max(200).optional(),
      type: z.enum(['企业', '个人', '其他']).optional(),
      industry: z.string().max(100).optional(),
      phone: z.string().max(50).optional(),
      region: z.string().max(100).optional(),
      source: z.string().max(100).optional(),
      level: z.enum(['普通', '重要', '核心']).optional(),
      ownerId: z.string().max(128).optional().nullable(),
      status: z.coerce
        .number()
        .int()
        .refine((v) => [0, 1].includes(v))
        .default(1),
      remark: z.string().max(2000).optional(),
    }),
  );
  if (!b) return;
  const id = getRouterParam(event, 'id');
  if (b.ownerId) {
    const owner = await query(
      `SELECT u.id FROM sys_user u JOIN sys_user_role ur ON ur.user_id=u.id JOIN sys_role r ON r.id=ur.role_id WHERE u.id=$1 AND u.status=1 AND u.locked=false AND r.code='sales'`,
      [String(b.ownerId)],
    );
    if (owner.rows.length === 0)
      return useResponseError('负责人必须是启用且未锁定的销售人员');
    if (!user.roles.includes('super') && !user.roles.includes('admin')) {
      const current = await query(
        'SELECT owner_id FROM crm_customer WHERE id=$1 AND deleted=false',
        [id],
      );
      if (
        !current.rows[0] ||
        current.rows[0].owner_id !== user.id ||
        String(b.ownerId) !== String(user.id)
      )
        return useResponseError('无权转移或编辑其他销售负责的客户');
    }
  }
  const values: any[] = [
    b.name.trim(),
    b.shortName ?? '',
    b.type ?? '企业',
    b.industry ?? '',
    b.phone ?? '',
    b.region ?? '',
    b.source ?? '',
    b.level ?? '普通',
    b.ownerId || null,
    b.status ?? 1,
    b.remark ?? '',
    id,
  ];
  const scopeValues: any[] = [];
  const rawScope = dataScopeCondition(
    user,
    'crm_customer.owner_id',
    scopeValues,
  );
  const scope = rawScope.replaceAll(
    /\$(\d+)/g,
    (_m, n) => `$${Number(n) + values.length}`,
  );
  const r = await query(
    `UPDATE crm_customer SET name=$1,short_name=$2,type=$3,industry=$4,phone=$5,region=$6,source=$7,level=$8,owner_id=$9,status=$10,remark=$11,updated_at=now() WHERE id=$12 AND (${scope}) RETURNING *`,
    [...values, ...scopeValues],
  );
  return r.rows[0]
    ? useResponseSuccess(r.rows[0])
    : useResponseError('客户不存在或无权操作');
});

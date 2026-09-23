import { eventHandler } from 'h3';
import { z } from 'zod';
import { query } from '~/utils/db';
import { isSuper, requirePermission } from '~/utils/rbac';
import { useResponseError, useResponseSuccess } from '~/utils/response';
import { parseBody } from '~/utils/validation';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'customer:create');
  if (!user) return;
  if (!isSuper(user))
    return useResponseError('普通销售只能通过归属客户进行操作');
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
  if (!b?.name?.trim()) return useResponseError('客户名称不能为空');
  try {
    if (b.ownerId) {
      const owner = await query(
        `SELECT u.id FROM sys_user u JOIN sys_user_role ur ON ur.user_id=u.id JOIN sys_role r ON r.id=ur.role_id WHERE u.id=$1 AND u.status=1 AND u.locked=false AND r.code='sales'`,
        [String(b.ownerId)],
      );
      if (owner.rows.length === 0)
        return useResponseError('负责人必须是启用且未锁定的销售人员');
    }
    const result = await query(
      `INSERT INTO crm_customer(id,name,short_name,type,industry,phone,region,source,level,owner_id,status,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        `c${Date.now()}`,
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
      ],
    );
    return useResponseSuccess(result.rows[0]);
  } catch (error: any) {
    if (error?.code === '23505') return useResponseError('客户名称已存在');
    throw error;
  }
});

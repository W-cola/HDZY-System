import { eventHandler } from 'h3';
import { z } from 'zod';
import {
  dataScopeCondition,
  requirePermission,
} from '~/utils/rbac';
import { usePageResponseSuccess } from '~/utils/response';
import { getPageParams, queryPage } from '~/utils/sql-pagination';
import { pageQuerySchema, parseQuery } from '~/utils/validation';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'customer:list:view');
  if (!user) return;
  const q = parseQuery(
    event,
    pageQuerySchema.extend({
      keyword: z.string().max(100).optional(),
      customerType: z.string().max(50).optional(),
      type: z.string().max(50).optional(),
      industry: z.string().max(100).optional(),
      region: z.string().max(100).optional(),
      source: z.string().max(100).optional(),
      customerLevel: z.string().max(50).optional(),
      level: z.string().max(50).optional(),
      status: z.coerce.number().int().optional(),
      ownerId: z.string().max(128).optional(),
    }),
  );
  if (!q) return;
  const values: any[] = [];
  const conditions: string[] = ['c.deleted = false'];
  conditions.push(dataScopeCondition(user, 'c.owner_id', values));
  const add = (sql: string, value: any) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };
  const getFilterValue = (value: any): string | undefined => {
    if (Array.isArray(value)) return getFilterValue(value[0]);
    if (value && typeof value === 'object') {
      return getFilterValue(value.value ?? value.id ?? value.key);
    }
    const normalized =
      value === undefined || value === null ? '' : String(value).trim();
    return normalized || undefined;
  };
  if (q.keyword) {
    const keyword = `%${String(q.keyword)}%`;
    values.push(keyword, keyword, keyword, keyword);
    conditions.push(
      `(c.name ILIKE $${values.length - 3} OR c.short_name ILIKE $${values.length - 2} OR c.phone ILIKE $${values.length - 1} OR u.real_name ILIKE $${values.length})`,
    );
  }
  const type = getFilterValue(q.customerType ?? q.type);
  const industry = getFilterValue(q.industry);
  const region = getFilterValue(q.region);
  const source = getFilterValue(q.source);
  const level = getFilterValue(q.customerLevel ?? q.level);
  if (type) add('c.type=?', type);
  if (industry) add('c.industry=?', industry);
  if (region) add('c.region=?', region);
  if (source) add('c.source=?', source);
  if (level) add('c.level=?', level);
  if (q.status !== undefined && q.status !== '')
    add('c.status=?', Number(q.status));
  const ownerId = getFilterValue(q.ownerId);
  if (ownerId) add('c.owner_id=?', ownerId);
  const { page, pageSize } = getPageParams(q);
  const fromWhere = `FROM crm_customer c LEFT JOIN sys_user u ON u.id=c.owner_id ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}`;
  const result = await queryPage(
    `SELECT c.id,c.name,c.short_name AS "shortName",c.type,c.industry,c.phone,c.region,c.source,c.level,c.owner_id AS "ownerId",u.real_name AS "ownerName",c.status,c.remark,to_char(c.created_at,'YYYY-MM-DD HH24:MI:SS') AS "createdAt" ${fromWhere} ORDER BY c.created_at DESC`,
    `SELECT COUNT(*)::int AS total ${fromWhere}`,
    values,
    page,
    pageSize,
  );
  return usePageResponseSuccess(String(page), String(pageSize), result.rows, {
    total: result.total,
    alreadyPaginated: true,
  });
});

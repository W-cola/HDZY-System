import { eventHandler, getQuery } from 'h3';
import { z } from 'zod';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import {
  unAuthorizedResponse,
  usePageResponseSuccess,
  useResponseError,
} from '~/utils/response';
import { pageQuerySchema } from '~/utils/validation';

export default eventHandler(async (event) => {
  const user = verifyAccessToken(event);
  if (!user) return unAuthorizedResponse(event);
  if (!user.roles?.some((role: string) => ['admin', 'super'].includes(role)))
    return useResponseError('只有系统管理员可以访问回收站');
  const raw = getQuery(event);
  const q = pageQuerySchema
    .extend({
      keyword: z.string().max(100).optional(),
      entityType: z
        .enum(['客户单位', '联系人', '跟进记录', '销售机会'])
        .optional(),
    })
    .parse(raw);
  const keyword = q.keyword ? `%${String(q.keyword)}%` : null;
  const values: any[] = [];
  const filters: string[] = [];
  if (keyword) {
    values.push(keyword);
    filters.push(`name ILIKE $${values.length}`);
  }
  if (q.entityType) {
    values.push(String(q.entityType));
    filters.push(`entity_type=$${values.length}`);
  }
  const where = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
  const [customers, contacts, follows, opportunities] = await Promise.all([
    query(
      `SELECT c.id,c.name,c.delete_reason AS "deleteReason",c.deleted_at AS "deletedAt",u.real_name AS "deletedBy",(SELECT count(*)::int FROM crm_contact x WHERE x.customer_id=c.id AND x.deleted=false)+(SELECT count(*)::int FROM crm_follow_up x WHERE x.customer_id=c.id AND x.deleted=false) AS "referenceCount" FROM crm_customer c LEFT JOIN sys_user u ON u.id=c.deleted_by WHERE c.deleted=true ${keyword ? 'AND c.name ILIKE $1' : ''}`,
      keyword ? [keyword] : [],
    ),
    query(
      `SELECT c.id,c.name,c.delete_reason AS "deleteReason",cu.name AS "customerName",c.deleted_at AS "deletedAt",u.real_name AS "deletedBy",(SELECT count(*)::int FROM crm_follow_up x WHERE x.contact_id=c.id AND x.deleted=false) AS "referenceCount" FROM crm_contact c JOIN crm_customer cu ON cu.id=c.customer_id LEFT JOIN sys_user u ON u.id=c.deleted_by WHERE c.deleted=true ${keyword ? 'AND (c.name ILIKE $1 OR cu.name ILIKE $1)' : ''}`,
      keyword ? [keyword] : [],
    ),
    query(
      `SELECT f.id,f.subject AS name,f.delete_reason AS "deleteReason",cu.name AS "customerName",f.deleted_at AS "deletedAt",u.real_name AS "deletedBy",0 AS "referenceCount" FROM crm_follow_up f JOIN crm_customer cu ON cu.id=f.customer_id LEFT JOIN sys_user u ON u.id=f.deleted_by WHERE f.deleted=true ${keyword ? 'AND (f.subject ILIKE $1 OR cu.name ILIKE $1)' : ''}`,
      keyword ? [keyword] : [],
    ),
    query(
      `SELECT o.id,o.name,o.delete_reason AS "deleteReason",c.name AS "customerName",o.deleted_at AS "deletedAt",u.real_name AS "deletedBy",(SELECT count(*)::int FROM crm_follow_up f WHERE f.opportunity_id=o.id) AS "referenceCount" FROM crm_opportunity o JOIN crm_customer c ON c.id=o.customer_id LEFT JOIN sys_user u ON u.id=o.deleted_by WHERE o.deleted=true ${keyword ? 'AND (o.name ILIKE $1 OR c.name ILIKE $1)' : ''}`,
      keyword ? [keyword] : [],
    ),
  ]);
  const items = [
    ...(q.entityType && q.entityType !== '客户单位'
      ? []
      : customers.rows.map((x: any) => ({
          ...x,
          entityType: '客户单位',
          entityId: x.id,
        }))),
    ...(q.entityType && q.entityType !== '联系人'
      ? []
      : contacts.rows.map((x: any) => ({
          ...x,
          entityType: '联系人',
          entityId: x.id,
        }))),
    ...(q.entityType && q.entityType !== '跟进记录'
      ? []
      : follows.rows.map((x: any) => ({
          ...x,
          entityType: '跟进记录',
          entityId: x.id,
        }))),
    ...(q.entityType && q.entityType !== '销售机会'
      ? []
      : opportunities.rows.map((x: any) => ({
          ...x,
          entityType: '销售机会',
          entityId: x.id,
        }))),
  ].sort((a, b) => String(b.deletedAt).localeCompare(String(a.deletedAt)));
  return usePageResponseSuccess(
    String(q.page ?? 1),
    String(q.pageSize ?? 20),
    items,
  );
});

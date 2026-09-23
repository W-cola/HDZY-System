import { eventHandler, getQuery } from 'h3';
import {
  dataScopeCondition,
  requirePermission,
} from '~/utils/rbac';
import { usePageResponseSuccess } from '~/utils/response';
import { getPageParams, queryPage } from '~/utils/sql-pagination';
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'contact:list:view');
  if (!user) return;
  const q = getQuery(event);
  const values: any[] = [];
  const conditions: string[] = [
    'c.deleted IS NOT TRUE',
    'cu.deleted IS NOT TRUE',
  ];
  conditions.push(dataScopeCondition(user, 'cu.owner_id', values));
  const add = (sql: string, value: any) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };
  if (q.keyword) {
    const keyword = `%${String(q.keyword)}%`;
    values.push(keyword, keyword, keyword);
    conditions.push(
      `(c.name ILIKE $${values.length - 2} OR c.mobile ILIKE $${values.length - 1} OR cu.name ILIKE $${values.length})`,
    );
  }
  const normalizeId = (value: any) => {
    if (Array.isArray(value)) return value[0];
    if (value && typeof value === 'object')
      return value.value ?? value.id ?? value.key;
    return value;
  };
  const ownerId = normalizeId(q.ownerId);
  const contactRole = normalizeId(
    q.contactRole ??
      q.contactRoleFilter ??
      q.contactType ??
      q.contactTypeFilter,
  );
  const contactBusiness = normalizeId(
    q.contactBusiness ?? q.contactBusinessFilter,
  );
  const contactStatus = normalizeId(q.status ?? q.contactStatus);
  const customerKeyword = normalizeId(q.customerKeyword);
  const positionFilter = normalizeId(q.positionFilter);
  const primaryContact = normalizeId(q.primaryContact);
  if (q.customerId) add('c.customer_id=?', String(q.customerId));
  if (ownerId) add('cu.owner_id=?', String(ownerId));
  if (contactRole) add('c.contact_type ILIKE ?', `%${String(contactRole)}%`);
  if (contactBusiness)
    add('c.contact_business ILIKE ?', `%${String(contactBusiness)}%`);
  if (contactStatus) add('c.status=?', String(contactStatus));
  if (customerKeyword) {
    values.push(`%${customerKeyword}%`);
    conditions.push(
      `(cu.name ILIKE $${values.length} OR cu.short_name ILIKE $${values.length})`,
    );
  }
  if (positionFilter) {
    values.push(`%${positionFilter}%`);
    conditions.push(`c.position ILIKE $${values.length}`);
  }
  if (primaryContact !== undefined && primaryContact !== '') {
    const primaryValue = String(primaryContact).toLowerCase();
    if (primaryValue === '1' || primaryValue === 'true') {
      conditions.push('c.is_primary = true');
    } else if (primaryValue === '0' || primaryValue === 'false') {
      conditions.push('c.is_primary = false');
    }
  }
  const { page, pageSize } = getPageParams(q);
  const fromWhere = `FROM crm_contact c JOIN crm_customer cu ON cu.id=c.customer_id LEFT JOIN sys_user owner ON owner.id=cu.owner_id ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''}`;
  const result = await queryPage(
    `SELECT c.id,c.customer_id AS "customerId",cu.name AS "customerName",cu.owner_id AS "ownerId",owner.real_name AS "ownerName",c.name,c.gender,c.position,c.contact_type AS "contactRole",c.contact_business AS "contactBusiness",c.mobile,c.telephone,c.email,c.wechat,c.is_primary AS "isPrimary",c.status,c.remark,to_char(c.created_at,'YYYY-MM-DD HH24:MI:SS') AS "createdAt" ${fromWhere} ORDER BY c.is_primary DESC,c.created_at DESC`,
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

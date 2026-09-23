import { eventHandler, readBody } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';

const fields = [
  'name',
  'shortName',
  'type',
  'industry',
  'phone',
  'region',
  'source',
  'level',
  'ownerId',
  'status',
  'remark',
];
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const body = await readBody(event);
  const customers = Array.isArray(body?.customers) ? body.customers : [];
  if (customers.length === 0) return useResponseError('导入文件中没有有效数据');
  if (customers.length > 2000)
    return useResponseError('单次最多导入2000条客户数据');
  const names = new Set<string>();
  for (let i = 0; i < customers.length; i++) {
    const row = customers[i] ?? {};
    const ownerText = String(row.ownerId ?? row.ownerName ?? '').trim();
    if (ownerText && !row.ownerId) {
      const ownerByName = await query(
        `SELECT u.id FROM sys_user u JOIN sys_user_role ur ON ur.user_id=u.id JOIN sys_role r ON r.id=ur.role_id WHERE u.real_name=$1 AND u.status=1 AND u.locked=false AND r.code='sales'`,
        [ownerText],
      );
      if (ownerByName.rows.length !== 1)
        return useResponseError(`第${i + 2}行：负责人姓名不存在或匹配不唯一`);
      row.ownerId = ownerByName.rows[0].id;
    }
    const name = String(row.name ?? '').trim();
    if (!name) return useResponseError(`第${i + 2}行：客户名称不能为空`);
    if (names.has(name))
      return useResponseError(`第${i + 2}行：客户名称在文件中重复`);
    names.add(name);
    const statusText = String(row.status ?? '').trim();
    const normalizedStatus =
      statusText === '' || statusText === '正常' || statusText === '1'
        ? 1
        : statusText === '停用' || statusText === '0'
          ? 0
          : null;
    if (normalizedStatus === null)
      return useResponseError(`第${i + 2}行：状态只能填写正常或停用`);
    row.status = normalizedStatus;
    delete row.ownerName;
  }
  for (const row of customers) {
    if (row.ownerId) {
      const owner = await query(
        `SELECT u.id FROM sys_user u JOIN sys_user_role ur ON ur.user_id=u.id JOIN sys_role r ON r.id=ur.role_id WHERE u.id=$1 AND u.status=1 AND u.locked=false AND r.code='sales'`,
        [String(row.ownerId)],
      );
      if (owner.rows.length === 0)
        return useResponseError('负责人必须是启用且未锁定的销售人员');
    }
  }
  const db = await query('SELECT name FROM crm_customer WHERE name = ANY($1)', [
    [...names],
  ]);
  if (db.rows.length > 0)
    return useResponseError(
      `客户已存在：${db.rows.map((x: any) => x.name).join('、')}`,
    );
  for (const row of customers) {
    await query(
      `INSERT INTO crm_customer(id,name,short_name,type,industry,phone,region,source,level,owner_id,status,remark) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`,
      [
        `c${Date.now()}${Math.random().toString(36).slice(2, 8)}`,
        String(row.name).trim(),
        row.shortName ?? '',
        row.type ?? '企业',
        row.industry ?? '',
        row.phone ?? '',
        row.region ?? '',
        row.source ?? '',
        row.level ?? '普通',
        row.ownerId ? String(row.ownerId) : null,
        row.status,
        row.remark ?? '',
      ],
    );
  }
  return useResponseSuccess({ imported: customers.length });
});

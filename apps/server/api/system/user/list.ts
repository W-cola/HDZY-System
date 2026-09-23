import { eventHandler, getQuery } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, usePageResponseSuccess } from '~/utils/response';
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const q = getQuery(event);
  const values: any[] = [];
  const conditions: string[] = [];
  const add = (sql: string, value: any) => {
    values.push(value);
    conditions.push(sql.replace('?', `$${values.length}`));
  };
  if (q.username) add('u.username ILIKE ?', `%${String(q.username)}%`);
  if (q.realName) add('u.real_name ILIKE ?', `%${String(q.realName)}%`);
  if (q.userId) add('u.id ILIKE ?', `%${String(q.userId)}%`);
  if (q.phone) add('u.phone ILIKE ?', `%${String(q.phone)}%`);
  if (q.email) add('u.email ILIKE ?', `%${String(q.email)}%`);
  if (q.remark) add('u.remark ILIKE ?', `%${String(q.remark)}%`);
  if (q.status !== undefined && q.status !== '')
    add('u.status=?', Number(q.status));
  if (q.locked !== undefined && q.locked !== '')
    add('u.locked=?', String(q.locked) === 'true');
  const firstQueryValue = (value: any) => {
    if (value === undefined || value === null || value === '') return undefined;
    if (typeof value === 'object' && !Array.isArray(value))
      return firstQueryValue(value.value ?? value.key ?? value.id);
    if (Array.isArray(value)) {
      const item = value.find((entry) => entry !== '' && entry !== null);
      return firstQueryValue(item);
    }
    if (typeof value === 'string') {
      const text = value.trim();
      if (text.startsWith('[') || text.startsWith('{')) {
        try {
          return firstQueryValue(JSON.parse(text));
        } catch {
          // 保留原值，兼容普通字符串中的特殊字符
        }
      }
      return text;
    }
    return value;
  };
  const positionId = firstQueryValue(q.positionId);
  const roleCode = firstQueryValue(q.roleCode);
  if (positionId) add('u.position_id=?', String(positionId));
  if (roleCode) {
    add(
      'EXISTS (SELECT 1 FROM sys_user_role filter_ur JOIN sys_role filter_r ON filter_r.id=filter_ur.role_id WHERE filter_ur.user_id=u.id AND filter_r.code=?)',
      String(roleCode),
    );
  }
  const queryRange = (value: any) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) return parsed;
      } catch {}
      return value.split(',');
    }
    return [];
  };
  const createdRange = queryRange(q.createdAt);
  if (createdRange.length === 2 && createdRange[0] && createdRange[1]) {
    add('u.created_at >= (?::date)', String(createdRange[0]));
    add(
      "u.created_at < ((?::date) + interval '1 day')",
      String(createdRange[1]),
    );
  }
  const lastLoginRange = queryRange(q.lastLoginAt);
  if (lastLoginRange.length === 2 && lastLoginRange[0] && lastLoginRange[1]) {
    add('u.last_login_at >= (?::date)', String(lastLoginRange[0]));
    add(
      "u.last_login_at < ((?::date) + interval '1 day')",
      String(lastLoginRange[1]),
    );
  }
  if (q.deptId)
    add(
      `u.dept_id IN (WITH RECURSIVE d AS (SELECT id FROM sys_department WHERE id=? UNION ALL SELECT x.id FROM sys_department x JOIN d ON x.pid=d.id) SELECT id FROM d)`,
      String(q.deptId),
    );
  const result = await query(
    `SELECT u.id,u.username,u.real_name AS "realName",u.phone,u.email,u.dept_id AS "deptId",u.position_id AS "positionId",u.leader_id AS "leaderId",u.status,u.locked,u.must_change_password AS "mustChangePassword",u.remark,to_char(u.created_at,'YYYY-MM-DD HH24:MI:SS') AS "createdAt",to_char(u.last_login_at,'YYYY-MM-DD HH24:MI:SS') AS "lastLoginAt",d.name AS "deptName",p.name AS "positionName",coalesce(array_agg(r.code ORDER BY r.name) FILTER (WHERE r.code IS NOT NULL),'{}') AS roles,coalesce(array_agg(DISTINCT r.name ORDER BY r.name) FILTER (WHERE r.name IS NOT NULL),'{}') AS "roleNames" FROM sys_user u LEFT JOIN sys_department d ON d.id=u.dept_id LEFT JOIN sys_position p ON p.id=u.position_id LEFT JOIN sys_user_role ur ON ur.user_id=u.id LEFT JOIN sys_role r ON r.id=ur.role_id ${conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : ''} GROUP BY u.id,d.name,p.name ORDER BY u.created_at DESC`,
    values,
  );
  return usePageResponseSuccess(
    String(q.page ?? 1),
    String(q.pageSize ?? 20),
    result.rows,
  );
});

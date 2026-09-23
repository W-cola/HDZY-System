import type { EventHandlerRequest, H3Event } from 'h3';

import { getHeader } from 'h3';

import { query } from './db';
import { verifyAccessToken } from './jwt-utils';
import { forbiddenResponse, unAuthorizedResponse } from './response';

export type AuthContext = {
  dataScopes: string[];
  deptId: null | string;
  id: string;
  realName: string;
  roles: string[];
  username: string;
};

export async function requireAuth(event: H3Event<EventHandlerRequest>) {
  const tokenUser = verifyAccessToken(event);
  if (!tokenUser) {
    unAuthorizedResponse(event);
    return null;
  }
  const result = await query<AuthContext>(
    `SELECT u.id,u.username,u.real_name AS "realName",u.dept_id AS "deptId",
      COALESCE(array_agg(DISTINCT r.code) FILTER (WHERE r.code IS NOT NULL),'{}') AS roles,
      COALESCE(array_agg(DISTINCT r.data_scope) FILTER (WHERE r.data_scope IS NOT NULL),'{}') AS "dataScopes"
     FROM sys_user u LEFT JOIN sys_user_role ur ON ur.user_id=u.id
     LEFT JOIN sys_role r ON r.id=ur.role_id AND r.status=1
     WHERE u.id=$1 AND u.status=1 AND u.locked=false GROUP BY u.id`,
    [tokenUser.id],
  );
  const user = result.rows[0];
  if (!user) {
    unAuthorizedResponse(event);
    return null;
  }
  return user;
}

export async function requirePermission(
  event: H3Event<EventHandlerRequest>,
  code: string,
) {
  const user = await requireAuth(event);
  if (!user) return null;
  if (isSuper(user)) return user;
  const result = await query(
    `SELECT 1 FROM sys_user_role ur
     JOIN sys_role r ON r.id=ur.role_id AND r.status=1
     JOIN sys_role_menu rm ON rm.role_id=ur.role_id
     JOIN sys_menu m ON m.id=rm.menu_id
     WHERE ur.user_id=$1 AND m.auth_code=$2 AND m.status=1`,
    [user.id, code],
  );
  if (!result.rows[0]) {
    forbiddenResponse(event);
    return null;
  }
  return user;
}

export async function requireRoles(
  event: H3Event<EventHandlerRequest>,
  allowed: string[],
) {
  const user = await requireAuth(event);
  if (!user) return null;
  if (!user.roles.some((role) => allowed.includes(role))) {
    forbiddenResponse(event);
    return null;
  }
  return user;
}

export function isSuper(user: AuthContext) {
  return user.roles.includes('super') || user.roles.includes('admin');
}

export function isFinance(user: AuthContext) {
  return isSuper(user) || user.roles.includes('finance');
}

/**
 * Returns a parameterized SQL predicate for owner-scoped business data.
 * department scope includes the user's department and all descendants.
 */
export function dataScopeCondition(
  user: AuthContext,
  ownerColumn: string,
  values: any[],
) {
  if (
    isSuper(user) ||
    user.dataScopes.includes('all') ||
    user.dataScopes.includes('allRead') ||
    user.dataScopes.includes('allReadOwnWrite')
  )
    return 'TRUE';
  if (
    user.dataScopes.includes('department') ||
    user.dataScopes.includes('selfAndSubordinates')
  ) {
    values.push(user.deptId);
    return `${ownerColumn} IN (SELECT id FROM sys_user WHERE dept_id IN (SELECT id FROM sys_department WHERE id=$${values.length} OR id IN (WITH RECURSIVE tree AS (SELECT id FROM sys_department WHERE pid=$${values.length} UNION ALL SELECT d.id FROM sys_department d JOIN tree t ON d.pid=t.id) SELECT id FROM tree)))`;
  }
  values.push(user.id);
  return `${ownerColumn}=$${values.length}`;
}

export async function canAccessCustomer(user: AuthContext, customerId: string) {
  // $1 保留给客户 ID，数据权限条件从 $2 开始生成；否则普通销售会把客户 ID
  // 错误地作为 owner_id 参与匹配，导致客户已有资料被接口过滤为空。
  const values: any[] = [customerId];
  const scope = dataScopeCondition(user, 'c.owner_id', values);
  const result = await query(
    `SELECT c.id FROM crm_customer c WHERE c.id=$1 AND c.deleted=false AND (${scope})`,
    values,
  );
  return Boolean(result.rows[0]);
}

export function bearerToken(event: H3Event<EventHandlerRequest>) {
  const value = getHeader(event, 'Authorization');
  return value?.startsWith('Bearer ') ? value.slice(7) : '';
}

import { query } from './db';
import { verifyPassword } from './password';

export interface AuthUser {
  id: number | string;
  realName: string;
  roles: string[];
  username: string;
  homePath?: string;
  mustChangePassword?: boolean;
}

export async function getAuthUser(
  username: string,
  password?: string,
): Promise<AuthUser | null> {
  const result = await query<any>(
    `SELECT u.id,u.username,u.password,u.real_name AS "realName",u.status,u.locked,u.locked_until AS "lockedUntil",u.must_change_password AS "mustChangePassword",coalesce(array_agg(r.code) FILTER (WHERE r.code IS NOT NULL),'{}') AS roles FROM sys_user u LEFT JOIN sys_user_role ur ON ur.user_id=u.id LEFT JOIN sys_role r ON r.id=ur.role_id WHERE u.username=$1 GROUP BY u.id`,
    [username],
  );
  const user = result.rows[0];
  const temporarilyLocked =
    user?.locked &&
    (!user.lockedUntil || new Date(user.lockedUntil) > new Date());
  if (!user || user.status !== 1 || temporarilyLocked) return null;
  if (password !== undefined && !verifyPassword(password, user.password))
    return null;
  await query(
    'UPDATE sys_user SET last_login_at=CASE WHEN $1 THEN now() ELSE last_login_at END WHERE id=$2',
    [password !== undefined, user.id],
  );
  return {
    id: user.id,
    realName: user.realName,
    roles: user.roles ?? [],
    username: user.username,
    homePath: getHomePath(user.roles ?? []),
    mustChangePassword: Boolean(user.mustChangePassword),
  };
}

function getHomePath(roles: string[]) {
  if (roles.includes('super')) return '/operations/contract/list';
  if (roles.includes('finance')) return '/operations/contract/list';
  if (roles.includes('sales') || roles.includes('sales-director'))
    return '/operations/customer/units';
  if (roles.includes('delivery') || roles.includes('project-manager'))
    return '/operations/contract/list';
  return '/operations/contract/list';
}

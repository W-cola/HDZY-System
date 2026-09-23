import { eventHandler } from 'h3';
import { query } from '~/utils/db';
import { requireAuth } from '~/utils/rbac';
import { useResponseSuccess } from '~/utils/response';

export default eventHandler(async (event) => {
  const user = await requireAuth(event);
  if (!user) return;
  const result = await query<{ authCode: string }>(
    `SELECT DISTINCT m.auth_code AS "authCode"
     FROM sys_user_role ur JOIN sys_role r ON r.id=ur.role_id AND r.status=1
     JOIN sys_role_menu rm ON rm.role_id=ur.role_id
     JOIN sys_menu m ON m.id=rm.menu_id
     WHERE ur.user_id=$1 AND m.status=1 AND m.auth_code <> ''`,
    [user.id],
  );
  return useResponseSuccess(
    user.roles.includes('super')
      ? result.rows.map((x) => x.authCode)
      : result.rows.map((x) => x.authCode),
  );
});

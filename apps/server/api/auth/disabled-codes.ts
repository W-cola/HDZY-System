import { eventHandler } from 'h3';
import { query } from '~/utils/db';
import { requireAuth } from '~/utils/rbac';
import { useResponseSuccess } from '~/utils/response';

export default eventHandler(async (event) => {
  const user = await requireAuth(event);
  if (!user || (!user.roles.includes('super') && !user.roles.includes('admin')))
    return useResponseSuccess([]);
  const result = await query<{ authCode: string }>(
    `SELECT DISTINCT m.auth_code AS "authCode"
     FROM sys_menu m
     WHERE m.status=0 AND m.auth_code <> ''`,
  );
  return useResponseSuccess(result.rows.map((x) => x.authCode));
});

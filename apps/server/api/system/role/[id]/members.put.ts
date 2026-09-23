import { eventHandler, getRouterParam, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { getDatabase } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id')!;
  const b = await readBody(event);
  const ids = Array.isArray(b?.userIds) ? b.userIds : [];
  const db: any = await getDatabase();
  const run = async (tx: any) => {
    const role = await tx.query(
      'SELECT id,code,name FROM sys_role WHERE id=$1 FOR UPDATE',
      [id],
    );
    if (!role.rows[0]) return null;
    if (role.rows[0].code === 'super')
      throw Object.assign(new Error('SUPER_MEMBERS_LOCKED'), {
        business: true,
      });
    await tx.query('DELETE FROM sys_user_role WHERE role_id=$1', [id]);
    for (const userId of ids)
      await tx.query(
        'INSERT INTO sys_user_role(user_id,role_id) VALUES($1,$2) ON CONFLICT DO NOTHING',
        [userId, id],
      );
    return role.rows[0];
  };
  try {
    const role =
      'transaction' in db
        ? await db.transaction(run)
        : await (async () => {
            const c = await db.connect();
            try {
              await c.query('BEGIN');
              const x = await run(c);
              await c.query('COMMIT');
              return x;
            } catch (error) {
              await c.query('ROLLBACK');
              throw error;
            } finally {
              c.release();
            }
          })();
    if (!role) return useResponseError('角色不存在');
    recordAudit(event, {
      module: '角色管理',
      action: '调整成员',
      target: role.name,
      detail: `更新角色成员，共 ${ids.length} 人`,
    });
    return useResponseSuccess(true);
  } catch (error: any) {
    if (error?.message === 'SUPER_MEMBERS_LOCKED')
      return useResponseError(
        '超级管理员成员由系统锁定，不允许通过角色管理调整',
      );
    throw error;
  }
});

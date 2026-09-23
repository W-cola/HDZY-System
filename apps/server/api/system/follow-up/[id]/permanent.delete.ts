import { eventHandler, getRouterParam } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
export default eventHandler(async (event) => {
  const user = verifyAccessToken(event);
  if (!user) return unAuthorizedResponse(event);
  if (!user.roles?.includes('super'))
    return useResponseError('只有超级管理员可以永久删除');
  const id = getRouterParam(event, 'id');
  const old = await query(
    'SELECT subject FROM crm_follow_up WHERE id=$1 AND deleted=true',
    [id],
  );
  if (!old.rows[0]) return useResponseError('回收站中不存在该记录');
  await query('DELETE FROM crm_follow_up WHERE id=$1 AND deleted=true', [id]);
  recordAudit(event, {
    module: '跟进记录',
    action: '永久删除跟进',
    target: old.rows[0].subject,
    detail: `永久删除跟进：${old.rows[0].subject}`,
  });
  return useResponseSuccess({ id });
});

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
  if (!user.roles?.some((role: string) => ['admin', 'super'].includes(role)))
    return useResponseError('只有系统管理员可以恢复回收站数据');
  const id = getRouterParam(event, 'id');
  const r = await query(
    'UPDATE crm_follow_up SET deleted=false,deleted_at=null,deleted_by=null,updated_at=now() WHERE id=$1 AND deleted=true RETURNING subject',
    [id],
  );
  if (!r.rows[0]) return useResponseError('回收站中不存在该记录');
  recordAudit(event, {
    module: '跟进记录',
    action: '恢复跟进',
    target: r.rows[0].subject,
    detail: `从回收站恢复跟进：${r.rows[0].subject}`,
  });
  return useResponseSuccess({ id });
});

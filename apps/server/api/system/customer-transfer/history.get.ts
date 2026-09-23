import { eventHandler, getQuery } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, usePageResponseSuccess } from '~/utils/response';
export default eventHandler(async (event) => {
  const user = verifyAccessToken(event);
  if (!user) return unAuthorizedResponse(event);
  if (!user.roles?.some((x: string) => ['admin', 'super'].includes(x)))
    return usePageResponseSuccess('1', '20', []);
  const r = await query(
    `SELECT t.id,t.from_owner_id AS "fromOwnerId",fo.real_name AS "fromOwnerName",t.to_owner_id AS "toOwnerId",too.real_name AS "toOwnerName",t.reason,t.remark,t.status,t.customer_count AS "customerCount",t.created_by AS "createdBy",cb.real_name AS "createdByName",to_char(t.created_at,'YYYY-MM-DD HH24:MI:SS') AS "createdAt",to_char(t.effective_at,'YYYY-MM-DD HH24:MI:SS') AS "effectiveAt",to_char(t.reversed_at,'YYYY-MM-DD HH24:MI:SS') AS "reversedAt",t.reverse_reason AS "reverseReason" FROM crm_customer_transfer t LEFT JOIN sys_user fo ON fo.id=t.from_owner_id JOIN sys_user too ON too.id=t.to_owner_id LEFT JOIN sys_user cb ON cb.id=t.created_by ORDER BY t.created_at DESC`,
  );
  return usePageResponseSuccess(
    String(getQuery(event).page ?? 1),
    String(getQuery(event).pageSize ?? 20),
    r.rows,
  );
});

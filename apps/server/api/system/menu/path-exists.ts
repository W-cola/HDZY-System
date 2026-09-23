import { eventHandler, getQuery } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, useResponseSuccess } from '~/utils/response';
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const { id, path } = getQuery(event);
  const r = await query(
    "SELECT 1 FROM sys_menu WHERE path=$1 AND id<>$2 AND type<>'button' LIMIT 1",
    [String(path ?? ''), String(id ?? '')],
  );
  return useResponseSuccess(Boolean(r.rows[0]));
});

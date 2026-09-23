import { eventHandler, getQuery } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, useResponseSuccess } from '~/utils/response';
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const { id, name } = getQuery(event);
  const r = await query(
    'SELECT 1 FROM sys_menu WHERE name=$1 AND id<>$2 LIMIT 1',
    [String(name ?? ''), String(id ?? '')],
  );
  return useResponseSuccess(Boolean(r.rows[0]));
});

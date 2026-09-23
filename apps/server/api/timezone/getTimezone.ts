import { eventHandler } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, useResponseSuccess } from '~/utils/response';
import { getTimezone } from '~/utils/timezone-utils';

export default eventHandler(async (event) => {
  const userinfo = verifyAccessToken(event);
  if (!userinfo) {
    return unAuthorizedResponse(event);
  }
  const result = await query<{ timezone: string }>(
    "SELECT setting_value->>'timezone' AS timezone FROM sys_setting WHERE setting_key='global'",
  );
  return useResponseSuccess(
    result.rows[0]?.timezone ?? getTimezone() ?? 'Asia/Shanghai',
  );
});

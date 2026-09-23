import { eventHandler } from 'h3';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, useResponseSuccess } from '~/utils/response';
export default eventHandler(async (event) => {
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  const result = await query(
    'SELECT id,pid,name,title,type,path,component,auth_code AS "authCode",icon,status,sort FROM sys_menu ORDER BY sort,name',
  );
  return useResponseSuccess(result.rows);
});

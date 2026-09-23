import { eventHandler } from 'h3';
import { getAuthUser } from '~/utils/auth-users';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse, useResponseSuccess } from '~/utils/response';

export default eventHandler(async (event) => {
  const tokenUser = verifyAccessToken(event);
  if (!tokenUser) return unAuthorizedResponse(event);
  const userinfo = await getAuthUser(tokenUser.username);
  if (!userinfo) return unAuthorizedResponse(event);
  return useResponseSuccess(userinfo);
});

import { defineEventHandler, setResponseStatus } from 'h3';
import { z } from 'zod';
import { recordLoginAudit } from '~/utils/audit';
import { getAuthUser } from '~/utils/auth-users';
import {
  clearRefreshTokenCookie,
  setRefreshTokenCookie,
} from '~/utils/cookie-utils';
import { query } from '~/utils/db';
import { generateAccessToken, generateRefreshToken } from '~/utils/jwt-utils';
import {
  checkLoginRate,
  clearLoginFailures,
  recordLoginFailure,
  unlockExpiredAccount,
} from '~/utils/login-protection';
import {
  forbiddenResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
import { parseBody } from '~/utils/validation';

export default defineEventHandler(async (event) => {
  const input = await parseBody(
    event,
    z.object({
      username: z.string().trim().min(1).max(100),
      password: z.string().min(1).max(256),
    }),
  );
  if (!input) return;
  const { password, username } = input;
  if (!password || !username) {
    setResponseStatus(event, 400);
    return useResponseError(
      'BadRequestException',
      'Username and password are required',
    );
  }

  if (!checkLoginRate(event, username)) {
    setResponseStatus(event, 429);
    return useResponseError('Too many login attempts', 'TOO_MANY_REQUESTS');
  }
  const findUser = await getAuthUser(username, password);

  if (!findUser) {
    const expired = await query<{ id: string }>(
      'SELECT id FROM sys_user WHERE username=$1 AND locked=true AND locked_until IS NOT NULL AND locked_until <= now()',
      [username],
    );
    if (expired.rows[0]) {
      await unlockExpiredAccount(expired.rows[0].id);
      const retryUser = await getAuthUser(username, password);
      if (retryUser) {
        clearLoginFailures(String(retryUser.id));
        const accessToken = generateAccessToken(retryUser);
        const refreshToken = generateRefreshToken(retryUser);
        setRefreshTokenCookie(event, refreshToken);
        return useResponseSuccess({ ...retryUser, accessToken });
      }
    }

    const candidate = await query<{ id: string }>(
      'SELECT id FROM sys_user WHERE username=$1',
      [username],
    );
    if (candidate.rows[0]) await recordLoginFailure(candidate.rows[0].id);
    clearRefreshTokenCookie(event);
    recordLoginAudit(event, {
      action: '登录失败',
      target: username,
      result: '失败',
      detail: '账号或密码错误，或账号已停用/锁定',
    });
    return forbiddenResponse(event, 'Username or password is incorrect.');
  }

  await clearLoginFailures(String(findUser.id));
  const accessToken = generateAccessToken(findUser);
  const refreshToken = generateRefreshToken(findUser);

  setRefreshTokenCookie(event, refreshToken);
  recordLoginAudit(event, {
    action: '登录',
    target: username,
    detail: '账号密码登录成功',
  });

  return useResponseSuccess({
    ...findUser,
    accessToken,
  });
});

import { eventHandler, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { hashPassword, verifyPassword } from '~/utils/password';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';

export default eventHandler(async (event) => {
  const authUser = verifyAccessToken(event);
  if (!authUser) return unAuthorizedResponse(event);
  const body = await readBody<{ newPassword?: string; oldPassword?: string }>(
    event,
  );
  const oldPassword = body?.oldPassword?.trim();
  const newPassword = body?.newPassword?.trim();
  if (!oldPassword || !newPassword)
    return useResponseError('请输入旧密码和新密码');
  if (newPassword.length < 8) return useResponseError('新密码长度不能少于8位');
  if (oldPassword === newPassword)
    return useResponseError('新密码不能与旧密码相同');

  const result = await query<any>(
    'SELECT password FROM sys_user WHERE id=$1 AND status=1 AND locked=false',
    [authUser.id],
  );
  const user = result.rows[0];
  if (!user || !verifyPassword(oldPassword, user.password))
    return useResponseError('旧密码不正确');
  await query(
    'UPDATE sys_user SET password=$1,must_change_password=false WHERE id=$2',
    [hashPassword(newPassword), authUser.id],
  );
  recordAudit(event, {
    module: '账号安全',
    action: '修改密码',
    target: authUser.realName ?? authUser.username,
    detail: '用户修改登录密码',
  });
  return useResponseSuccess({ mustChangePassword: false });
});

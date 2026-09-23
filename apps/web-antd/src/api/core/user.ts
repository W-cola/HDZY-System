import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/**
 * 获取用户信息
 */
export async function getUserInfoApi() {
  return requestClient.get<UserInfo & { mustChangePassword?: boolean }>(
    '/user/info',
  );
}

export async function changePasswordApi(data: {
  newPassword?: string;
  oldPassword?: string;
}) {
  return requestClient.put<{ mustChangePassword: boolean }>(
    '/user/password',
    data,
  );
}

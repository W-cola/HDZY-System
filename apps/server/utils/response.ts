import type { EventHandlerRequest, H3Event } from 'h3';

import { setResponseStatus } from 'h3';

export function useResponseSuccess<T = any>(data: T) {
  return { code: 0, data, error: null, message: 'ok' };
}

export function usePageResponseSuccess<T = any>(
  page: number | string,
  pageSize: number | string,
  list: T[],
  { message = 'ok', total = list.length, alreadyPaginated = false } = {},
) {
  const pageData = alreadyPaginated
    ? list
    : pagination(
        Number.parseInt(`${page}`),
        Number.parseInt(`${pageSize}`),
        list,
      );
  return { ...useResponseSuccess({ items: pageData, total }), message };
}

const messages: Record<string, string> = {
  BAD_REQUEST: '请求参数不合法',
  VALIDATION_ERROR: '请求参数不合法',
  UNAUTHORIZED: '请先登录',
  FORBIDDEN: '无权执行此操作',
  INTERNAL_SERVER_ERROR: '服务器暂时不可用',
  TOO_MANY_REQUESTS: '操作过于频繁，请稍后重试',
};
export function useResponseError(
  messageOrCode: string,
  errorCode?: null | string,
) {
  const code =
    errorCode || (messages[messageOrCode] ? messageOrCode : 'BUSINESS_ERROR');
  return {
    code: -1,
    data: null,
    error: code,
    message: messages[code] || messageOrCode,
  };
}
export function forbiddenResponse(
  event: H3Event<EventHandlerRequest>,
  _message?: string,
) {
  setResponseStatus(event, 403);
  return useResponseError('FORBIDDEN');
}
export function unAuthorizedResponse(event: H3Event<EventHandlerRequest>) {
  setResponseStatus(event, 401);
  return useResponseError('UNAUTHORIZED');
}
export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
export function pagination<T>(pageNo: number, pageSize: number, array: T[]) {
  const offset = (pageNo - 1) * Number(pageSize);
  return offset + Number(pageSize) >= array.length
    ? array.slice(offset)
    : array.slice(offset, offset + Number(pageSize));
}

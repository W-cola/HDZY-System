import type { NitroErrorHandler } from 'nitropack';

const errorHandler: NitroErrorHandler = function (error, event) {
  const statusCode =
    error.statusCode && error.statusCode >= 400 ? error.statusCode : 500;
  console.error('[api] request failure', {
    statusCode,
    code: error.statusMessage,
    stack: error.stack,
  });
  const code =
    statusCode === 400
      ? 'VALIDATION_ERROR'
      : statusCode === 401
        ? 'UNAUTHORIZED'
        : statusCode === 403
          ? 'FORBIDDEN'
          : 'INTERNAL_SERVER_ERROR';
  const message =
    statusCode === 400
      ? '请求参数不合法'
      : statusCode === 401
        ? '请先登录'
        : statusCode === 403
          ? '无权执行此操作'
          : '服务器暂时不可用';
  if (!event.node.res.headersSent) {
    event.node.res.statusCode = statusCode;
    event.node.res.setHeader('content-type', 'application/json; charset=utf-8');
  }
  event.node.res.end(
    JSON.stringify({ code: -1, data: null, error: code, message }),
  );
};
export default errorHandler;

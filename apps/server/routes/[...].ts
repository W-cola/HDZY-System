import fs from 'node:fs/promises';
import path from 'node:path';

import { defineEventHandler, getRequestURL, setResponseHeader } from 'h3';

const publicDir = path.resolve(process.cwd(), 'apps/server/.output/public');

export default defineEventHandler(async (event) => {
  const pathname = decodeURIComponent(getRequestURL(event).pathname);
  const requested = path.resolve(publicDir, `.${pathname}`);
  const isInsidePublic = requested === publicDir || requested.startsWith(`${publicDir}${path.sep}`);
  const requestedFile = isInsidePublic
    ? await fs
        .stat(requested)
        .then((stat) => (stat.isFile() ? requested : null))
        .catch(() => null)
    : null;

  // The production container exposes Nitro on the public port and copies the
  // Vite build into .output/public. Directories (especially "/") need the
  // SPA entry document, while client-side routes must also fall back to it.
  // Keep the development fallback when the frontend has not been built yet.
  const hasFileExtension = path.extname(pathname) !== '';
  const target =
    requestedFile ??
    (!hasFileExtension && isInsidePublic
      ? await fs
          .stat(path.join(publicDir, 'index.html'))
          .then((stat) => (stat.isFile() ? path.join(publicDir, 'index.html') : null))
          .catch(() => null)
      : null);

  if (!target) {
    setResponseHeader(event, 'content-type', 'text/html; charset=utf-8');
    return '<h1>API 服务正在运行</h1><p>开发前端请访问 5173 端口。</p>';
  }
  const extension = path.extname(target);
  const contentTypes: Record<string, string> = {
    '.css': 'text/css; charset=utf-8',
    '.html': 'text/html; charset=utf-8',
    '.ico': 'image/x-icon',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.webp': 'image/webp',
    '.woff2': 'font/woff2',
  };
  setResponseHeader(
    event,
    'content-type',
    contentTypes[extension] ?? 'application/octet-stream',
  );
  return fs.readFile(target);
});

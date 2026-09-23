import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { eventHandler, getRouterParam, setHeader, setResponseStatus } from 'h3';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { unAuthorizedResponse } from '~/utils/response';
import { uploadDir } from '~/utils/upload-paths';

export default eventHandler(async (event) => {
  const user = verifyAccessToken(event);
  if (!user) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id') || '';
  if (!/^contract-[a-zA-Z0-9-]+$/.test(id)) {
    setResponseStatus(event, 400);
    return 'Invalid file id';
  }
  const base = uploadDir('contracts');
  const files = await import('node:fs/promises').then(({ readdir }) =>
    readdir(base),
  );
  const filename = files.find((name) => name.startsWith(`${id}-`));
  if (!filename) {
    setResponseStatus(event, 404);
    return 'File not found';
  }
  const data = await readFile(path.join(base, filename));
  setHeader(event, 'Content-Type', 'application/pdf');
  setHeader(
    event,
    'Content-Disposition',
    `inline; filename="${filename.slice(id.length + 1)}"`,
  );
  return data;
});

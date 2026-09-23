import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

import { eventHandler, getRouterParam } from 'h3';
import { verifyAccessToken } from '~/utils/jwt-utils';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
import { uploadDir } from '~/utils/upload-paths';

export default eventHandler(async (event) => {
  const user = verifyAccessToken(event);
  if (!user) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id') || '';
  if (!/^contract-[a-zA-Z0-9-]+$/.test(id))
    return useResponseError('附件不存在');
  const folder = uploadDir('contracts');
  const files = await readdir(folder).catch(() => [] as string[]);
  const filename = files.find((name) => name.startsWith(`${id}-`));
  if (!filename) return useResponseError('附件不存在');
  await unlink(path.join(folder, filename));
  return useResponseSuccess(true);
});

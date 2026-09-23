import { readdir, unlink } from 'node:fs/promises';
import path from 'node:path';

import { eventHandler, getRouterParam } from 'h3';
import { requireRoles } from '~/utils/rbac';
import {
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
import { uploadDir } from '~/utils/upload-paths';

export default eventHandler(async (event) => {
  const actor = await requireRoles(event, ['super', 'admin', 'hr']);
  if (!actor) return;
  const id = getRouterParam(event, 'id') || '';
  if (!/^employee-(contract|idCardFile|bankCardFile)-[a-zA-Z0-9-]+$/.test(id))
    return useResponseError('附件不存在');
  const folder = id.startsWith('employee-contract-')
    ? uploadDir('employeeContracts')
    : uploadDir('employeeDocuments');
  const files = await readdir(folder).catch(() => [] as string[]);
  const filename = files.find((name) => name.startsWith(`${id}-`));
  if (!filename) return useResponseError('附件不存在');
  await unlink(path.join(folder, filename));
  return useResponseSuccess(true);
});

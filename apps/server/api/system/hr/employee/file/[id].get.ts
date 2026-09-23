import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

import { eventHandler, getRouterParam, setHeader, setResponseStatus } from 'h3';
import { requireRoles } from '~/utils/rbac';
import { uploadDir } from '~/utils/upload-paths';

export default eventHandler(async (event) => {
  const actor = await requireRoles(event, ['super', 'admin', 'hr']);
  if (!actor) return;
  const id = getRouterParam(event, 'id') || '';
  if (
    !/^(employee-contract|employee-idCardFile|employee-bankCardFile|contract)-[a-zA-Z0-9-]+$/.test(
      id,
    )
  ) {
    setResponseStatus(event, 400);
    return 'Invalid file id';
  }
  const isEmployeeDocument =
    id.startsWith('employee-idCard') || id.startsWith('employee-bankCard');
  const folder = id.startsWith('employee-contract-')
    ? uploadDir('employeeContracts')
    : isEmployeeDocument
      ? uploadDir('employeeDocuments')
      : uploadDir('contracts');
  const files = await readdir(folder).catch(() => [] as string[]);
  const filename = files.find((name) => name.startsWith(`${id}-`));
  if (!filename) {
    setResponseStatus(event, 404);
    return 'File not found';
  }
  const extension = filename.split('.').pop()?.toLowerCase();
  const contentType =
    extension === 'png'
      ? 'image/png'
      : extension === 'webp'
        ? 'image/webp'
        : extension === 'jpg' || extension === 'jpeg'
          ? 'image/jpeg'
          : 'application/pdf';
  setHeader(event, 'Content-Type', contentType);
  setHeader(
    event,
    'Content-Disposition',
    `inline; filename="${filename.slice(id.length + 1)}"`,
  );
  return readFile(path.join(folder, filename));
});

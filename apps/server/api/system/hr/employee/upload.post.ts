import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { eventHandler, readMultipartFormData, setResponseStatus } from 'h3';
import { requirePermission } from '~/utils/rbac';
import {
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
import { uploadDir } from '~/utils/upload-paths';

const MAX_SIZE = 20 * 1024 * 1024;
const IMAGE_MAX_SIZE = 10 * 1024 * 1024;

export default eventHandler(async (event) => {
  const actor = await requirePermission(event, 'hr:employee:upload');
  if (!actor) return;
  try {
    const parts = await readMultipartFormData(event);
    const file = parts?.find(
      (part) => part.name === 'file' && part.filename && part.data?.length,
    );
    const category = String(
      parts?.find((part) => part.name === 'category')?.data?.toString() ||
        'laborContract',
    );
    if (!file?.data || !file.filename) return useResponseError('请选择附件');
    const name = file.filename;
    const isImage = ['bankCardFile', 'idCardFile'].includes(category);
    const allowedImage = ['image/jpeg', 'image/png', 'image/webp'];
    if (
      isImage &&
      (!allowedImage.includes((file.type || '').toLowerCase()) ||
        file.data.length > IMAGE_MAX_SIZE)
    )
      return useResponseError('仅支持 10MB 以内的 JPG、PNG 或 WEBP 图片');
    if (
      !isImage &&
      (file.type || '').toLowerCase() !== 'application/pdf' &&
      !name.toLowerCase().endsWith('.pdf')
    )
      return useResponseError('仅支持上传 PDF 文件');
    if (!isImage && file.data.length > MAX_SIZE)
      return useResponseError('PDF 文件不能超过 20MB');

    const prefix = isImage ? `employee-${category}` : 'employee-contract';
    const id = `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const safeName =
      name.replaceAll(/[^a-zA-Z0-9._-]/g, '_') || 'employee-contract.pdf';
    const folder = uploadDir(
      isImage ? 'employeeDocuments' : 'employeeContracts',
    );
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, `${id}-${safeName}`), file.data);
    return useResponseSuccess({
      id,
      category,
      name,
      size: file.data.length,
      url: `/api/system/hr/employee/file/${id}`,
    });
  } catch (error: any) {
    setResponseStatus(event, 400);
    return useResponseError(`附件上传失败：${error?.message || '请稍后重试'}`);
  }
});

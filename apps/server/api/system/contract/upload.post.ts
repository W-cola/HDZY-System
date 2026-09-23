import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { eventHandler, readMultipartFormData, setResponseStatus } from 'h3';
import { verifyAccessToken } from '~/utils/jwt-utils';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
import { uploadDir } from '~/utils/upload-paths';

const MAX_SIZE = 20 * 1024 * 1024;
export default eventHandler(async (event) => {
  const user = verifyAccessToken(event);
  if (!user) return unAuthorizedResponse(event);
  try {
    const parts = await readMultipartFormData(event);
    const file = parts?.find(
      (part) => part.name === 'file' && part.filename && part.data?.length,
    );
    if (!file?.data || !file.filename)
      return useResponseError('请选择合同 PDF 文件');
    const name = file.filename;
    if (
      (file.type || '').toLowerCase() !== 'application/pdf' &&
      !name.toLowerCase().endsWith('.pdf')
    )
      return useResponseError('仅支持上传 PDF 文件');
    if (file.data.length > MAX_SIZE)
      return useResponseError('PDF 文件不能超过 20MB');
    const id = `contract-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const safeName = name.replaceAll(/[^a-zA-Z0-9._-]/g, '_') || 'contract.pdf';
    const folder = uploadDir('contracts');
    await mkdir(folder, { recursive: true });
    await writeFile(path.join(folder, `${id}-${safeName}`), file.data);
    return useResponseSuccess({
      id,
      name,
      size: file.data.length,
      url: `/api/system/contract/file/${id}`,
    });
  } catch (error: any) {
    setResponseStatus(event, 400);
    return useResponseError(`附件上传失败：${error?.message || '请稍后重试'}`);
  }
});

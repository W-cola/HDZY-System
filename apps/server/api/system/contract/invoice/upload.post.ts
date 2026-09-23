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
  if (!verifyAccessToken(event)) return unAuthorizedResponse(event);
  try {
    const parts = await readMultipartFormData(event);
    const file = parts?.find(
      (p) => p.name === 'file' && p.filename && p.data?.length,
    );
    if (!file?.data || !file.filename)
      return useResponseError('请选择电子发票文件');
    const name = file.filename;
    if (!/\.(pdf|ofd|xml|zip|rar|7z)$/i.test(name))
      return useResponseError('仅支持 PDF、OFD、XML 或压缩包');
    if (file.data.length > MAX_SIZE)
      return useResponseError('电子发票文件不能超过 20MB');
    const id = `invoice-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const folder = uploadDir('invoices');
    await mkdir(folder, { recursive: true });
    const safeName = name.replaceAll(/[^a-zA-Z0-9._-]/g, '_');
    await writeFile(path.join(folder, `${id}-${safeName}`), file.data);
    return useResponseSuccess({ id, name, size: file.data.length });
  } catch (error: any) {
    setResponseStatus(event, 400);
    return useResponseError(
      `电子发票上传失败：${error?.message || '请稍后重试'}`,
    );
  }
});

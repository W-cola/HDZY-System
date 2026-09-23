import { requestClient } from '#/api/request';
export function getRecycleBinListApi(params?: Record<string, any>) {
  return requestClient.get('/system/recycle-bin/list', { params });
}
export function restoreRecycleBinApi(id: string) {
  return requestClient.put(`/system/recycle-bin/${id}/restore`);
}
export function permanentlyDeleteRecycleBinApi(id: string) {
  return requestClient.delete(`/system/recycle-bin/${id}/permanent`);
}

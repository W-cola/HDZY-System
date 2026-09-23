import { requestClient } from '#/api/request';
export function getContractListApi(params?: Record<string, any>) {
  return requestClient.get('/system/contract/list', { params });
}
export function createContractApi(data: Record<string, any>) {
  return requestClient.post('/system/contract', data);
}
export function updateContractApi(id: string, data: Record<string, any>) {
  return requestClient.put(`/system/contract/${id}`, data);
}
export function deleteContractApi(id: string) {
  return requestClient.delete(`/system/contract/${id}`);
}
export function uploadContractFileApi(file: File) {
  return requestClient.upload('/system/contract/upload', { file });
}
export function deleteContractFileApi(id: string) {
  return requestClient.delete(`/system/contract/file/${id}`);
}
export function downloadContractFileApi(id: string) {
  return requestClient.download<Blob>(`/system/contract/file/${id}`);
}

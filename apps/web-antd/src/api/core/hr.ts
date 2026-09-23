import { requestClient } from '#/api/request';

export function uploadEmployeeFileApi(file: File, category: string) {
  return requestClient.upload('/system/hr/employee/upload', { file, category });
}
export function uploadEmployeeContractFileApi(file: File) {
  return uploadEmployeeFileApi(file, 'laborContract');
}
export function downloadEmployeeContractFileApi(id: string) {
  return requestClient.download<Blob>(`/system/hr/employee/file/${id}`);
}
export function deleteEmployeeContractFileApi(id: string) {
  return requestClient.delete(`/system/hr/employee/file/${id}`);
}
export function getEmployeeListApi(params?: Record<string, any>) {
  return requestClient.get('/system/hr/employee/list', { params });
}
export function saveEmployeeApi(data: Record<string, any>) {
  return requestClient.post('/system/hr/employee', data);
}
export function deleteEmployeeApi(id: string) {
  return requestClient.delete(`/system/hr/employee/${id}`);
}

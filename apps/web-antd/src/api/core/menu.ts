import { requestClient } from '#/api/request';
export function getSystemMenuListApi() {
  return requestClient.get('/system/menu/list');
}
export function createSystemMenuApi(data: Record<string, any>) {
  return requestClient.post('/system/menu', data);
}
export function updateSystemMenuApi(id: string, data: Record<string, any>) {
  return requestClient.put(`/system/menu/${id}`, data);
}
export function deleteSystemMenuApi(id: string) {
  return requestClient.delete(`/system/menu/${id}`);
}

export function getAllMenusApi() {
  return requestClient.get('/menu/all');
}

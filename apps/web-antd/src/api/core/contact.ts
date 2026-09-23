import { requestClient } from '#/api/request';
export function getContactListApi(params?: Record<string, any>) {
  return requestClient.get('/system/contact/list', { params });
}
export function createContactApi(data: Record<string, any>) {
  return requestClient.post('/system/contact', data);
}
export function updateContactApi(id: string, data: Record<string, any>) {
  return requestClient.put(`/system/contact/${id}`, data);
}
export function deleteContactApi(id: string, reason = '业务人员移入回收站') {
  return requestClient.delete(`/system/contact/${id}`, { data: { reason } });
}
export function setPrimaryContactApi(id: string) {
  return requestClient.put(`/system/contact/${id}/primary`);
}

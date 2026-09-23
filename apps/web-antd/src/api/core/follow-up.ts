import { requestClient } from '#/api/request';
export function getFollowUpListApi(params?: Record<string, any>) {
  return requestClient.get('/system/follow-up/list', { params });
}
export function getFollowUpRecycleApi(params?: Record<string, any>) {
  return requestClient.get('/system/follow-up/recycle', { params });
}
export function createFollowUpApi(data: Record<string, any>) {
  return requestClient.post('/system/follow-up', data);
}
export function updateFollowUpApi(id: string, data: Record<string, any>) {
  return requestClient.put(`/system/follow-up/${id}`, data);
}
export function deleteFollowUpApi(id: string, reason = '业务人员移入回收站') {
  return requestClient.delete(`/system/follow-up/${id}`, { data: { reason } });
}
export function restoreFollowUpApi(id: string) {
  return requestClient.put(`/system/follow-up/${id}/restore`);
}
export function permanentlyDeleteFollowUpApi(id: string) {
  return requestClient.delete(`/system/follow-up/${id}/permanent`);
}

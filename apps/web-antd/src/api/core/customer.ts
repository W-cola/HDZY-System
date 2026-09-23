import { requestClient } from '#/api/request';

export function getCustomerListApi(params?: Record<string, any>) {
  return requestClient.get('/system/customer/list', { params });
}
export function createCustomerApi(data: Record<string, any>) {
  return requestClient.post('/system/customer', data);
}
export function updateCustomerApi(id: string, data: Record<string, any>) {
  return requestClient.put(`/system/customer/${id}`, data);
}
export function deleteCustomerApi(id: string, reason = '业务人员移入回收站') {
  return requestClient.delete(`/system/customer/${id}`, { data: { reason } });
}
export function importCustomersApi(data: { customers: Record<string, any>[] }) {
  return requestClient.post('/system/customer/import', data);
}

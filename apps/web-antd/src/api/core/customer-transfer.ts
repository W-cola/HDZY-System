import { requestClient } from '#/api/request';
export function getTransferCustomersApi(params?: Record<string, any>) {
  return requestClient.get('/system/customer-transfer/list', { params });
}
export function getTransferUsersApi() {
  return requestClient.get('/system/customer-transfer/users');
}
export function createCustomerTransferApi(data: Record<string, any>) {
  return requestClient.post('/system/customer-transfer', data);
}
export function getCustomerTransferHistoryApi(params?: Record<string, any>) {
  return requestClient.get('/system/customer-transfer/history', { params });
}
export function reverseCustomerTransferApi(id: string, reason: string) {
  return requestClient.put(`/system/customer-transfer/${id}/reverse`, {
    reason,
  });
}

import { requestClient } from '#/api/request';
export function getContractPaymentListApi(params?: Record<string, any>) {
  return requestClient.get('/system/contract/payment/list', { params });
}
export function saveContractPaymentApi(data: Record<string, any>) {
  return requestClient.post('/system/contract/payment', data);
}
export function deleteContractPaymentApi(id: string) {
  return requestClient.delete(`/system/contract/payment/${id}`);
}

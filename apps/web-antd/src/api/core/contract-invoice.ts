import { requestClient } from '#/api/request';
export function getContractInvoiceListApi(params?: Record<string, any>) {
  return requestClient.get('/system/contract/invoice/list', { params });
}
export function createContractInvoiceApi(data: Record<string, any>) {
  return requestClient.post('/system/contract/invoice', data);
}
export function updateContractInvoiceApi(
  id: string,
  data: Record<string, any>,
) {
  return requestClient.put(`/system/contract/invoice/${id}`, data);
}
export function deleteContractInvoiceApi(id: string) {
  return requestClient.delete(`/system/contract/invoice/${id}`);
}
export function uploadContractInvoiceFileApi(file: File) {
  return requestClient.upload('/system/contract/invoice/upload', { file });
}

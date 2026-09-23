import { requestClient } from '#/api/request';

export function getCustomerInvoiceProfilesApi(params?: Record<string, any>) {
  return requestClient.get('/system/customer/invoice-profile', { params });
}

export function createCustomerInvoiceProfileApi(data: Record<string, any>) {
  return requestClient.post('/system/customer/invoice-profile', data);
}

import { requestClient } from '#/api/request';
export const OPPORTUNITY_STAGES = [
  '初步接触',
  '需求确认',
  '方案报价',
  '商务谈判',
  '决策中',
  '赢单',
  '丢单',
];
export function getOpportunityListApi(params?: Record<string, any>) {
  return requestClient.get('/system/opportunity/list', { params });
}
export function createOpportunityApi(data: Record<string, any>) {
  return requestClient.post('/system/opportunity', data);
}
export function updateOpportunityApi(id: string, data: Record<string, any>) {
  return requestClient.put(`/system/opportunity/${id}`, data);
}
export function deleteOpportunityApi(id: string, reason?: string) {
  return requestClient.delete(`/system/opportunity/${id}`, {
    data: { reason },
  });
}
export function getOpportunityDetailApi(id: string) {
  return requestClient.get(`/system/opportunity/${id}/detail`);
}

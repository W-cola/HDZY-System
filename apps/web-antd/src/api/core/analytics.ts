import { requestClient } from '#/api/request';

export function getSalesAnalyticsApi() {
  return requestClient.get('/analytics/sales');
}

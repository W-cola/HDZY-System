import { requestClient } from '#/api/request';

export function getTimezoneOptionsApi() {
  return requestClient.get<Array<{ label: string; value: string }>>(
    '/timezone/getTimezoneOptions',
  );
}
export function getTimezoneApi() {
  return requestClient.get<null | string>('/timezone/getTimezone');
}
export function setTimezoneApi(timezone: string) {
  return requestClient.post('/timezone/setTimezone', { timezone });
}

import { requestClient } from '#/api/request';

export interface SystemUser {
  id: string;
  username: string;
  realName: string;
  deptId: string;
  deptName: string;
  positionName: string;
  status: number;
  roles: string[];
  roleNames: string[];
  phone: string;
  email: string;
  lastLoginAt?: string;
}
export function getOrganizationApi() {
  return requestClient.get('/system/organization');
}
export async function getDepartmentTreeApi() {
  const result = await getOrganizationApi();
  return result.departments ?? [];
}
export function getSystemUsersApi(params?: Record<string, any>) {
  return requestClient.get('/system/user/list', { params });
}
export function getSalesUserOptionsApi() {
  return getSystemUsersApi({
    page: 1,
    pageSize: 200,
    status: 1,
    locked: false,
    roleCode: 'sales',
  });
}
export function createSystemUserApi(data: Record<string, any>) {
  return requestClient.post('/system/user', data);
}
export function updateSystemUserApi(id: string, data: Record<string, any>) {
  return requestClient.put(`/system/user/${id}`, data);
}
export function deleteSystemUserApi(id: string) {
  return requestClient.delete(`/system/user/${id}`);
}
export function resetSystemUserPasswordApi(id: string) {
  return requestClient.post(`/system/user/${id}/reset-password`);
}
export function getSystemRolesApi(params?: Record<string, any>) {
  return requestClient.get('/system/role/list', { params });
}
export function getAuditLogsApi(params?: Record<string, any>) {
  return requestClient.get('/system/audit-logs', { params });
}
export function getSystemSettingsApi() {
  return requestClient.get('/system/settings');
}
export function updateSystemSettingsApi(data: Record<string, any>) {
  return requestClient.put('/system/settings', data);
}

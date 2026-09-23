import { requestClient } from '#/api/request';

export function getRoleListApi(params?: Record<string, any>) {
  return requestClient.get('/system/role/list', { params });
}
export function createRoleApi(data: Record<string, any>) {
  return requestClient.post('/system/role', data);
}
export function updateRoleApi(id: string, data: Record<string, any>) {
  return requestClient.put(`/system/role/${id}`, data);
}
export function deleteRoleApi(id: string) {
  return requestClient.delete(`/system/role/${id}`);
}
export function updateRolePermissionsApi(id: string, permissions: string[]) {
  return requestClient.put(`/system/role/${id}/permissions`, { permissions });
}
export function getRoleMembersApi(id: string) {
  return requestClient.get(`/system/role/${id}/members`);
}
export function updateRoleMembersApi(id: string, userIds: string[]) {
  return requestClient.put(`/system/role/${id}/members`, { userIds });
}

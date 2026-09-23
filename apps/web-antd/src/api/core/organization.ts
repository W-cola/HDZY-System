import { requestClient } from '#/api/request';
export function getDepartmentListApi() {
  return requestClient.get('/system/dept/list');
}
export function createDepartmentApi(data: Record<string, any>) {
  return requestClient.post('/system/dept', data);
}
export function updateDepartmentApi(id: string, data: Record<string, any>) {
  return requestClient.put(`/system/dept/${id}`, data);
}
export function deleteDepartmentApi(id: string) {
  return requestClient.delete(`/system/dept/${id}`);
}
export function getPositionListApi(params?: Record<string, any>) {
  return requestClient.get('/system/position/list', { params });
}
export function createPositionApi(data: Record<string, any>) {
  return requestClient.post('/system/position', data);
}
export function updatePositionApi(id: string, data: Record<string, any>) {
  return requestClient.put(`/system/position/${id}`, data);
}
export function deletePositionApi(id: string) {
  return requestClient.delete(`/system/position/${id}`);
}

export async function getDepartmentTreeListApi() {
  const list = await getDepartmentListApi();
  const nodes = new Map(
    list.map((item: any) => [item.id, { ...item, children: [] }]),
  );
  const roots: any[] = [];
  nodes.forEach((node: any) => {
    if (node.pid && nodes.has(node.pid))
      (nodes.get(node.pid) as any).children.push(node);
    else roots.push(node);
  });
  return roots;
}

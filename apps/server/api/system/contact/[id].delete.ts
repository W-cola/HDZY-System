import { eventHandler, getRouterParam, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { requirePermission } from '~/utils/rbac';
import { useResponseError, useResponseSuccess } from '~/utils/response';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'contact:delete');
  if (!user) return;
  const id = getRouterParam(event, 'id');
  const body = await readBody<{ reason?: string }>(event);
  const old = await query<{ name: string }>(
    'SELECT name FROM crm_contact WHERE id=$1 AND deleted=false',
    [id],
  );
  if (!old.rows[0]) return useResponseError('联系人不存在或已在回收站');
  if (!user.roles.includes('super') && !user.roles.includes('admin')) {
    const owner = await query(
      'SELECT cu.owner_id FROM crm_contact c JOIN crm_customer cu ON cu.id=c.customer_id WHERE c.id=$1',
      [id],
    );
    if (owner.rows[0]?.owner_id !== user.id)
      return useResponseError('无权操作其他销售负责的客户');
  }
  await query(
    'UPDATE crm_contact SET deleted=true,deleted_at=now(),deleted_by=$1,delete_reason=$2,is_primary=false,updated_at=now() WHERE id=$3',
    [user.id, body?.reason?.trim() ?? '', id],
  );
  recordAudit(event, {
    module: '联系人',
    action: '删除联系人',
    target: old.rows[0].name,
    detail: `删除联系人：${old.rows[0].name}`,
  });
  return useResponseSuccess({ id });
});

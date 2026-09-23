import { eventHandler, getRouterParam } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';

export default eventHandler(async (event) => {
  const user = verifyAccessToken(event);
  if (!user) return unAuthorizedResponse(event);
  if (!user.roles?.some((role: string) => ['admin', 'super'].includes(role)))
    return useResponseError('只有系统管理员可以恢复回收站数据');
  const id = getRouterParam(event, 'id');
  if (id?.startsWith('opp')) {
    const r = await query(
      'UPDATE crm_opportunity SET deleted=false,deleted_at=null,deleted_by=null,updated_at=now() WHERE id=$1 AND deleted=true RETURNING name,customer_id',
      [id],
    );
    if (!r.rows[0]) return useResponseError('回收站中不存在该记录');
    const customer = await query(
      'SELECT id,status,deleted FROM crm_customer WHERE id=$1',
      [r.rows[0].customer_id],
    );
    if (
      !customer.rows[0] ||
      customer.rows[0].deleted ||
      Number(customer.rows[0].status) !== 1
    ) {
      await query(
        'UPDATE crm_opportunity SET deleted=true,deleted_at=now() WHERE id=$1',
        [id],
      );
      return useResponseError(
        '所属客户不存在、已删除或已停用，不能恢复销售机会',
      );
    }
    recordAudit(event, {
      module: '销售机会',
      action: '恢复机会',
      target: r.rows[0].name,
      detail: `从回收站恢复销售机会：${r.rows[0].name}`,
    });
  } else if (id?.startsWith('fu')) {
    const owner = await query(
      'SELECT customer_id,contact_id FROM crm_follow_up WHERE id=$1 AND deleted=true',
      [id],
    );
    if (!owner.rows[0]) return useResponseError('回收站中不存在该记录');
    const customer = await query(
      'SELECT id,status FROM crm_customer WHERE id=$1 AND deleted=false',
      [owner.rows[0].customer_id],
    );
    if (!customer.rows[0] || Number(customer.rows[0].status) !== 1)
      return useResponseError(
        '所属客户不存在、已删除或已停用，不能恢复跟进记录',
      );
    if (owner.rows[0].contact_id) {
      const contact = await query(
        'SELECT id FROM crm_contact WHERE id=$1 AND deleted=false',
        [owner.rows[0].contact_id],
      );
      if (!contact.rows[0])
        return useResponseError('关联联系人不存在或已删除，不能恢复跟进记录');
    }
    const r = await query(
      'UPDATE crm_follow_up SET deleted=false,deleted_at=null,deleted_by=null,updated_at=now() WHERE id=$1 AND deleted=true RETURNING subject AS name',
      [id],
    );
    if (!r.rows[0]) return useResponseError('回收站中不存在该记录');
    recordAudit(event, {
      module: '跟进记录',
      action: '恢复跟进',
      target: r.rows[0].name,
      detail: `从回收站恢复跟进：${r.rows[0].name}`,
    });
  } else if (id?.startsWith('ct')) {
    const owner = await query(
      'SELECT customer_id FROM crm_contact WHERE id=$1 AND deleted=true',
      [id],
    );
    if (!owner.rows[0]) return useResponseError('回收站中不存在该记录');
    const customer = await query(
      'SELECT id,status FROM crm_customer WHERE id=$1 AND deleted=false',
      [owner.rows[0].customer_id],
    );
    if (!customer.rows[0] || Number(customer.rows[0].status) !== 1)
      return useResponseError('所属客户不存在、已删除或已停用，不能恢复联系人');
    const r = await query(
      'UPDATE crm_contact SET deleted=false,deleted_at=null,deleted_by=null,updated_at=now() WHERE id=$1 AND deleted=true RETURNING name',
      [id],
    );
    if (!r.rows[0]) return useResponseError('回收站中不存在该记录');
    recordAudit(event, {
      module: '联系人',
      action: '恢复联系人',
      target: r.rows[0].name,
      detail: `从回收站恢复联系人：${r.rows[0].name}`,
    });
  } else if (id?.startsWith('c')) {
    const r = await query(
      'UPDATE crm_customer SET deleted=false,deleted_at=null,deleted_by=null,updated_at=now() WHERE id=$1 AND deleted=true RETURNING name',
      [id],
    );
    if (!r.rows[0]) return useResponseError('回收站中不存在该记录');
    recordAudit(event, {
      module: '客户单位',
      action: '恢复客户',
      target: r.rows[0].name,
      detail: `从回收站恢复客户：${r.rows[0].name}`,
    });
  } else return useResponseError('无效的回收站记录');
  return useResponseSuccess({ id });
});

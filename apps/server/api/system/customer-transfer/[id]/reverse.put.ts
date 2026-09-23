import { eventHandler, getRouterParam, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { getDatabase } from '~/utils/db';
import { requirePermission } from '~/utils/rbac';
import { useResponseError, useResponseSuccess } from '~/utils/response';
export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'customer:transfer:reverse');
  if (!user) return;
  const b = await readBody(event);
  if (!b?.reason?.trim()) return useResponseError('请填写撤销原因');
  const id = getRouterParam(event, 'id');
  const db: any = await getDatabase();
  const run = async (tx: any) => {
    const t = await tx.query(
      "SELECT * FROM crm_customer_transfer WHERE id=$1 AND status='已生效' FOR UPDATE",
      [id],
    );
    if (!t.rows[0])
      throw Object.assign(new Error('TRANSFER_INVALID'), { business: true });
    const d = await tx.query(
      'SELECT customer_id,old_owner_id,new_owner_id FROM crm_customer_transfer_detail WHERE transfer_id=$1',
      [id],
    );
    for (const x of d.rows) {
      const c = await tx.query(
        'SELECT owner_id FROM crm_customer WHERE id=$1 AND deleted=false FOR UPDATE',
        [x.customer_id],
      );
      if (!c.rows[0] || c.rows[0].owner_id !== x.new_owner_id)
        throw Object.assign(new Error('CONFLICT'), { business: true });
      await tx.query(
        'UPDATE crm_customer SET owner_id=$1,updated_at=now() WHERE id=$2',
        [x.old_owner_id, x.customer_id],
      );
      await tx.query(
        "UPDATE crm_opportunity SET owner_id=$1,updated_at=now() WHERE customer_id=$2 AND deleted=false AND status='进行中' AND owner_id=$3",
        [x.old_owner_id, x.customer_id, x.new_owner_id],
      );
    }
    await tx.query(
      "UPDATE crm_customer_transfer SET status='已撤销',reversed_at=now(),reversed_by=$1,reverse_reason=$2 WHERE id=$3",
      [user.id, b.reason.trim(), id],
    );
    return d.rows.length;
  };
  try {
    const count =
      'transaction' in db ? await db.transaction(run) : await run(db);
    recordAudit(event, {
      module: '客户移交',
      action: '撤销客户移交',
      target: id,
      detail: `撤销${count}家客户的移交：${b.reason}`,
    });
    return useResponseSuccess({ id, count });
  } catch (error: any) {
    if (error?.message === 'TRANSFER_INVALID')
      return useResponseError('移交记录不存在或已撤销');
    if (error?.message === 'CONFLICT')
      return useResponseError('客户负责人已发生变化，不能直接撤销，请人工处理');
    throw error;
  }
});

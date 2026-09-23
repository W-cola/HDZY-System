import { eventHandler, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { getDatabase, query } from '~/utils/db';
import { requirePermission } from '~/utils/rbac';
import { useResponseError, useResponseSuccess } from '~/utils/response';

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'customer:transfer:create');
  if (!user) return;
  const b = await readBody(event);
  const ids = [
    ...new Set(
      Array.isArray(b?.customerIds)
        ? b.customerIds.map(String).filter(Boolean)
        : [],
    ),
  ];
  if (ids.length === 0) return useResponseError('请选择待移交客户');
  if (!b?.toOwnerId) return useResponseError('请选择接收负责人');
  if (!b?.reason?.trim()) return useResponseError('请填写移交原因');
  if (b.toOwnerId === b.fromOwnerId)
    return useResponseError('接收负责人不能与原负责人相同');
  const receiver = await query(
    'SELECT id,real_name AS "realName" FROM sys_user WHERE id=$1 AND status=1 AND locked=false',
    [b.toOwnerId],
  );
  if (!receiver.rows[0]) return useResponseError('接收负责人不存在或已停用');
  const db: any = await getDatabase();
  const run = async (tx: any) => {
    const mark = ids.map((_, i) => `$${i + 1}`).join(',');
    const current = await tx.query(
      `SELECT id,name,owner_id FROM crm_customer WHERE id IN (${mark}) AND deleted=false AND status=1 FOR UPDATE`,
      ids,
    );
    if (current.rows.length !== ids.length)
      throw Object.assign(new Error('CUSTOMER_INVALID'), { business: true });
    const transferId = `tr${Date.now()}${Math.random().toString(36).slice(2, 7)}`;
    await tx.query(
      'INSERT INTO crm_customer_transfer(id,from_owner_id,to_owner_id,reason,remark,customer_count,created_by) VALUES($1,$2,$3,$4,$5,$6,$7)',
      [
        transferId,
        b.fromOwnerId || null,
        b.toOwnerId,
        b.reason.trim(),
        b.remark?.trim() || '',
        current.rows.length,
        user.id,
      ],
    );
    for (const c of current.rows) {
      await tx.query(
        'INSERT INTO crm_customer_transfer_detail(id,transfer_id,customer_id,old_owner_id,new_owner_id) VALUES($1,$2,$3,$4,$5)',
        [
          `trd${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
          transferId,
          c.id,
          c.owner_id,
          b.toOwnerId,
        ],
      );
      await tx.query(
        'UPDATE crm_customer SET owner_id=$1,updated_at=now() WHERE id=$2',
        [b.toOwnerId, c.id],
      );
      await tx.query(
        "UPDATE crm_opportunity SET owner_id=$1,updated_at=now() WHERE customer_id=$2 AND deleted=false AND status='进行中'",
        [b.toOwnerId, c.id],
      );
    }
    return {
      transferId,
      count: current.rows.length,
      names: current.rows.map((x: any) => x.name),
    };
  };
  try {
    const result =
      'transaction' in db ? await db.transaction(run) : await run(db);
    recordAudit(event, {
      module: '客户移交',
      action: '执行客户移交',
      target: result.names.join('、'),
      detail: `将${result.count}家客户移交给${receiver.rows[0].realName}，原因：${b.reason}`,
    });
    return useResponseSuccess(result);
  } catch (error: any) {
    if (error?.message === 'CUSTOMER_INVALID')
      return useResponseError('部分客户不存在、已删除或已停用，请刷新后重试');
    throw error;
  }
});

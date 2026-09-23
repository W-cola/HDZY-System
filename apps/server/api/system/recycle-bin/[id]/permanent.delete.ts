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
  if (!user.roles?.includes('super'))
    return useResponseError('只有超级管理员可以永久删除');
  const id = getRouterParam(event, 'id');
  let name = '';
  let module = '';
  if (id?.startsWith('opp')) {
    const refs = await query<{ total: number }>(
      'SELECT count(*)::int AS total FROM crm_follow_up WHERE opportunity_id=$1',
      [id],
    );
    if (Number(refs.rows[0]?.total))
      return useResponseError('该销售机会仍有关联跟进记录，不能永久删除');
    const r = await query(
      'SELECT name FROM crm_opportunity WHERE id=$1 AND deleted=true',
      [id],
    );
    if (!r.rows[0]) return useResponseError('回收站中不存在该记录');
    await query(
      'DELETE FROM crm_opportunity_stage_history WHERE opportunity_id=$1',
      [id],
    );
    const removed = await query(
      'DELETE FROM crm_opportunity WHERE id=$1 AND deleted=true RETURNING name',
      [id],
    );
    if (!removed.rows[0]) return useResponseError('回收站中不存在该记录');
    name = removed.rows[0].name;
    module = '销售机会';
  } else if (id?.startsWith('fu')) {
    const r = await query(
      'DELETE FROM crm_follow_up WHERE id=$1 AND deleted=true RETURNING subject AS name',
      [id],
    );
    if (!r.rows[0]) return useResponseError('回收站中不存在该记录');
    name = r.rows[0].name;
    module = '跟进记录';
  } else if (id?.startsWith('ct')) {
    const refs = await query<{ total: number }>(
      'SELECT count(*)::int AS total FROM crm_follow_up WHERE contact_id=$1',
      [id],
    );
    if (Number(refs.rows[0]?.total))
      return useResponseError('该联系人仍有关联跟进记录，不能永久删除');
    const r = await query(
      'DELETE FROM crm_contact WHERE id=$1 AND deleted=true RETURNING name',
      [id],
    );
    if (!r.rows[0]) return useResponseError('回收站中不存在该记录');
    name = r.rows[0].name;
    module = '联系人';
  } else if (id?.startsWith('c')) {
    const refs = await query<{ contacts: number; followUps: number }>(
      'SELECT (SELECT count(*) FROM crm_contact WHERE customer_id=$1)::int AS contacts,(SELECT count(*) FROM crm_follow_up WHERE customer_id=$1)::int AS "followUps"',
      [id],
    );
    if (Number(refs.rows[0]?.contacts) || Number(refs.rows[0]?.followUps))
      return useResponseError('该客户仍有关联联系人或跟进记录，不能永久删除');
    const r = await query(
      'DELETE FROM crm_customer WHERE id=$1 AND deleted=true RETURNING name',
      [id],
    );
    if (!r.rows[0]) return useResponseError('回收站中不存在该记录');
    name = r.rows[0].name;
    module = '客户单位';
  } else return useResponseError('无效的回收站记录');
  recordAudit(event, {
    module,
    action: '永久删除',
    target: name,
    detail: `永久删除${module}：${name}`,
  });
  return useResponseSuccess({ id });
});

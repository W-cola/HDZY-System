import { eventHandler } from 'h3';
import { query } from '~/utils/db';
import { requireAuth } from '~/utils/rbac';
import { useResponseSuccess } from '~/utils/response';

export default eventHandler(async (event) => {
  const user = await requireAuth(event);
  if (!user) return;
  const [summary, stages, owners] = await Promise.all([
    query(
      `SELECT COUNT(*)::int AS "opportunityCount", COALESCE(SUM(amount),0)::numeric AS "pipelineAmount", COUNT(*) FILTER (WHERE status='进行中')::int AS "activeCount", COUNT(*) FILTER (WHERE stage IN ('赢单','已完成'))::int AS "wonCount" FROM crm_opportunity WHERE deleted=false`,
    ),
    query(
      `SELECT stage,COUNT(*)::int AS count,COALESCE(SUM(amount),0)::numeric AS amount FROM crm_opportunity WHERE deleted=false GROUP BY stage ORDER BY count DESC,stage`,
    ),
    query(
      `SELECT u.real_name AS name,COUNT(o.id)::int AS count,COALESCE(SUM(o.amount),0)::numeric AS amount FROM crm_opportunity o JOIN sys_user u ON u.id=o.owner_id WHERE o.deleted=false GROUP BY u.id,u.real_name ORDER BY amount DESC`,
    ),
  ]);
  return useResponseSuccess({
    summary: summary.rows[0],
    stages: stages.rows,
    owners: owners.rows,
  });
});

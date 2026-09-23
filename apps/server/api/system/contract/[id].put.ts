import { eventHandler, getRouterParam, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { verifyAccessToken } from '~/utils/jwt-utils';
import { canAccessCustomer, dataScopeCondition } from '~/utils/rbac';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';

export default eventHandler(async (event) => {
  const user = verifyAccessToken(event);
  if (!user) return unAuthorizedResponse(event);
  const id = getRouterParam(event, 'id');
  const body: any = await readBody(event);
  const scopeValues: any[] = [];
  const scope = dataScopeCondition(
    user as any,
    'owner_id',
    scopeValues,
  ).replaceAll(/\$(\d+)/g, (_m, n) => `$${Number(n) + 1}`);
  const old = await query<any>(
    `SELECT * FROM crm_contract WHERE id=$1 AND deleted=false AND (${scope})`,
    [id, ...scopeValues],
  );
  if (!old.rows[0]) return useResponseError('合同不存在或无权操作');
  if (!(await canAccessCustomer(user as any, String(body?.customerId ?? ''))))
    return useResponseError('客户不存在、已删除或无权操作');
  if (body.ownerId) {
    const ownerValues: any[] = [];
    const ownerScope = dataScopeCondition(
      user as any,
      'u.id',
      ownerValues,
    ).replaceAll(/\$(\d+)/g, (_m, n) => `$${Number(n) + 1}`);
    const owner = await query(
      `SELECT u.id FROM sys_user u WHERE u.id=$1 AND u.status=1 AND (${ownerScope})`,
      [body.ownerId, ...ownerValues],
    );
    if (!owner.rows[0]) return useResponseError('合同负责人不在可操作范围内');
  }
  const projectNo = body?.projectNo?.trim() || body?.contractNo?.trim();
  if (!projectNo || !body?.contractName?.trim() || !body.customerId)
    return useResponseError('请填写项目编号、合同名称并选择客户');
  const paymentPlans = (
    Array.isArray(body.paymentPlans) ? body.paymentPlans : []
  ).map((item: any) => ({
    ...item,
    ratio: Number(item.ratio || 0),
    amount: Number(item.amount || 0),
  }));
  const ratio = paymentPlans.reduce(
    (sum: number, item: any) => sum + Number(item.ratio || 0),
    0,
  );
  if (body?.status !== '草稿' && Math.abs(ratio - 100) > 0.001)
    return useResponseError(
      `付款比例合计必须为100%，当前为${ratio.toFixed(2)}%`,
    );
  const items = (Array.isArray(body.items) ? body.items : []).map((x: any) => ({
    ...x,
    total: Number(
      x.total ?? Number(x.quantity || 0) * Number(x.unitPrice || 0),
    ),
  }));
  const result = await query(
    `UPDATE crm_contract SET contract_no=$1,contract_name=$2,customer_id=$3,contact_name=$4,project_name=$5,project_no=$6,archive_no=$7,archived_at=$8,signed_at=$9,amount=$10,owner_id=$11,project_type=$12,payment_method=$13,quality_deposit=$14,project_period=$15,status=$16,remark=$17,items=$18,updated_at=now() WHERE id=$19 RETURNING id`,
    [
      projectNo,
      body.contractName.trim(),
      body.customerId,
      body.contactName || '',
      body.projectName || '',
      projectNo,
      body.archiveNo || '',
      body.archivedAt || null,
      body.signedAt || null,
      Number(
        body.amount ||
          items.reduce((sum: number, x: any) => sum + Number(x.total || 0), 0),
      ),
      body.ownerId || old.rows[0].owner_id,
      body.projectType || '文档',
      '',
      Number(body.qualityDeposit || 0),
      body.projectPeriod || '',
      body.status || '执行中',
      body.remark || '',
      JSON.stringify({
        items,
        paymentPlans,
        invoiceProfileId: body.invoiceProfileId || null,
        invoiceSnapshot: body.invoiceSnapshot || null,
        attachments: Array.isArray(body.attachments)
          ? body.attachments
          : body.attachment
            ? [body.attachment]
            : [],
      }),
      id,
    ],
  );
  recordAudit(event, {
    module: '合同中心',
    action: '编辑合同',
    target: id,
    detail: body.contractName,
  });
  return useResponseSuccess(result.rows[0]);
});

import { eventHandler } from 'h3';
import { z } from 'zod';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import {
  canAccessCustomer,
  dataScopeCondition,
  requirePermission,
} from '~/utils/rbac';
import {
  unAuthorizedResponse,
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
import { money, parseBody, text } from '~/utils/validation';

function validate(body: any) {
  const contractNo = body?.projectNo?.trim() || body?.contractNo?.trim();
  if (!contractNo || !body?.contractName?.trim() || !body.customerId)
    return '请填写项目编号、合同名称并选择客户';
  if (!Array.isArray(body.items)) return '合同内容明细格式不正确';
  if (!Array.isArray(body.paymentPlans)) return '请填写付款计划';
  const ratio = body.paymentPlans.reduce(
    (sum: number, item: any) => sum + Number(item.ratio || 0),
    0,
  );
  if (Math.abs(ratio - 100) > 0.001)
    return `付款比例合计必须为100%，当前为${ratio.toFixed(2)}%`;
  return null;
}

export default eventHandler(async (event) => {
  const user = await requirePermission(event, 'contract:create');
  if (!user) return unAuthorizedResponse(event);
  const body: any = await parseBody(
    event,
    z.object({
      projectNo: text(100).optional(),
      contractNo: text(100).optional(),
      contractName: text(200),
      customerId: text(128),
      status: z.enum(['草稿', '执行中', '已完成', '已终止']).optional(),
      amount: money.optional(),
      ownerId: text(128).optional(),
      projectType: z.enum(['文档', '组工', '其他']).optional(),
      qualityDeposit: money.optional(),
      projectPeriod: text(100).optional(),
      contactName: text(100).optional(),
      projectName: text(200).optional(),
      archiveNo: text(100).optional(),
      archivedAt: text(50).optional(),
      signedAt: text(50).optional(),
      remark: text(2000).optional(),
      items: z.array(z.record(z.string(), z.any())).max(200).default([]),
      paymentPlans: z
        .array(
          z.object({
            condition: text(200).optional(),
            ratio: z.coerce.number().min(0).max(100),
            amount: money.optional(),
            remark: text(500).optional(),
          }),
        )
        .max(50)
        .default([]),
      invoiceProfileId: text(128).optional(),
      invoiceSnapshot: z.any().optional(),
      attachments: z.array(z.any()).max(20).optional(),
      attachment: z.any().optional(),
    }),
  );
  if (!body) return;
  const error =
    body?.status === '草稿'
      ? !body?.projectNo?.trim() ||
        !body?.contractName?.trim() ||
        !body.customerId
        ? '暂存合同仍需填写项目编号、合同名称并选择客户'
        : null
      : validate(body);
  if (error) return useResponseError(error);
  if (!(await canAccessCustomer(user as any, body.customerId)))
    return useResponseError('客户不存在、已删除或无权操作');
  const customer = await query(
    'SELECT id FROM crm_customer WHERE id=$1 AND deleted=false AND status=1',
    [body.customerId],
  );
  if (!customer.rows[0]) return useResponseError('客户不存在或已停用');
  if (body.ownerId) {
    const ownerValues: any[] = [];
    const ownerScope = dataScopeCondition(user as any, 'u.id', ownerValues);
    const owner = await query(
      `SELECT u.id FROM sys_user u WHERE u.id=$1 AND u.status=1 AND (${ownerScope.replaceAll(/\$(\d+)/g, (_m, n) => `$${Number(n) + 1}`)})`,
      [body.ownerId, ...ownerValues],
    );
    if (!owner.rows[0]) return useResponseError('合同负责人不在可操作范围内');
  }
  const items = body.items.map((x: any) => ({
    ...x,
    total: Number(
      x.total ?? Number(x.quantity || 0) * Number(x.unitPrice || 0),
    ),
  }));
  const contractNo = body.projectNo.trim();
  const paymentPlans = body.paymentPlans.map((x: any) => ({
    ...x,
    ratio: Number(x.ratio || 0),
    amount: Number(x.amount || 0),
  }));
  try {
    const result = await query(
      `INSERT INTO crm_contract(id,contract_no,contract_name,customer_id,contact_name,project_name,project_no,archive_no,archived_at,signed_at,amount,owner_id,project_type,payment_method,quality_deposit,project_period,status,remark,items) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19) RETURNING id`,
      [
        `con${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
        contractNo,
        body.contractName.trim(),
        body.customerId,
        body.contactName || '',
        body.projectName || '',
        contractNo,
        body.archiveNo || '',
        body.archivedAt || null,
        body.signedAt || null,
        Number(
          body.amount ||
            items.reduce(
              (sum: number, x: any) => sum + Number(x.total || 0),
              0,
            ),
        ),
        body.ownerId || user.id,
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
      ],
    );
    recordAudit(event, {
      module: '合同中心',
      action: '创建合同',
      target: result.rows[0].id,
      detail: body.contractName,
    });
    return useResponseSuccess(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') return useResponseError('项目编号已存在');
    throw error;
  }
});

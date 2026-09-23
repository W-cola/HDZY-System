import type { EventHandlerRequest, H3Event } from 'h3';

import { getHeader, getRequestIP } from 'h3';

import { query } from './db';
import { verifyAccessToken } from './jwt-utils';
import { auditLogs, systemSettings } from './system-data';
import { formatSystemDateTime } from './timezone-utils';

export type AuditResult = '失败' | '成功';

export interface AuditInput {
  action: string;
  detail: string;
  module: string;
  result?: AuditResult;
  target: string;
}

const IMPORTANT_ACTIONS = new Set([
  '修改密码',
  '修改系统设置',
  '创建账号',
  '删除岗位',
  '删除菜单',
  '删除角色',
  '删除账号',
  '删除部门',
  '新增岗位',
  '新增菜单',
  '新增角色',
  '新增部门',
  '登录',
  '登录失败',
  '编辑岗位',
  '编辑菜单',
  '编辑角色',
  '编辑账号',
  '编辑部门',
  '调整成员',
  '调整权限',
  '重置密码',
]);

function shouldRecord(input: AuditInput) {
  return (
    systemSettings.logMode === 'detailed' || IMPORTANT_ACTIONS.has(input.action)
  );
}

function pruneExpiredLogs() {
  const retentionDays = Number(systemSettings.logRetentionDays);
  if (!Number.isFinite(retentionDays) || retentionDays <= 0) return;
  const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
  for (let index = auditLogs.length - 1; index >= 0; index -= 1) {
    const createdAt = Date.parse(auditLogs[index]?.createdAt ?? '');
    if (Number.isFinite(createdAt) && createdAt < cutoff)
      auditLogs.splice(index, 1);
  }
}

export function recordAudit(
  event: H3Event<EventHandlerRequest>,
  input: AuditInput,
) {
  if (!shouldRecord(input)) return;
  pruneExpiredLogs();
  const operator = verifyAccessToken(event);
  const forwardedFor = getHeader(event, 'x-forwarded-for');
  const ip = forwardedFor?.split(',')[0]?.trim() || getRequestIP(event) || '';
  auditLogs.unshift({
    id: `log${Date.now()}${Math.random().toString(36).slice(2, 7)}`,
    operator: operator?.realName ?? '未知用户',
    module: input.module,
    action: input.action,
    target: input.target,
    result: input.result ?? '成功',
    ip,
    detail: input.detail,
    createdAt: formatSystemDateTime(new Date(), systemSettings.timezone),
  });
  void query(
    'INSERT INTO sys_operation_log(id,operator,module,action,target,result,ip,detail,created_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9)',
    [
      auditLogs[0].id,
      auditLogs[0].operator,
      auditLogs[0].module,
      auditLogs[0].action,
      auditLogs[0].target,
      auditLogs[0].result,
      auditLogs[0].ip,
      auditLogs[0].detail,
      auditLogs[0].createdAt,
    ],
  ).catch((error) => {
    console.error('[audit] 操作日志写入数据库失败', error);
  });
}

export function recordLoginAudit(
  event: H3Event<EventHandlerRequest>,
  input: Omit<AuditInput, 'module'>,
) {
  recordAudit(event, { ...input, module: '登录安全' });
}

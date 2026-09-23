import { eventHandler, readBody } from 'h3';
import { recordAudit } from '~/utils/audit';
import { query } from '~/utils/db';
import { requireRoles } from '~/utils/rbac';
import {
  useResponseError,
  useResponseSuccess,
} from '~/utils/response';
import { TIME_ZONE_OPTIONS } from '~/utils/runtime-data';
import { systemSettings } from '~/utils/system-data';
import { setTimezone } from '~/utils/timezone-utils';
export default eventHandler(async (event) => {
  const actor = await requireRoles(event, ['super', 'admin']);
  if (!actor) return;
  if (event.method === 'PUT' || event.method === 'POST') {
    const body = await readBody(event);
    const allowed = new Set([
      'companyName',
      'crossSalesVisibility',
      'defaultPageSize',
      'detailModeHours',
      'lockMinutes',
      'logMode',
      'logRetentionDays',
      'maxLoginFailures',
      'maxUploadSizeMb',
      'passwordMaxLength',
      'passwordMinLength',
      'passwordRequireLettersAndNumbers',
      'systemName',
      'timezone',
    ]);
    const unknown = Object.keys(body ?? {}).filter((key) => !allowed.has(key));
    if (unknown.length > 0)
      return useResponseError(`不允许修改字段：${unknown.join('、')}`);
    if (!body?.systemName?.trim() || !body?.companyName?.trim())
      return useResponseError('系统名称和公司全称不能为空');
    if (!TIME_ZONE_OPTIONS.some((item) => item.timezone === body.timezone))
      return useResponseError('请选择有效的系统时区');
    if (
      !Number.isInteger(Number(body.defaultPageSize)) ||
      body.defaultPageSize < 10 ||
      body.defaultPageSize > 100
    )
      return useResponseError('默认分页条数必须是10到100之间的整数');
    if (
      !Number.isInteger(Number(body.passwordMinLength)) ||
      !Number.isInteger(Number(body.passwordMaxLength)) ||
      body.passwordMinLength < 8 ||
      body.passwordMaxLength < body.passwordMinLength
    )
      return useResponseError('密码长度范围设置不正确');
    Object.assign(systemSettings, body, {
      systemName: body.systemName.trim(),
      companyName: body.companyName.trim(),
    });
    await query(
      `INSERT INTO sys_setting(setting_key, setting_value, updated_at)
       VALUES('global', $1::jsonb, now())
       ON CONFLICT (setting_key)
       DO UPDATE SET setting_value = EXCLUDED.setting_value, updated_at = now()`,
      [JSON.stringify(systemSettings)],
    );
    recordAudit(event, {
      module: '系统设置',
      action: '修改系统设置',
      target: systemSettings.systemName,
      detail: '更新系统名称、公司信息、安全或日志策略',
    });
    setTimezone(systemSettings.timezone);
  }
  const result = await query<{ setting_value: Record<string, any> }>(
    "SELECT setting_value FROM sys_setting WHERE setting_key='global'",
  );
  return useResponseSuccess(result.rows[0]?.setting_value ?? systemSettings);
});

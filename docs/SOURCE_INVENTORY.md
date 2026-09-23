# 源码快照清单

> 根目录保护文档：永久保留、按需更新；未经用户明确点名要求删除，不得删除、改名、移动、清空或用空模板覆盖。新会话不必通读本文件，按任务读取。
> 本文依据 0921 导出包；其 2,300 个普通文件与 0920 包逐文件字节一致。历史修复报告不等于本包已修复，状态以 PROJECT_STATUS.md 为准。


生成日期：2026-09-21。仅对应 0921-92e9f48e.tar.gz；不代表平台线上状态。

SHA-256：`e12c780a242da5872d54dd787696d99d9fd7f294ff059e17b8eb7a1c79a27e1a`

共 2300 个普通文件、102 个 Markdown、99 个 API 源文件。统计包含隐藏文件，未展开内部旧压缩包。

## 数据表

基线 SQL 定义 21 张表；迁移脚本另建 schema_migrations。

- `sys_department`
- `sys_position`
- `sys_user`
- `sys_role`
- `sys_user_role`
- `sys_menu`
- `sys_role_menu`
- `sys_setting`
- `sys_operation_log`
- `crm_customer`
- `crm_contact`
- `crm_follow_up`
- `crm_opportunity`
- `crm_opportunity_stage_history`
- `crm_contract`
- `crm_customer_invoice_profile`
- `crm_contract_invoice`
- `crm_contract_payment`
- `crm_customer_transfer`
- `crm_customer_transfer_detail`
- `hr_employee`

## API 源文件及显式鉴权调用

这是静态索引，不是接口安全验收：中间件、动态分支、资源归属和状态检查需一并阅读。未出现 helper 不等于无鉴权。无方法后缀及 .post.ts 路由的实际 Nitro 映射需运行验证。

| 源文件 | 文件内显式调用 |
|---|---|
| `apps/server/api/analytics/sales.get.ts` | `await requireAuth(event)` |
| `apps/server/api/auth/codes.ts` | `await requireAuth(event)` |
| `apps/server/api/auth/disabled-codes.ts` | `await requireAuth(event)` |
| `apps/server/api/auth/login.post.ts` | 未识别到上述鉴权调用；需结合中间件判断 |
| `apps/server/api/auth/logout.post.ts` | 未识别到上述鉴权调用；需结合中间件判断 |
| `apps/server/api/auth/refresh.post.ts` | 未识别到上述鉴权调用；需结合中间件判断 |
| `apps/server/api/menu/all.ts` | `verifyAccessToken(event)` |
| `apps/server/api/status.ts` | 未识别到上述鉴权调用；需结合中间件判断 |
| `apps/server/api/system/audit-logs.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/contact/[id].delete.ts` | `await requirePermission(event, 'contact:delete')` |
| `apps/server/api/system/contact/[id].put.ts` | `await requirePermission(event, 'contact:update')` |
| `apps/server/api/system/contact/[id]/primary.put.ts` | `await requirePermission(event, 'contact:update')` |
| `apps/server/api/system/contact/index.post.ts` | `await requirePermission(event, 'contact:create')` |
| `apps/server/api/system/contact/list.get.ts` | `await requirePermission(event, 'contact:list:view')` |
| `apps/server/api/system/contract/[id].delete.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/contract/[id].put.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/contract/file/[id].delete.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/contract/file/[id].get.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/contract/index.post.ts` | `await requirePermission(event, 'contract:create')` |
| `apps/server/api/system/contract/invoice/[id].delete.ts` | `await requirePermission(event, 'invoice:delete')` |
| `apps/server/api/system/contract/invoice/[id].put.ts` | `await requirePermission(event, 'invoice:update')` |
| `apps/server/api/system/contract/invoice/index.post.ts` | `await requirePermission(event, 'invoice:create')` |
| `apps/server/api/system/contract/invoice/list.get.ts` | `await requirePermission(event, 'invoice:list:view')` |
| `apps/server/api/system/contract/invoice/upload.post.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/contract/list.get.ts` | `await requirePermission(event, 'contract:list:view')` |
| `apps/server/api/system/contract/payment/[id].delete.ts` | `await requirePermission(event, 'payment:delete')` |
| `apps/server/api/system/contract/payment/index.post.ts` | `await requirePermission(event, 'payment:create')` |
| `apps/server/api/system/contract/payment/list.get.ts` | `await requirePermission(event, 'payment:list:view')` |
| `apps/server/api/system/contract/upload.post.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/customer-transfer/[id]/reverse.put.ts` | `await requirePermission(event, 'customer:transfer:reverse')` |
| `apps/server/api/system/customer-transfer/history.get.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/customer-transfer/index.post.ts` | `await requirePermission(event, 'customer:transfer:create')` |
| `apps/server/api/system/customer-transfer/list.get.ts` | `await requirePermission(event, 'customer:transfer:view')` |
| `apps/server/api/system/customer-transfer/users.get.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/customer/[id].delete.ts` | `await requirePermission(event, 'customer:delete')` |
| `apps/server/api/system/customer/[id].put.ts` | `await requirePermission(event, 'customer:update')` |
| `apps/server/api/system/customer/import.post.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/customer/index.post.ts` | `await requirePermission(event, 'customer:create')` |
| `apps/server/api/system/customer/invoice-profile.get.ts` | `await requirePermission(event, 'customer:invoice-profile:list:view')` |
| `apps/server/api/system/customer/invoice-profile.post.ts` | `await requirePermission(event, 'customer:invoice-profile:create')` |
| `apps/server/api/system/customer/list.get.ts` | `await requirePermission(event, 'customer:list:view')` |
| `apps/server/api/system/dept/.post.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/dept/[id].delete.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/dept/[id].put.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/dept/list.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/follow-up/[id].delete.ts` | `await requirePermission(event, 'followup:delete')` |
| `apps/server/api/system/follow-up/[id].put.ts` | `await requirePermission(event, 'followup:update')` |
| `apps/server/api/system/follow-up/[id]/permanent.delete.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/follow-up/[id]/restore.put.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/follow-up/index.post.ts` | `await requirePermission(event, 'followup:create')` |
| `apps/server/api/system/follow-up/list.get.ts` | `await requirePermission(event, 'followup:list:view')` |
| `apps/server/api/system/follow-up/recycle.get.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/hr/employee/[id].delete.ts` | `await requirePermission(event, 'hr:employee:delete')` |
| `apps/server/api/system/hr/employee/file/[id].delete.ts` | `await requireRoles(event, ['super', 'admin', 'hr'])` |
| `apps/server/api/system/hr/employee/file/[id].get.ts` | `await requireRoles(event, ['super', 'admin', 'hr'])` |
| `apps/server/api/system/hr/employee/index.post.ts` | `await requirePermission(event, 'hr:employee:create')` |
| `apps/server/api/system/hr/employee/list.get.ts` | `await requirePermission(event, 'hr:employee:view')` |
| `apps/server/api/system/hr/employee/upload.post.ts` | `await requirePermission(event, 'hr:employee:upload')` |
| `apps/server/api/system/menu/.post.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/menu/[id].delete.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/menu/[id].put.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/menu/list.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/menu/name-exists.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/menu/path-exists.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/opportunity/[id].delete.ts` | `await requirePermission(event, 'opportunity:delete')` |
| `apps/server/api/system/opportunity/[id].put.ts` | `await requirePermission(event, 'opportunity:update')` |
| `apps/server/api/system/opportunity/[id]/detail.get.ts` | `await requireAuth(event)` |
| `apps/server/api/system/opportunity/index.post.ts` | `await requirePermission(event, 'opportunity:create')` |
| `apps/server/api/system/opportunity/list.get.ts` | `await requirePermission(event, 'opportunity:list:view')` |
| `apps/server/api/system/organization.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/position/.post.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/position/[id].delete.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/position/[id].put.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/position/list.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/recycle-bin/[id]/permanent.delete.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/recycle-bin/[id]/restore.put.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/recycle-bin/list.get.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/role/.post.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/role/[id].delete.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/role/[id].put.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/role/[id]/members.get.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/role/[id]/members.put.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/role/[id]/permissions.put.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/role/list.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/settings.ts` | `await requireRoles(event, ['super', 'admin'])` |
| `apps/server/api/system/user/.post.ts` | `await requireRoles(event, ['super', 'admin'])` |
| `apps/server/api/system/user/[id].delete.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/user/[id].put.ts` | `verifyAccessToken(event)` |
| `apps/server/api/system/user/[id]/reset-password.post.ts` | `await requireRoles(event, ['super', 'admin'])` |
| `apps/server/api/system/user/list.ts` | `verifyAccessToken(event)` |
| `apps/server/api/table/list.ts` | `verifyAccessToken(event)` |
| `apps/server/api/test.get.ts` | 未识别到上述鉴权调用；需结合中间件判断 |
| `apps/server/api/test.post.ts` | 未识别到上述鉴权调用；需结合中间件判断 |
| `apps/server/api/timezone/getTimezone.ts` | `verifyAccessToken(event)` |
| `apps/server/api/timezone/getTimezoneOptions.ts` | 未识别到上述鉴权调用；需结合中间件判断 |
| `apps/server/api/timezone/setTimezone.ts` | `verifyAccessToken(event)` |
| `apps/server/api/upload.ts` | `verifyAccessToken(event)` |
| `apps/server/api/user/info.ts` | `verifyAccessToken(event)` |
| `apps/server/api/user/password.put.ts` | `verifyAccessToken(event)` |

## 原有 Markdown 去向建议

本次没有删除或移动原文件。下表为建议，执行方式见 DOCS_POLICY.md。

| 原路径 | 建议 |
|---|---|
| `.changeset/README.md` | 保留工具链与变更记录，确认工作流后再处理 |
| `.changeset/fancy-ears-walk.md` | 保留工具链与变更记录，确认工作流后再处理 |
| `PGlite-数据库防损坏强制编码-Skill-修订版.md` | 归档；保留单进程和备份原则，修正与现有离线迁移流程冲突的绝对表述 |
| `README.ja-JP.md` | 保留原版副本至历史目录；根 README 改为本项目入口（本次未覆盖） |
| `README.md` | 保留原版副本至历史目录；根 README 改为本项目入口（本次未覆盖） |
| `README.zh-CN.md` | 保留原版副本至历史目录；根 README 改为本项目入口（本次未覆盖） |
| `apps/server/README.md` | 替换为新文档入口；当前“无数据库 mock”描述已过时 |
| `apps/web-antd/src/locales/README.md` | 保留局部说明，确认内容适用范围 |
| `apps/web-antd/src/views/_core/README.md` | 保留局部说明，确认内容适用范围 |
| `apps/web-antd/src/views/operations/README.md` | 替换为模块地图入口；当前“全是演示页面”描述已过时 |
| `internal/vendor-vben/@core/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/base/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/base/design/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/base/icons/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/base/shared/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/base/shared/src/cache/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/base/typings/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/composables/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/composables/src/use-simple-locale/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/preferences/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/ui-kit/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/ui-kit/form-ui/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/ui-kit/layout-ui/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/ui-kit/menu-ui/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/ui-kit/menu-ui/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/ui-kit/popup-ui/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/ui-kit/shadcn-ui/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/@core/ui-kit/tabs-ui/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/constants/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/constants/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/access/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/common-ui/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/hooks/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/hooks/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/layouts/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/layouts/src/basic/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/plugins/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/plugins/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/plugins/src/echarts/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/plugins/src/motion/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/plugins/src/vxe-table/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/effects/request/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/icons/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/icons/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/locales/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/preferences/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/stores/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/styles/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/styles/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/types/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/types/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/utils/CHANGELOG.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vendor-vben/utils/README.md` | 保留备份配套文档，不作为项目事实入口 |
| `internal/vite-config/src/plugins/inject-app-loading/README.md` | 保留模块说明，按需阅读 |
| `packages/@core/README.md` | 保留模块说明，按需阅读 |
| `packages/@core/base/README.md` | 保留模块说明，按需阅读 |
| `packages/@core/base/design/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/@core/base/icons/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/@core/base/shared/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/@core/base/shared/src/cache/README.md` | 保留模块说明，按需阅读 |
| `packages/@core/base/typings/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/@core/composables/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/@core/composables/src/use-simple-locale/README.md` | 保留模块说明，按需阅读 |
| `packages/@core/preferences/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/@core/ui-kit/README.md` | 保留模块说明，按需阅读 |
| `packages/@core/ui-kit/form-ui/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/@core/ui-kit/layout-ui/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/@core/ui-kit/menu-ui/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/@core/ui-kit/menu-ui/README.md` | 保留模块说明，按需阅读 |
| `packages/@core/ui-kit/popup-ui/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/@core/ui-kit/shadcn-ui/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/@core/ui-kit/tabs-ui/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/constants/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/constants/README.md` | 保留模块说明，按需阅读 |
| `packages/effects/README.md` | 保留模块说明，按需阅读 |
| `packages/effects/access/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/effects/common-ui/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/effects/hooks/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/effects/hooks/README.md` | 保留模块说明，按需阅读 |
| `packages/effects/layouts/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/effects/layouts/src/basic/README.md` | 保留模块说明，按需阅读 |
| `packages/effects/plugins/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/effects/plugins/README.md` | 保留模块说明，按需阅读 |
| `packages/effects/plugins/src/echarts/README.md` | 保留模块说明，按需阅读 |
| `packages/effects/plugins/src/motion/README.md` | 保留模块说明，按需阅读 |
| `packages/effects/plugins/src/vxe-table/README.md` | 保留模块说明，按需阅读 |
| `packages/effects/request/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/icons/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/icons/README.md` | 保留模块说明，按需阅读 |
| `packages/locales/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/preferences/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/stores/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/styles/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/styles/README.md` | 保留模块说明，按需阅读 |
| `packages/types/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/types/README.md` | 保留模块说明，按需阅读 |
| `packages/utils/CHANGELOG.md` | 保留框架版本历史；不作为业务进度 |
| `packages/utils/README.md` | 保留模块说明，按需阅读 |
| `scripts/turbo-run/README.md` | 保留模块说明，按需阅读 |
| `scripts/vsh/README.md` | 保留模块说明，按需阅读 |
| `交接文档.md` | 归档为历史交接；由新文档拆分替代 |

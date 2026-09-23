# 项目地图

> 根目录保护文档：永久保留、按需更新；未经用户明确点名要求删除，不得删除、改名、移动、清空或用空模板覆盖。新会话不必通读本文件，按任务读取。
> 本文依据 0921 导出包；其 2,300 个普通文件与 0920 包逐文件字节一致。历史修复报告不等于本包已修复，状态以 PROJECT_STATUS.md 为准。


基线：2026-09-21，来自 0921-92e9f48e.tar.gz。此文记录代码结构；功能验收状态见 PROJECT_STATUS.md。

## 项目身份与范围

源码中的产品名称为“华档致远”，上游为 Vue Vben Admin。根 package.json 的 5.7.0 是当前包版本信息，不足以证明定制项目已经发布到该版本或对应某个上游提交。

主体是企业运营管理：客户 → 联系人/跟进/商机 → 合同 → 开票与回款，并有客户移交、员工档案、权限与审计。销售分析当前查询商机汇总。项目中虽有 tenantMode 偏好字段，但不应据此宣称支持多租户隔离；当前未建立这种能力的验收证据。

## 目录职责

| 路径 | 职责 / 开发注意 |
|---|---|
| apps/web-antd/src/views/operations | 业务页面、详情、合同编辑器、业务 composables |
| apps/web-antd/src/views/system | 用户、角色、组织、菜单、设置、审计、回收站 |
| apps/web-antd/src/api/core | 前端业务请求与部分类型 |
| apps/web-antd/src/api/request.ts | 请求封装、响应与登录处理 |
| apps/web-antd/src/router | 路由、守卫、动态菜单；access.ts 有历史菜单补丁 |
| apps/web-antd/src/preferences.ts | 项目标题、默认首页、backend 权限模式 |
| apps/server/api | Nitro 文件路由；不能只凭文件名忽略中间件 |
| apps/server/middleware | 持久化初始化、跨域、部分角色级访问控制 |
| apps/server/utils/db.ts | PGlite / PostgreSQL 运行时入口 |
| apps/server/utils/rbac.ts | 当前用户、操作授权、数据范围辅助函数 |
| apps/server/utils/system-data.ts | 内置菜单与权限目录等系统定义 |
| apps/server/utils/system-persistence.ts | 进程首次请求时初始化、菜单同步和历史补列 |
| apps/server/utils/base-seed.ts | 基础账号、角色、部门和岗位初始化 |
| apps/server/db/migrations | 版本迁移；当前只有 001_baseline.sql |
| apps/server/scripts/migrate.mjs | 离线迁移器；工作目录应是 apps/server |
| packages | 正在使用的 Vben 共享源码 |
| internal | 构建、检查配置；vendor-vben 为恢复副本 |
| scripts | 平台启动、准备、检查和恢复脚本 |
| tests/integration/core-flow.test.ts | 登录/权限、客户回收、合同财务链路测试，已有缺陷 |
| data/pg、data/uploads | 运行时数据库和附件；本源码包没有这两个目录 |
| luffy.manifest.json | 路小飞开发服务与持久化配置 |
| Dockerfile、compose.yaml | 根生产构建与启动配置；不要与 scripts/deploy 下旧方案混用 |

## 请求与数据流

```text
业务页面 → api/core → requestClient → /api/*
  → middleware/0.persistence（首次请求初始化）
  → middleware/1.api（跨域）
  → middleware/2.rbac（部分前缀角色控制）
  → 路由自己的登录/权限/数据范围检查 → utils/db.ts → 数据库
```

前端开发端口 5173，将 /api 代理至 5320。生产 Docker 将前端 dist 复制进 Nitro .output/public，由同一服务提供。

DATABASE_URL 是否存在决定数据库分支，而非 NODE_ENV：有值用 pg.Pool，无值用 PGlite。生产缺少 DATABASE_URL 时当前代码仍可能退回本地库，部署需明确检查 database=postgresql，不能只看健康检查 HTTP 200。

## 数据关系与事实来源

| 领域 | 核心表 | 关系 |
|---|---|---|
| 权限组织 | sys_user、sys_role、sys_menu、sys_user_role、sys_role_menu、sys_department、sys_position | 用户多角色，角色多菜单/按钮；用户关联部门与岗位 |
| 客户 | crm_customer、crm_contact、crm_follow_up | 客户关联联系人、跟进；owner_id 是部分数据范围依据 |
| 商机 | crm_opportunity、crm_opportunity_stage_history | 客户下商机及阶段历史 |
| 合同 | crm_contract | 关联客户；items JSONB 实际保存明细、付款计划、开票快照、附件等复合对象 |
| 财务 | crm_customer_invoice_profile、crm_contract_invoice、crm_contract_payment | 客户开票资料、合同发票、合同回款；开票资料当前版本有部分唯一索引 |
| 移交 | crm_customer_transfer、crm_customer_transfer_detail | 记录转入转出与逐客户原负责人；执行时同步进行中商机 |
| 人事 | hr_employee | 独立员工档案；部门/岗位用名称文本，并非自动等同 sys_user |
| 系统 | sys_setting、sys_operation_log | 设置与审计 |

表结构以迁移及现有启动 DDL 一起核对；只看 001 不足以解释全部运行行为。客户与合同负责人是分别存储的字段，不假设客户移交会自动移交所有合同。

## 技术版本来源

根 engines：Node `^22.18.0 || ^24.12.0`，pnpm `>=11.0.0`；packageManager 固定 `pnpm@11.16.0`。具体依赖使用 pnpm-workspace.yaml 的 catalog 与 pnpm-lock.yaml。不要在文档另维护一张会过期的全量依赖版本表。

## 尚未证实的环境事实

线上域名、当前发布版本、数据库数据量、备份策略是否已落实、用户角色实际配置、平台服务的停止行为，均不在该包中。不要照抄旧交接中的实例规格或命令就直接发布。

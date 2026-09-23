# 运行、迁移与恢复手册

> 根目录保护文档：永久保留、按需更新；未经用户明确点名要求删除，不得删除、改名、移动、清空或用空模板覆盖。新会话不必通读本文件，按任务读取。
> 本文依据 0921 导出包；其 2,300 个普通文件与 0920 包逐文件字节一致。历史修复报告不等于本包已修复，状态以 PROJECT_STATUS.md 为准。


基线：2026-09-21。以下描述当前源码中的命令和约束；本轮没有在路小飞平台实跑。尤其重启与准备脚本有 R07/R08，不能把命令存在当作流程可靠。

## 环境前提

项目脚本依赖 Bash、flock、curl、Unix 进程命令及 /tmp。Windows PowerShell 不能原样执行整套流程；使用符合项目要求的 Linux/路小飞环境，或先专门适配。Node/pnpm 版本以根 package.json 为准。

| 配置 | 用途 / 注意 |
|---|---|
| DATABASE_URL | 有值用 PostgreSQL；正式部署应明确注入，避免误落本地库 |
| ACCESS_TOKEN_SECRET、REFRESH_TOKEN_SECRET | 生产必须配置独立可靠密钥；不要沿用开发脚本默认值 |
| INITIAL_ADMIN_PASSWORD | 首次建账号使用；已有账户不会因此自动改密。compose 和开发脚本有弱默认值，生产显式覆盖 |
| PGLITE_DATA_DIR | 运行时限定为当前工作区根 data/pg；不要临时改路径逃避锁故障 |
| LUFFY_PREVIEW_ORIGINS | 预览跨域及 Vite 域名设置 |
| NITRO_HOST、NITRO_PORT | 平台开发为 0.0.0.0:5320；前端 5173 |

不要将真实值写入本文件或提交到仓库。源码包没有 data/，首次运行会创建新数据库，不能把空库当成“线上数据丢了”。

## 当前开发入口

luffy.manifest.json 配置为分别管理两个服务：

```bash
# 项目根目录；应由两个独立服务执行，而非在同一终端顺序等待
bash scripts/dev-start.sh api
bash scripts/dev-start.sh web
```

API 准备依赖/产物、迁移并启动 Nitro 产物；Web 等待 API 健康后启动 Vite。前端 nitroMock=false，不应再由 Vite 启动第二个后端。

源码中的重启别名为：

```bash
pnpm dev:restart-api
pnpm dev:restart-web
```

**现有限制：** API 锁可能使独立的重启命令等不到停止步骤；prepare-runtime 也可能复用旧构建。R07 修复前，先通过平台服务管理确认旧 API 及其启动 shell 已停止，检查端口和数据库占用，再在停服状态按下文显式迁移/构建并启动。不要同时运行多条重启命令，不要通过随意 kill 全部 Node 进程修复。

## 隔离副本中的安装、构建与检查

以下在满足环境前提、确认依赖安装脚本适用后，从项目根执行：

```bash
pnpm install --frozen-lockfile
node scripts/verify-workspace-links.mjs
pnpm --filter @vben/web-antd run build
pnpm --filter @vben/server run build
```

安装可能运行项目 lifecycle/stub 脚本。不要在运行中原地构建并替换 API .output；先在隔离工作区或停服阶段完成。verify-workspace-links 检查链接不等于备份源码内容一致，R09 仍要单独验证。

## 数据库迁移

当前迁移器期待 cwd=apps/server，优先通过 filter 脚本：

```bash
# PGlite：确认 API/其他迁移进程已经退出，备份已完成
pnpm --filter @vben/server run migrate
```

不要在项目根直接 `node apps/server/scripts/migrate.mjs`，它依赖 cwd 推导 SQL 目录和数据路径。

当前仅 001_baseline.sql；schema_migrations 记录已应用版本。新变化新增编号文件，不复用 001，不改历史记录强制重放。开发脚本的 data/.migration-complete 会跳过新迁移，因此升级前需显式执行迁移器；长期方案是修 R08，不是反复删除完成标记。

生产迁移由根 Docker CMD 在 API 启动前执行。涉及不兼容结构变化时，应制定回滚或前向修复方案；回滚代码不等于回滚数据结构。

## 健康检查

```bash
curl -fsS http://127.0.0.1:5320/api/status
curl -I http://127.0.0.1:5173/
```

检查 JSON 中 data.status、data.database、data.databaseCheck，不仅看状态码。预期开发为 pglite，正式环境为 postgresql（以实际部署约定为准）。首次请求会触发 system-persistence 初始化，因此健康检查不是对一个从未初始化的新库完全无副作用的读取。

API 健康只证明服务/数据库可响应，不证明权限、附件、业务交易通过。

## 故障处理

| 现象 | 先核查 | 避免 |
|---|---|---|
| 改了代码没变化 | 运行产物生成时间、构建日志、当前进程对应目录、R07 | 无限刷新浏览器、反复启动 API |
| 端口占用 | 平台服务与 PID 文件对应关系，是否重复实例 | 杀掉机器所有 Node 进程 |
| PGlite 锁/Aborted | 是否有 API、迁移或恢复进程共同打开目录，是否完整关闭 | 删除 data/pg、换一个目录伪装恢复 |
| .output 缺失 | 构建是否成功，准备脚本是否被并行调用 | 同时运行前后端准备流程 |
| 权限保存后又恢复 | R04 种子/默认授权；角色是否被重新启用 | 只改前端勾选状态 |
| 普通用户合同 500 | R01 AuthUser 与 AuthContext 混用 | 赋予管理员角色掩盖问题 |
| 有附件记录但读不到 | 文件目录、业务关联、访问权限、卷持久化 | 仅恢复数据库而遗漏 data/uploads |

## 备份与恢复

先核对数据库分支，再选备份方式。PGlite 在单进程停止并完成 close 后备份完整目录；PostgreSQL 使用平台支持的备份/快照或一致性逻辑备份。附件需与业务记录可对应，必要时停写窗口内一起备份。

恢复先在独立环境演练：数据库版本、迁移记录、附件可读、多角色权限、金额汇总、启动后配置保持。保留原始副本，不覆盖唯一可用数据。internal/vendor-vben 仅备份共享源码，不是数据库备份。

## 发布检查

根 Dockerfile 构建两端并打包为 Nitro 服务，compose.yaml 配置 PostgreSQL 与 /app/data 卷。scripts/deploy 下是另一套脚本，不能未经核对混用。

发布前记录代码版本、构建/测试结果、迁移变化、备份与恢复证据、配置与附件卷。线上地址和实例规格查询平台实际状态，不照搬历史说明。获得对应发布授权后再执行平台发布操作。

本次文档未执行部署，也未验证旧交接里的 luffy CLI 命令是否仍适用。

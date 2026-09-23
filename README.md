# 华档致远运营管理系统

这是一个基于 Vue Vben Admin 改造的企业运营管理系统，包含客户、联系人、跟进、商机、合同、发票、回款、员工档案、权限与审计等模块。

开始维护前先阅读根目录的 [AGENTS.md](AGENTS.md) 和 [PROJECT_STATUS.md](PROJECT_STATUS.md)。其他项目文档位于 [docs/](docs/)。

## 运行前提

- Node.js 与 pnpm 版本以 `package.json` 为准；
- 本地未配置 `DATABASE_URL` 时使用工作区 `data/pg` 下的 PGlite；
- 生产环境应使用平台提供的 PostgreSQL；
- 不要把 `data/`、`uploads/`、密钥或环境文件提交到仓库。

## 开发入口

```bash
pnpm install
bash scripts/dev-start.sh api
bash scripts/dev-start.sh web
```

完整运行、迁移、测试和恢复说明以根目录文档为准。当前仓库是源码基线，不包含业务数据库、附件、依赖安装目录或构建产物。

# 根目录文档保留与快照策略

用户要求：以下文件永久保留在项目根目录，与 package.json 同级，不再放入 docs/。

- AGENTS.md
- PROJECT_STATUS.md
- PROJECT.md
- CORE_RULES.md
- RUNBOOK.md
- TESTING.md
- DECISIONS.md
- DOCS_POLICY.md
- SOURCE_INVENTORY.md

## AI 的不删除规则

未经用户明确点名要求，不得删除、改名、移动、清空、以空模板覆盖这九个文件。整理、重构、去重、恢复旧快照、节约 Token、清理未跟踪文件都不是删除授权。可按验证后的事实原地更新；不复制过期进度。

AGENTS.md 和 PROJECT_STATUS.md 为启动必读，其余按需阅读。不得为了省 Token 删除文档；应减少不必要的读取。旧 LICENSE、框架 README/CHANGELOG 也不能当垃圾批量清理。

## 平台层持久化

本次导出中的 luffy.manifest.json.persist_paths 仅含 data/**、packages/**、internal/vendor-vben/**、apps/**、internal/**、scripts/**；未显式列入九份根目录文档。此为配置事实，但没有平台日志，不能据此确定丢失原因，也不能保证加路径后一定生效。

平台接入时：
1. 核对当前 manifest 与平台配置机制；保留所有原 persist_paths、services、端口和其他字段。
2. 按原清单的相对路径形式，追加上面九个准确文件名，去重，不用一个新文件覆盖整份 manifest。
3. 若平台不接受单文件路径或配置尚需另行激活，查其支持方式并报告具体缺口，不能假报成功。
4. 若使用 Git，将九文件和配置纳入版本管理；提交/推送按用户授权，不撤销既有更改，不把数据库/凭证加入 Git。Git 本身也不是平台快照保证。
5. 文件落盘后记录路径、非空检查和 SHA-256；重新导出后核对包内是否存在且内容相符。
6. 快照恢复只在受控、可恢复的环境验证，不为测试文档留存而直接回滚当前业务工作区。平台不支持安全验证则明确保留“未验证”。

## 独立备份与变更保护

重要修改完成后，导出包含源码、测试和文档的版本到用户本机保存；不要只把 /tmp 中日志称为持久证据。备份须有日期、关键源码哈希与状态说明，不包含真实凭证。

当前 0921 包与 0920 包的普通文件内容一致，且缺少历史修复。应先核实导出来源，不从旧包反向覆盖平台工作区。

## 文件维护职责

AGENTS：入口/边界；PROJECT_STATUS：唯一进度；PROJECT：架构；CORE_RULES：开发规则；RUNBOOK：运行；TESTING：验证；DECISIONS：业务决定；SOURCE_INVENTORY：历史清单。此文件负责保留策略。不新增重复 TODO/HANDOFF。

如平台仍有 docs/ 旧副本，先比较再合并至根目录。此轮不要删除旧副本，用明确入口避免误读；上传附件副本不作为正式源。首次上传如同名文件已存在，保留较新实质内容，不能用本次旧包状态覆盖平台新修复记录。

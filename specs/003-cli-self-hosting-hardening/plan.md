# 实施计划

## 模块边界

1. `config/json.ts`：唯一的项目 JSON/JSONC 解析边界；不包含业务 Schema。
2. `config/scanner.ts` 与 `config/project-rule-scanner.ts`：只负责发现和推断，调用统一解析器。
3. `rules/repository.ts`：Rules Schema、生命周期变更和事件追加；不负责扫描候选。
4. `cli/commands/rules.ts`：参数校验和中文反馈；不直接修改文件。
5. `scripts/`：发布 bundle、map 清理和 tarball 白名单；不改变运行时引擎。

## 数据流

文件内容 → parseProjectJson → 未知对象 → 对应 Zod/领域校验 → candidate/active/deprecated → Context resolve。

规则废弃由 Repository 读取并校验当前状态，更新同一 Rules 文档，随后追加 `PROJECT_RULE_DEPRECATED` 事件。不得物理删除规则。

## 迁移策略

- 现有规则文件无需迁移。
- 解析器只扩大兼容输入，不改变输出格式。
- 发布目录继续使用 `dist/release`；本地内部 dist 不进入 npm 白名单。

## 验证

- JSON parser、Rules 生命周期、CLI 命令新增聚焦测试。
- 全套 check/test 连续执行两轮。
- 发布 bundle smoke test 与 `verify:package`。
- `pnpm exec sovei rules validate/status/context` 真实 CLI 验证。

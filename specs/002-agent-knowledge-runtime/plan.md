# 实施计划

## 模块边界

### 1. 红线候选闭环
- scanner.ts：scan() 返回后，CLI 层将 candidateRedlines 写入 redlines-seed.json，含 schemaVersion 和生成时间。
- governance.ts：import 命令扩展，接受 seed 文件路径，逐条调用 addRedline()，跳过已存在 ID。
- 不修改 RedlineScanner 内部逻辑。

### 2. 知识快照
- 新增 context/snapshot.ts：定义 KnowledgeSnapshot 类型（schemaVersion、indexVersion、projectId、sourceRevision、sourceHash、engineVersion、scannerVersion、chunkerVersion、embeddingProvider/model/dimensions、createdAt）。
- 新增 computeSnapshot()：读取知识目录，按 ID 排序，SHA-256 逐条哈希，拼接生成 sourceHash。
- 快照文件：harness/project/knowledge/.snapshot.json。

### 3. 上下文包
- 新增 context/builder.ts：ContextPack 含 required[] 和 suggested[]，每条含 source、id、lifecycle、contentHash、引用说明。
- required：active redlines（从 ChangeControlRepository）、stable rules（从 KnowledgeStore）、当前 Feature 契约（从 ArtifactRepository）。
- suggested：loadByTaskType 后用 searchEntries 本地文本评分，candidate/pending only。
- 无 EmbeddingProvider 时使用本地文本匹配；有 Provider 时扩展 suggested。

### 4. Adapter 能力画像
- 扩展 IDEAdapter 接口：增加 capabilities: { nativeCodeSearch, contextDelivery, toolExecution, mcp, cli, notes }。
- 注册四宿主：Codex（cli=true, mcp=true）、Claude Code（cli=true, mcp=true）、CodeBuddy（cli=true, mcp=false）、Trae（cli=true, mcp=false）。
- 未知能力默认 false，允许项目配置覆盖。

### 5. Provider 契约
- 新增 providers/contracts.ts：EmbeddingProvider 和 LLMProvider 纯接口。
- DI 容器可选注入 TOKENS.EmbeddingProvider / TOKENS.LLMProvider，默认 null。
- 核心逻辑检查 null 时走确定性路径。

### 6. CLI
- context build <feature> --stage <stage> [--adapter <id>] [--query <text>]
- context status
- agent list / agent show <id>

## 状态与数据流

context build -> KnowledgeStore.load() -> ChangeControlRepository.loadRedlines() -> ContextBuilder.build() -> JSON + Markdown output

context status -> computeSnapshot() -> 对比 .snapshot.json -> stale/current

project onboard -> scanner.scan() -> 写 redlines-seed.json -> 提示 import

## 验证方式

每个模块独立 fixture + 完整回归 test + check + build。

## 迁移策略

纯新增，不迁移现有数据。redlines-seed.json 是新文件，不影响 redlines.json。.snapshot.json 是缓存文件。

# Project Memory

## Sovei Engine (packages/sovei-core/)

- TypeScript 已升级到 7.0.2（2026-08-04），package.json specifier 从 ^5.5.0 改为 ^7.0.2，tsc --noEmit 通过。
- v2.5.0 已发布到 npm latest（2026-08-06），包含外部 skills 运行时协议和配置校验、外部 skills 渲染进开发 Agent 上下文两项 feat。
- v2.5.3 已发布到 npm latest（2026-08-06），Feature 014：外部 Skills 运行时层 + 治理层完成。包含 MarkdownSkillAdapter（prompt 注入）、7 个 Matt Pocock skill 已 vendor、SkillInstaller（git/path 安装）、SkillUpgrader（check/diff/upgrade）、9 个新测试。
- 版本递增策略（2026-08-06）：默认发布仅递增 patch 版本号。minor/major bump 需用户显式声明，脚本需加 `-MajorBump` 参数。规则定义在 `harness/project/rules/project.rules.json`（RELEASE_VERSION_POLICY），脚本强制在 `release-sovei.ps1` 步骤 2/6。
- release-sovei.ps1 版本排序 bug 已修复（2026-08-06）：`$remoteVersions` 可能包含嵌套数组导致 `[version]$_` 转换失败，已增加 `ForEach-Object` 展平和 `[string]` 类型过滤。
- workflow.version 语义（Feature 015，2026-08-06）：追踪 WorkflowDefinition 结构变更（stages/stageOrder/maxStagesPerInvocation/allowChaining），不追踪确认门/Skills/CLI/prompt。不持久化到 Feature 事件，不需要 migration。loadConfig 在 mismatch 时 warn 到 stderr。三个版本号区分：workflow.version（工作流结构）vs schemaVersion（持久化数据）vs npm package version（CLI 工具）。
- Learn 阶段知识自动对账（2026-08-06）：`knowledge/reconcile.ts` 在 learn postExecute 中自动解析 learning-report.md 的 `yaml:knowledge-delta` 块，将观察回流到知识库。新观察→candidate，2 证据→pending，3 证据→自动 stable（trust-but-verify，事后可 deprecate 回退）。匹配靠标题相似度+标签重叠+relatedEntryId。CLI 新增 `sovei knowledge review`。learn 产出物新增 `knowledge-delta.md`。

## 外部 Skills 架构

- 三层架构：配置层（012/013 已完成：map/lock/CLI/渲染）、运行时层（014 已完成：MarkdownSkillAdapter 注入）、治理层（014 已完成：install/upgrade/diff）。
- Prompt 注入结构：`权威规则 → 外部 Skill 指令（SKILL.md body）→ Sovei 阶段契约`。外部 skill 失败自动回退 native，CLI 报告实际 skill 来源。
- Skill 映射：grill→grilling, spec→domain-modeling, tasks→to-tickets, implement→implement, converge/verify→code-review, learn→softaworks/lesson-learned。
- Vendor 路径：`harness/vendor/mattpocock/skills/<category>/<skill-name>/SKILL.md`（commit 6acc160）、`harness/vendor/softaworks/skills/<skill-name>/`。
- **learn 阶段三方 skill**（2026-08-07）：接入 `softaworks/agent-toolkit/lesson-learned`（分析 git diff 提取软件工程经验，映射到 se-principles.md 原则目录 + anti-patterns.md 反模式）。MarkdownSkillAdapter 新增可选 `skillDir` 参数，自动内联同目录 `references/*.md`（`loadReferenceFiles()`），prompt 注入自包含。bootstrap.ts 传入 skillDir。
- **learn 融合蒸馏方法论**（2026-08-07）：吸收 `juxt/allium/distill` 的蒸馏判断准则（Would-we-rebuild / Why / Could-it-be-different / Means-vs-Ends / 抽象 checklist），写成 `distillation-guide.md` 参考文件并加入 learn 阶段 prompt 操作第 4 条。learn 注入现含 3 份参考共 15107 字节。
- **首次自动 stable 晋级**（2026-08-07）：`rule-workflow-engine-acecf4c6` 在 016 拿到第 3 个独立 Feature 证据后自动晋级 stable，trust-but-verify 机制首次实际生效。
- **网络约束**（2026-08-07）：此机器 `github.com:443` 连不上（`npx skills add` 走 github.com 全部静默失败），但 `raw.githubusercontent.com` + `api.github.com` + `skills.sh/api` 可用。三方 skill 需通过 raw 通道手动下载 vendor。
- **prepareStage 强制检查**（Feature 016，2026-08-06）：`completeStage` 在调用前检查 `preparedStages` 中是否包含当前阶段，未 prepare 时 throw。`prepareStage` 追加 `STAGE_PREPARED` 事件到事件日志。确保外部 skill 注入不会被绕过。
- 待解决：问题三（drift detection）、问题二（S0 fast-track）、问题四（统一关系模型）。

## 开发环境约定（Windows PowerShell）

- **CLIXML 干扰**：在 PowerShell 运行 sovei/node 时，stdout 可能被 CLIXML 序列化包装（进度条 `<Objs...>`、编码乱码），影响可读性但**不影响命令执行与写文件**。
- **规避方式**（已沉淀，2026-08-07）：
  - 仓库根 `.profile.ps1`：设置 UTF-8 编码 + `$ProgressPreference='SilentlyContinue'` + 提供 `RunRaw <cmd>` 辅助函数（cmd /c 透传，返回干净 stdout）。`source . .\.profile.ps1` 使用。
  - 或在 AI/手动执行时用 `cmd /c "sovei ..."` 透传，或把输出重定向到文件再读。
  - AGENTS.md 末尾有对应说明。
- **Node 14 环境**：本机 nvm settings.txt 已配淘宝镜像（node_mirror/npm_mirror=npmmirror）。nvm install 14.x 时 npm zip 可能下载失败，可用手动解压 node-v14.x-win-x64.zip 验证 Node 本体。

## 待解决问题（2026-08-06 讨论确定）

1. ~~问题一：skills 空壳~~ → 已通过 Feature 014 解决
2. 问题二：小需求触发完整流程 → 需要 S0 快速通道，依赖 drift detection 提供风险分级数据
3. 问题三：普通 AI 会话变更代码后业务红线/地图不可信 → 需要代码变更检测 + 统一关系模型
4. 问题四：Graph Coding → 统一关系模型是 keystone，需区分 structural-fact（可自动覆盖）和 semantic-annotation（不可自动覆盖）


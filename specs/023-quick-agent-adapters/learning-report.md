# Learning Report: 023-quick-agent-adapters

## 观察分类

### 1. 领域级观察：IDE 适配器的指令生成应该是幂等的
**来源**: Feature 023
**证据**: installer 使用 `<!-- sovei-adapter-installed -->` 标记检测已安装状态，避免重复追加。
**建议目标**: candidate

### 2. 领域级观察：共享 contextFile 的适配器需要考虑安装顺序
**来源**: Feature 023
**证据**: codex 和 codebuddy 都用 AGENTS.md，第一个安装的写入标记，第二个跳过。这是正确行为——同一文件不需要重复追加。
**建议目标**: candidate

### 3. 实现细节（不沉淀）：各 IDE 的指令文件路径
具体路径（.claude/commands/、.codebuddy/commands/、.cursorrules）是一次性实现细节。
**建议目标**: rejected

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "IDE 适配器指令安装应幂等——用标记段检测已安装状态"
    type: rule
    content: "为 IDE 生成指令文件时，应使用不可见标记（如 HTML 注释）检测是否已安装，避免重复追加导致指令重复。安装器应幂等——多次安装同一适配器只生成一次。"
    tags: [adapter, installer, idempotent, ide]
    category: candidate
    evidence: "Feature 023 的 installer.ts 使用 <!-- sovei-adapter-installed --> 标记检测，第二次安装自动跳过。"
    relatedEntryId: null

  - title: "共享 contextFile 的适配器安装需考虑顺序——第一个写入标记后后续跳过"
    type: pitfall
    content: "多个适配器可能共享同一 contextFile（如 codex 和 codebuddy 都用 AGENTS.md）。第一个安装的适配器写入安装标记后，后续共享同一文件的适配器会检测到标记而跳过。这是正确行为——同一文件不需要重复追加指令段落。但应在文档中说明这一行为。"
    tags: [adapter, shared-file, install-order, agents-md]
    category: candidate
    evidence: "Feature 023 测试发现 codex 和 codebuddy 共享 AGENTS.md，安装 4 个适配器时只有 3 个成功（codex 被跳过）。"
    relatedEntryId: null
```

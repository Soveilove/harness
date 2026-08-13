---
description: Sovei explore 阶段 — 读懂自然需求 + 探索代码现状 + 判定变更拆分（唯一入口）
---
# Sovei explore
> 读懂自然需求 + 探索代码现状 + 判定变更拆分（唯一入口）
## 参数
- `$ARGUMENTS`：一段**自然语言需求**（一句话/多个问题/PRD 文本/md 文件路径）——不是 Feature ID。
- 必填 `--slug <slug>`：AI 归纳的 kebab-case 主题（2-4 个词），CLI 拼接三位序号得到 `NNN-slug`。
- 可选 `--prd <path>`：PRD 文件路径（内容写入 specs/<feature>/prd.md）。
- 复用/完成既有 Feature 时用 `--feature <NNN-slug>`（配合 `--complete`）。
## 执行步骤
1. **入口（唯一起点）**：把用户的自然语言需求原样作为参数，AI 归纳一个 2-4 词的 kebab slug：
   ```bash
   sovei workflow explore "$ARGUMENTS" --slug <ai-derived-slug>
   # 附带 PRD 文件：
   sovei workflow explore "$ARGUMENTS" --slug <slug> --prd ./docs/prd.md
   ```
   CLI 会扫描 specs/ 分配下一个三位序号、校验 slug 格式、bootstrap Feature、记录需求原文并注入提示契约。
2. **阅读提示契约**：按 explore 提示契约读懂需求 + 探索代码现状 + 厘清关系与风险 + 依赖图判定拆分，产出 exploration.md + sub-change-map.md。
3. **完成阶段**（用上一步 CLI 回显的 Feature ID）：
   ```bash
   sovei workflow explore --feature <NNN-slug> --complete
   ```
4. **拆分执行**（如 sub-change-map.md 建议拆分）：
   ```bash
   sovei feature split <NNN-slug> --json  # 获取提议契约
   sovei feature split <NNN-slug>          # 执行拆分
   ```
## 说明
- 每次只执行一个阶段，`--complete` 后才能推进到下一阶段。
- 产物文件位于 `specs/<feature>/` 目录下。
- explore 是工作流入口阶段，读 PRD + 业务覆盖面，产出需求理解 + 拆分提议。
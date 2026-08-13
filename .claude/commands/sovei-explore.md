---
description: Sovei explore 阶段 — 需求探索 + 业务关联 + 拆分提议（入口）
---
# Sovei explore
> 需求探索 + 业务关联 + 拆分提议（入口）
## 参数
- `$ARGUMENTS`：Feature ID（如 001-my-feature）
- 可选 `--prd <path>`：PRD 文件路径（入口模式，复制到 specs/<feature>/prd.md）
- 可选 `--brief <text>`：内联需求描述（无 PRD 文件时使用）
- 可选 `--complete`：校验产物并完成阶段
## 执行步骤
1. **入口模式**（首次进入 Feature，带 PRD 或 brief）：
   ```bash
   sovei workflow explore $ARGUMENTS --prd ./docs/prd.md
   # 或内联需求：
   sovei workflow explore $ARGUMENTS --brief "需求描述"
   ```
   CLI 会自动 bootstrap Feature + 复制 PRD + 注入提示契约。
2. **阅读提示契约**：按 explore 提示契约读 PRD + business-coverage.md，产出 exploration.md + sub-change-map.md。
3. **完成阶段**：
   ```bash
   sovei workflow explore $ARGUMENTS --complete
   ```
4. **拆分执行**（如 sub-change-map.md 建议拆分）：
   ```bash
   sovei feature split $ARGUMENTS --json  # 获取提议契约
   sovei feature split $ARGUMENTS          # 执行拆分
   ```
## 说明
- 每次只执行一个阶段，`--complete` 后才能推进到下一阶段。
- 产物文件位于 `specs/<feature>/` 目录下。
- explore 是工作流入口阶段，读 PRD + 业务覆盖面，产出需求理解 + 拆分提议。
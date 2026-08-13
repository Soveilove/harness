---
description: Sovei wayfind 阶段 — 依赖分析与路径选择
---
# Sovei wayfind
> 依赖分析与路径选择
## 参数
- `$ARGUMENTS`：Feature ID（如 032-my-feature）
- 可选 `--sub-change <id>`：对子变更执行此阶段
- 可选 `--task <id>`：implement 阶段指定任务
## 执行步骤
1. **准备阶段**（生成提示契约 + 创建缺失模板，不推进状态）：
   ```bash
   sovei workflow wayfind $ARGUMENTS
   ```
2. **阅读提示契约**：CLI 输出的 `── 提示契约 ──` 段包含阶段输入/操作/输出/停止条件。
3. **获取上下文包**（可选，获取红线/规则/知识等治理上下文）：
   ```bash
   sovei context build --stage wayfind $ARGUMENTS
   ```
4. **执行实际工作**：按提示契约填写产物文件（如 spec.md、scope.md 等）。
5. **完成阶段**（校验产物 + 推进状态）：
   ```bash
   sovei workflow wayfind $ARGUMENTS --complete
   ```
## 说明
- 每次只执行一个阶段，`--complete` 后才能推进到下一阶段。
- 产物文件位于 `specs/<feature>/` 目录下。
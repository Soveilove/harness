# 验证证据

> Feature：031-explore-stage
> 阶段：verify

---

## 测试验证

### 全量测试

```
npm test
# tests 214
# pass 214
# fail 0
# duration_ms ~6000
```

- 原 205 个测试全部通过（零回归）
- 新增 9 个 explore 专项测试全部通过

### 新增测试明细（test/explore-stage.test.mjs）

1. **AC-2: stageOrder** — `DEFAULT_WORKFLOW.stageOrder[0] === 'explore'`，长度 13，顺序正确
2. **AC-1: explore 阶段定义** — prepareStage(explore) 产出 prompt 含 PRD + business-coverage + 拆分提议
3. **AC-1: 产物校验** — completeStage(explore) 在 exploration.md 缺失时拒绝
4. **AC-1: 成功路径** — exploration.md + sub-change-map.md 存在时 completeStage 成功，推进到 load
5. **AC-2: 向后兼容** — 老 Feature 无 explore 事件可直接完成 load，explore 被静默跳过
6. **AC-3: --brief 入口** — `workflow explore <feature> --brief` 创建 Feature + 写入 brief.md
7. **AC-3: --prd 入口** — `workflow explore <feature> --prd <path>` 复制 PRD 到 specs/<feature>/prd.md
8. **AC-3: --complete** — explore --complete 在产物缺失时拒绝，产物齐全时成功推进到 load
9. **AC-5: feature split** — explore 完成后（exploration.md 存在）feature split --json 成功

## CLI 功能验证

- `sovei workflow explore <feature> --brief "<描述>"` — 正确创建 Feature + 写入 brief.md + 准备 explore 阶段
- `sovei workflow explore <feature> --prd <path>` — 正确复制 PRD + 准备 explore 阶段
- `sovei workflow explore <feature> --complete` — 正确校验 exploration.md + sub-change-map.md 后完成阶段
- `sovei workflow bootstrap <feature>` — 下一步提示改为 `sovei workflow explore <feature>`

## 向后兼容验证

- 老项目 12 阶段配置仍被接受（config/loader.ts 验证逻辑放宽）
- 老 Feature replay 时无 explore 事件不阻塞（state-machine.ts skippedStages 逻辑）
- feature split --json 在无 exploration.md 时回退到 spec.md + scope.md 前置条件

## IDE 适配器验证

- Claude Code: /sovei-explore slash command 包含 --prd/--brief/--complete 三种用法说明
- CodeBuddy: 同 Claude Code
- Codex: skillPackage 节点表格包含 explore 行
- Trae: 文本指令节点表格包含 explore 行

## 结论

✅ 全部验收标准已验证，214/214 测试通过，零回归。

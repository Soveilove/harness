# Change Manifest — P2-7-quick-overdefense-fix

## Task: TASK-001

### 修改文件
- `src/quick/run.ts`

### 改动摘要
1. `needsEscalation` → `hardEscalation`，移除 `status === 'expanded'` 条件
2. `declaredPaths.length !== 1` → `length === 0`
3. 添加冷启动引导：`!baselineRevision` 时 report 增加引导文本
4. 添加 expanded 上下文警告：`contextWarning` 在 report 中显示

### 验证
- 构建通过 ✅
- 179/179 测试通过 ✅

### 剩余工作
- TASK-002: 测试用例更新（无需改动，现有测试全部通过）
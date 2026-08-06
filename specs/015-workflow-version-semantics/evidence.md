# Feature 015 — Evidence

## 验证项

### V1: TypeScript 编译通过
```
npx tsc --noEmit → 无错误
```

### V2: 新增测试通过
```
node --test test/project.test.mjs
→ ok 10 - loadConfig warns on workflow.version mismatch
→ ok 11 - loadConfig does not warn when workflow.version matches
```

### V3: 全量测试无回归
```
node --test test/*.test.mjs
→ 91 tests, 90 pass, 1 fail
→ 唯一失败：release.test.mjs（dist/release/sovei.js 不存在，预存问题，与本次变更无关）
```

### V4: 红线无违反
- 未修改 event-store / state-machine / workflow-engine 的核心逻辑
- 未修改 CLI 命令签名
- 未修改 schemaVersion
- 未修改持久化数据

### V5: project.config.json 保持一致
- `workflow.version: "2.0.0"` 与 `DEFAULT_WORKFLOW.version: '2.0.0'` 一致
- 无 mismatch warning 触发

### V6: mismatch warning 功能验证
- 用 version '9.9.9' 的 project.config.json 调用 loadConfig → stderr 输出 warning
- 用 version '2.0.0' 的 project.config.json 调用 loadConfig → stderr 无输出

# Coverage Matrix: 023-quick-agent-adapters

| 代码表面 | 变更类型 | 验证方式 |
|---|---|---|
| `adapters/registry.ts` → IDEAdapter 接口 | 扩展 | tsc --noEmit |
| `adapters/registry.ts` → 4 适配器定义 | 补充字段 | 单元测试 |
| `adapters/installer.ts` | 新增 | 单元测试 |
| `cli/commands/adapters.ts` | 新增 | CLI 测试 |
| `cli/commands/project.ts` | 修改 | 现有测试 + 新测试 |
| `src/index.ts` | 导出 | tsc --noEmit |
| `test/adapters-install.test.mjs` | 新增 | 运行测试 |

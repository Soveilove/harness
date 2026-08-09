# Sync Report: 023-quick-agent-adapters

## 同步目标
- `src/adapters/registry.ts` — 修改（接口扩展）
- `src/adapters/installer.ts` — 新增
- `src/cli/commands/adapters.ts` — 新增
- `src/cli/commands/project.ts` — 修改（--adapters 集成）
- `src/cli/index.ts` — 修改（注册命令）
- `src/index.ts` — 修改（导出）
- `test/adapters-install.test.mjs` — 新增
- 知识库：2 条新 candidate 知识

## 命令结果
- `tsc --noEmit`: ✅ 通过
- `pnpm run sovei:build`: ✅ 通过
- `node --test test/*.test.mjs`: ✅ 164/164 通过

## 结论
所有授权目标通过同步后检查。工作流标记为 completed。

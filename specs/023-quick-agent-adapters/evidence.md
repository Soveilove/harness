# Evidence: 023-quick-agent-adapters

## 1. TypeScript 类型检查
**命令**: `npx tsc --noEmit`
**结果**: ✅ 通过

## 2. 全部测试
**命令**: `node --test test/*.test.mjs`
**结果**: ✅ 164/164 通过，0 失败

## 3. 构建验证
**命令**: `pnpm run sovei:build`
**结果**: ✅ 通过

## 4. CLI 验证 — adapters list
**命令**: `node packages/sovei-core/dist/release/sovei.cjs adapters list`
**结果**: ✅ 列出 7 个适配器，含安装状态

## 5. CLI 验证 — adapters install
**命令**: `node packages/sovei-core/dist/release/sovei.cjs adapters install --adapters codebuddy`
**结果**: ✅ 成功安装 CodeBuddy 适配器，生成 AGENTS.md 指令 + .codebuddy/commands/sovei-quick.md

## 6. 幂等验证
**测试**: `installAdapters is idempotent — second install skips`
**结果**: ✅ 第二次安装跳过

## 7. 多适配器安装验证
**测试**: `installAdapters handles multiple adapters at once`
**结果**: ✅ 4 个适配器中 3 个安装（codex 跳过因为 codebuddy 已写入 AGENTS.md 标记）

## 结论
所有验收标准通过验证。

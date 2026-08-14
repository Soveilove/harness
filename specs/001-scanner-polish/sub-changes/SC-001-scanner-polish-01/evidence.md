# 验证证据：SC-001-scanner-polish-01

## 命令

```text
pnpm --dir packages/sovei-core run check
node --test packages/sovei-core/test/scanner-polish.test.mjs
node --test packages/sovei-core/test/*.test.mjs
```

## 结果

- TypeScript check：通过。
- M2 聚合、source 聚合、ID 稳定性测试：通过。
- 全量测试：223/223 通过。

## 验收结论

SC-001 redline-id-dedup 的验收标准全部满足，可以合并。

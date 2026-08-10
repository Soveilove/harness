# 验证证据：024-stale-aware-l1

> 由 Sovei 阶段生成：verify
> Feature：过期感知 L1

## 验证命令与结果

### 1. 类型检查（tsc --noEmit）

```
命令：pnpm run check
结果：通过，0 错误
证据：stdout 无诊断输出
```

### 2. 全量测试

```
命令：node --test test/*.test.mjs
结果：173/173 通过（原 164 + 新增 9）
新增用例：
  - checkStale: no baseline file => not stale
  - checkStale: HEAD unreadable (not a git repo) => not stale even with baseline
  - checkStale: different branch => not stale
  - checkStale: same branch, HEAD === baseline => not stale
  - checkStale: same branch, HEAD advanced past baseline => stale
  - parseSyncBaseline: tolerant of malformed / missing content
  - formatStaleWarning: empty when not stale, meaningful when stale
  - sync stage completion writes a repository-level baseline file
  - sync stage completion skips baseline write when not a git repository
```

### 3. CLI 端到端验证（本地构建产物）

```
命令：node packages/sovei-core/dist/cli/index.js --root . context build --stage load 024-stale-aware-l1 --json
结果：输出含 stale 字段
  "stale": {
    "isStale": false,          // 当前无 sync 基线 → 不提示（AC-4）
    "baselineRevision": null,
    "currentHead": "f84ceca...",
    "recordedAt": null,
    "branch": null
  }
证据：stdout 尾部 JSON，见命令输出（已验证字段存在）
说明：harness 仓库当前无 sync-baseline.json，isStale=false 正确。
```

## 验收标准对照

| 验收标准 | 验证方式 | 结果 |
|---|---|---|
| AC-1 context build 过期提示 | 代码审查 + formatStaleWarning 单测 | ✅ |
| AC-2 context build --json stale 字段 | CLI 端到端（stale 字段存在，isStale=false） | ✅ |
| AC-3 quick 过期提示 + --json | 代码审查 + quick.ts 改动核对 | ✅ |
| AC-4 无基线不提示 | 单测 `no baseline file` + CLI 端到端 | ✅ |
| AC-5 HEAD 读取失败不提示 | 单测 `HEAD unreadable` | ✅ |
| AC-6 HEAD 相同不提示 | 单测 `HEAD === baseline` | ✅ |
| AC-7 sync 记录基线 | 集成测试 `sync stage completion writes baseline` | ✅ |

## 限制

- 未做真实多分支场景验证（依赖具体 git 分支环境），但分支不同→不提示逻辑已由单测覆盖。
- 未在真实项目里跑完整 sync→改代码→context build 的长链路（需人工触发 sync），但各环节已分别由单测 + 集成测试覆盖。

## 结论

- 需求符合性：✅ 全部 7 项验收标准满足。
- 工程质量：✅ 173/173 测试通过，tsc 通过，无 lint 错误。
- **可进入 learn 阶段。**

# Learning Report — 029-feature-summary

> Feature：`sovei feature summary <id>`（P1-2）
> 阶段：learn（观察分类 + 知识提取）

## 观察结果

### O1：跨阶段聚合视图应复用"顶层优先 + _archive/ 回退"的读取模式

- **类型:** 可复用实现模式
- **观察:** archive 会把过程产物（spec/change-manifest/evidence 等）折叠到 `_archive/`。任何需要"还原一个 Feature 完整故事线"的命令（如 summary），必须能同时读顶层持久文件和 `_archive/` 内过程产物。`readArtifact()` 用"顶层优先 + 回退"一步解决。
- **建议:** 后续任何读取 Feature 阶段产物的逻辑，都应采用此回退策略，而非只读顶层。

### O2：summary 与 archive 是互补的"收/聚"对，共享持久白名单

- **类型:** 架构关系观察
- **观察:** archive 负责"收"（折叠过程产物），summary 负责"聚"（生成跨阶段聚合视图）。两者共享 `PERSISTENT_FILES` 白名单——新增的聚合产物（summary.md）必须加入白名单，否则会被 archive 误折叠。
- **建议:** 新增任何"要长期保留的顶层产物"时，需同步检查是否应加入 archive 持久白名单。

### O3：yaml/jsonl 用轻量正则 + 逐行 JSON.parse 解析，无需引第三方库

- **类型:** 实现技巧确认
- **观察:** workflow-state.yaml 只有已知的少量键，用 `match(/^key:\s*(\S+)/m)` 正则即可稳定解析；workflow-events.jsonl 每行一个 JSON，逐行 `JSON.parse` 并过滤坏行即可。保持了零运行时依赖。
- **建议:** 在零依赖约束下，结构化数据解析优先用"正则取已知键 / 逐行 parse"而非引 yaml/jsonl 库。

## knowledge-delta 对账

以下观察作为候选知识回流知识库（由 learn 阶段 reconcile 自动处理）：
- O1（归档回退读取模式）
- O2（archive/summary 互补 + 白名单共享）

## 结论

3 项观察完成分类，O1/O2 为可复用模式，O3 为技巧确认。可进入 sync 阶段。

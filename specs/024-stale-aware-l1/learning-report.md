# 学习报告：024-stale-aware-l1

> 由 Sovei 阶段生成：learn
> Feature：过期感知 L1

## 观察分类

| # | 观察 | 来源 | 适用范围 | 建议目标 |
|---|---|---|---|---|
| O1 | 过期感知的正确粒度是「仓库级粗粒度」（对比 HEAD vs 上次 sync 基线），而非语义级 drift 检测（L3 行业未解，不做） | 本 Feature 设计决策 | 所有项目 | decision → candidate |
| O2 | sync 阶段完成时记录仓库级基线（红线/知识/地图是仓库级概念），不能放单 Feature workflow-state（多 Feature 会互相覆盖） | 本 Feature 实现 | Sovei 引擎设计 | architecture → candidate |
| O3 | 跨分支场景不做过期提示（分支不同视为未知），由红线 branch 隔离（P0-1）处理 | 本 Feature 分支约定 | Sovei 引擎设计 | pitfall → candidate |

## 蒸馏判断

- **O1（过期感知粒度）**：Would we rebuild? 是——重写时会保留「HEAD 变了就提示」。Why? 后续 Feature 关心「治理资产何时不可信」。Could it be different? 是——这是通用原则。Means vs Ends? 沉淀「仓库级粗粒度 + 非阻断提示」的目的，不沉淀具体 git 命令。**沉淀。**
- **O2（sync 记录仓库级基线）**：Would we rebuild? 是——sync 是校准点，必须记录当时 HEAD。Why? 后续任何「过期感知」类功能依赖此基线。Could it be different? 是——基线放仓库级而非 Feature 级是必要设计。**沉淀。**
- **O3（跨分支不提示）**：Would we rebuild? 是——避免跨分支误报。Could it be different? 是——「分支不同视为未知」是通用安全原则。**沉淀。**

---

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "过期感知 L1：对比 HEAD 与上次 sync 基线做仓库级粗粒度检测"
    type: decision
    content: "治理资产（红线/知识/代码地图）过期感知的正确粒度是仓库级粗粒度——对比当前 git HEAD 与上次通过 sovei sync 校准治理资产时的 HEAD，若 HEAD 前进则提示'治理资产可能不可信'。不做语义级 drift 检测（L3，行业未解，OpenSpec/SpecKit/Superpower 都没解决）。提示为非阻断 warning，由用户以当前分支为基线重新校准。"
    tags: [stale, drift, governance, context]
    category: candidate
    evidence: "Feature 024 实现 checkStale 检测 HEAD 变化并提示"
    relatedEntryId: null
  - title: "sync 阶段是仓库级治理基线的校准点，基线须存仓库级而非单 Feature"
    type: architecture
    content: "治理资产（红线/知识/代码地图）是仓库级概念。sync 阶段作为校准点，完成时应记录仓库级基线（当前分支 + HEAD + 时间）到 governance 目录（如 sync-baseline.json），供后续 context build / quick 对比。不能存到单 Feature 的 workflow-state——多 Feature 会互相覆盖，且无法表达'上次校准整个仓库治理资产'的语义。"
    tags: [sync, baseline, governance, architecture]
    category: candidate
    evidence: "Feature 024 在 workflow-engine sync 完成时写 sync-baseline.json"
    relatedEntryId: null
  - title: "跨分支不做过期提示：分支不同视为未知而非过期"
    type: pitfall
    content: "过期感知按分支记录基线。读取时若当前分支与基线分支不同，视为'未知'而非'过期'——不提示。跨分支场景由红线 branch 作用域隔离（P0-1）处理，L1 粗粒度检测不覆盖跨分支合并判断，避免误报。"
    tags: [stale, branch, cross-branch, pitfall]
    category: candidate
    evidence: "Feature 024 checkStale 分支不同返回 isStale=false"
    relatedEntryId: null
```

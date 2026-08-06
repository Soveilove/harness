# 学习报告

> 由 Sovei 阶段生成：learn
> Feature：017-node14-compat — 发布产物支持 Node 14 运行

## 分析范围

- 范围：工作区未提交变更（017-node14-compat 实现）
- 变更核心：发布产物 ESM → CJS，替换 Node 14 不兼容 API，`engines.node` 降到 `>=14.18.0`

## 主导模式（Dominant Pattern）

本次变更的主导模式是**发布产物的运行环境兼容**：为一个面向旧版 Node 运行环境的 CLI 包，把产物形态从 ESM 调整为 CommonJS，并替换/兼容不满足目标版本的运行时 API。这个过程中暴露出一个高价值陷阱：**改产物打包格式会连锁改变基于产物文本的校验逻辑**（H1：内置模块误判 + 字符串文案误匹配导致构建必然失败）。

## 观察分类

### 观察 1（rule）：面向旧 Node 环境的 CLI 包，产物模块形态必须匹配目标环境的模块支持能力
- **来源**：017-node14-compat
- **证据**：公司环境主流是 Node 14，Node 14 对 ESM 支持有严重缺陷（`import.meta` 相关 API 不可用），因此发布产物从 ESM 改为 CommonJS 才能在 Node 14 上直接运行。
- **适用范围**：所有面向旧版 Node 环境分发的 CLI/库包。
- **建议目标**：rule（decision）
- **蒸馏测试**：Would we rebuild? 会——重写 CLI 包时产物形态匹配目标 Node 版本是必然约定。Why? 后续发版/新包会关心。Could it be different? 是，换 ESM/CJS/双形态任何方案都成立，但"产物要匹配目标环境"这一结论不变。Means vs Ends: 沉淀"运行环境决定产物形态"的目的，不沉淀"改 CJS"这个具体手段。

### 观察 2（pitfall）：改变产物打包格式后，依赖产物文本的校验逻辑必须重新审视
- **来源**：017-node14-compat（H1）
- **证据**：build-release.mjs 的 externalModules 校验在产物改 CJS 后必然失败。两层原因：(a) 打包器剥离 `node:` 前缀后，内置模块以无前缀形式出现在产物中，原校验未排除内置模块；(b) 校验正则会误匹配内联第三方代码**字符串文案**里的 `from '...'`（如 commander 错误消息 `from '.command()'`），把文案当外部依赖。
- **适用范围**：所有对打包产物做文本级自检/校验的构建流程。
- **建议目标**：pitfall
- **蒸馏测试**：Would we rebuild? 会——产物自检是发版防线，任何打包格式调整都要重审。Why? 后续改产物形态/打包器都会踩坑。Could it be different? 是，换 esbuild/rollup/webpack 都可能触发同类问题。Means vs Ends: 沉淀"产物格式变更要同步重审文本校验（排除内置模块、规避字符串文案误匹配）"这个陷阱，不沉淀具体正则。

### 观察 3（decision，候选）：跨 Node 大版本兼容时，需在 spec 阶段明确最低支持子版本
- **来源**：017-node14-compat
- **证据**：不同 Node API 有不同最低版本门槛（`.at()` 需 16.6+、`crypto.randomUUID` 需 14.17、`import.meta.dirname` 需 20.11）。目标定在 Node 14 时，需明确到 14.17/14.18 而不是笼统的 14。
- **适用范围**：跨 Node 大版本兼容的 Feature。
- **建议目标**：decision
- **蒸馏测试**：Would we rebuild? 会——跨版本兼容时明确最低子版本是必要约定。Why? 后续类似兼容 Feature 会关心。Could it be different? 是，无论用什么 API，最低子版本决策都必要。Means vs Ends: 沉淀"兼容目标要精确到最低子版本"的原则，不沉淀具体 API 门槛。

## 拒绝模式（不进入知识库）

- 无明确拒绝模式。产物形态改为 CJS 是合理的（ESM 双形态是过度设计），方案选择正确。

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "面向旧 Node 环境的 CLI 包，产物模块形态需匹配目标环境"
    type: decision
    content: "分发 CLI/库包时，发布产物的模块形态（ESM vs CommonJS）必须匹配目标运行环境的模块支持能力。目标环境是旧版 Node（如 Node 14）时，优先用 CommonJS，因其 ESM 支持有严重缺陷（import.meta 相关能力不可用）。运行时 API 也需按最低支持子版本校验（如 .at() 需 16.6+、crypto.randomUUID 需 14.17+）。"
    tags: [release, runtime-compat, module-format, node]
    category: candidate
    evidence: "017-node14-compat 因公司 Node 14 环境，将发布产物从 ESM 改为 CJS，并在 Node 14.21.3 上实测 --version/--help/project status/workflow status 全部通过"
    relatedEntryId: null
  - title: "产物打包格式变更后，基于产物文本的校验必须重新审视"
    type: pitfall
    content: "改变产物打包格式（如 ESM 改 CJS）会连锁改变产物中模块标识符的形式：内置模块的 node: 前缀可能被剥离成无前缀形式，第三方库字符串文案可能被 import/require 检测正则误匹配。所有对产物做文本级自检/校验的流程，在格式调整后都必须重审：正确排除内置模块、规避字符串文案误匹配。"
    tags: [build, packaging, verification, regex]
    category: candidate
    evidence: "017-node14-compat 改 CJS 后 build-release.mjs 的 externalModules 校验因未排除内置模块 + commander 错误文案被误匹配而必然失败，修复后全绿"
    relatedEntryId: null
  - title: "跨 Node 大版本兼容需精确到最低支持子版本"
    type: decision
    content: "做跨 Node 大版本兼容时，engines 声明和方案决策要精确到最低支持的子版本（如 Node 14.17/14.18），而非笼统的大版本，因为不同 Node API 有不同的最低子版本门槛。"
    tags: [node, compatibility, engines]
    category: candidate
    evidence: "017-node14-compat 将 engines.node 定为 >=14.18.0（覆盖 CJS require('node:') 前缀 14.18 + randomUUID 14.17）"
    relatedEntryId: null
```

## 架构债务信号

- 无新增。本次未加剧既有热点，未引入依赖循环，未向候选模块增加非本次需求的责任。

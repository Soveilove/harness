# 决策日志

## D-001 统一项目 JSON 解析

- 类型：可推断决策
- 状态：已决
- 决策：提供一个可复用解析器，依次处理标准 JSON、UTF-8 BOM 和受控 JSONC；Scanner、Rules Repository 与 Rules Adaptation 使用同一实现。
- 理由：当前 ProjectScanner 已暴露 BOM 与 URL 误伤问题，Rules 重复实现 `JSON.parse` 会在 Windows 老项目复现。
- 被拒绝方案：各模块各自添加正则；会继续产生不一致和 URL 误伤。

## D-002 Rules 生命周期闭环

- 类型：事实核实
- 状态：已决
- 决策：补充 `rules deprecate`，要求 reviewer 与 reason，并追加 `PROJECT_RULE_DEPRECATED` 事件。
- 理由：Schema 已声明 deprecated，但 Repository 和 CLI 只有 activate，生命周期不闭合。
- 被拒绝方案：直接删除规则；会丢失审核和历史证据。

## D-003 发布保护边界

- 类型：可推断决策
- 状态：已决
- 决策：本地 `dist` 保留测试所需模块；npm 只发布压缩混淆的 `dist/release/sovei.js`，禁止 map、源码和内部模块进入 tarball。
- 理由：本地 CLI 无法实现密码学保密；单文件、无 map、混淆和白名单能提高逆向成本且保持可验证。
- 被拒绝方案：加密 JavaScript 并随包携带密钥；用户机器必须解密执行，不能形成真实保密。

## D-004 两轮执行约束

- 类型：范围性决策
- 状态：已决
- 决策：第一轮修确定性契约缺口，第二轮仅修验证暴露的回归；本轮不发布。
- 理由：用户已明确授权两轮并要求控制上下文和 token。
- 被拒绝方案：同时重写所有 CLI 英文输出或引入完整跨语言 CodeGraph；超出本轮边界。

## 未决项

无。

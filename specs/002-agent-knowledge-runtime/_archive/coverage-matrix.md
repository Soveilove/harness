# 覆盖矩阵

| 验收项 | 入口 | 状态/IO | 兼容/恢复 | 证据 |
| --- | --- | --- | --- | --- |
| AC-1 红线候选落盘 | project onboard -> scanner | 写 redlines-seed.json | 重复扫描刷新候选，不覆盖 active | 临时文件系统 fixture |
| AC-2 红线导入 | governance redline import | 读 seed -> addRedline 事件 | 未 import 不生效 | governance fixture |
| AC-3 无 Provider context | context build | 确定性 required + 本地 suggested | 无 API Key 完整运行 | context fixture |
| AC-4 required 隔离 | ContextBuilder | active redlines 必须 required | candidate 绝不 required | context 断言 |
| AC-5 stale 判定 | context status | 内容哈希比较 | 重建后恢复 current | snapshot fixture |
| AC-6 adapter 画像 | agent list/show | 四宿主能力差异 | 未知能力保守 false | agent fixture |
| AC-7 回归 | 完整 test | 34+ 测试 | 不回归 | 全量 test |
| AC-8 版本与文档 | package.json + README | 版本号更新 | 不 publish/commit | 文件检查 |

## 必需覆盖适用性

入口/路由：已覆盖。UI 状态：不适用。store/service：已覆盖。参数：已覆盖。API：不适用。鉴权/计费：不适用。异步回调：不适用。成功/失败/清理：已覆盖。历史/详情/重试：已覆盖。兼容入口：已覆盖。测试/文档/运行时：已覆盖。

---
name: figma-component-implementation
description: Implements React components from Figma designs with the repository's design-system, styling, and asset constraints. Use when turning Figma nodes into code, restoring Figma layouts, or building empty states from Figma. Don't use for non-Figma component refactors, service-only tasks, or generic visual tweaks without design input.
---
# Figma Component Implementation

## Use When

- 用户提供 Figma 链接，要求按设计稿实现组件。
- 用户希望先判断 Figma 中哪些图层或模块可以直接复用组件库组件，再继续实现代码。
- 用户要求给出组件库命中依据，以及具体 props 应该如何传递。
- 用户明确说 `Implement this design from Figma`。
- 需要把 Figma 设计转换为本仓库组件。
- 需要根据 Figma 设计补齐空态、卡片、表单区块或局部布局。

## Avoid When

- 任务只是普通 React 组件重构，没有 Figma 设计输入。
- 任务只涉及 services、store、构建脚本或工程配置。
- 任务只是微调颜色、文案或间距，现有代码已足够表达需求。

## Procedures

### Step 1: Read Design And Local Context

1. 先从用户提供的 Figma URL 中提取 `fileKey` 和 `node-id`，禁止猜测节点。
2. 先调用 Figma MCP 的 `get_design_context` 获取设计上下文；结构不清晰时，再结合 `get_metadata` 确认层级、节点名和尺寸。
3. 如果需要判断节点是否来自现有 Figma 组件集，优先读取节点名中的 variant 信息、属性串和组件命名，不要只看视觉样式。
4. 先读取目标文件、同级组件和父组件，确认组件放置位置、目录结构和当前页面的实现习惯。
5. 如果任务本质是 React 组件实现或重构，同时加载 `coding-standards` 和 `vercel-react-best-practices`，不要在本 skill 内重复 React 通用规范。

### Step 2: Match The Active Design System

1. 判断当前上下文使用的是 `@workec/ec-design` 还是 `@workec/ec-mobile-design`，并在整个实现过程中保持一致。
2. 父组件使用哪个设计体系，新增代码就沿用哪个设计体系；不要混用 PC 和移动端组件、变量和样式。
3. 使用组件前，先通过 ec-design MCP 获取组件文档和类型定义，禁止通过旧代码猜 API 或 props。
4. 识别可复用组件时，按以下证据顺序判断：
   - Figma variant 属性从节点/实例/图层名称上获取，第一个属性就是组件名
   - 节点名或组件名是否直接命中组件库名称。
   - Figma variant 属性是否与组件库 props 一一对应。
   - 结构和语义是否与组件库组件一致，例如按钮、输入框、标签、开关、弹窗头部。
   - 颜色、字号、圆角、间距是否落在当前设计体系的默认样式区间内。
5. 如果多个组件都看起来接近，优先选择“props 能完整表达设计差异”的那个组件，而不是选择样式最像但需要大量覆写的组件。
6. 如果不确定组件选型，先搜索现有组件和设计体系能力；仍不明确时再向用户确认，不要臆测。
7. 需要定制组件库组件样式时，优先通过组件暴露的 `className` 或等价样式入口挂接本地 CSS Modules 类名；禁止使用 `:global` 选择器去覆盖组件库内部类名。
8. 如果匹配到了组件库的Modal组件，那么需要结合组件库的ActSession组件使用，弹窗底部的按钮（如确认、取消）应优先使用 ActSession 内部自身的UI实现。

### Step 3: Produce Component Match And Props Mapping

1. 对每个目标图层或模块，先判断是“直接复用组件库组件”、“组件库组件加少量样式补充”，还是“无法复用，需要自定义 DOM”。
2. 一旦命中组件库组件，直接使用组件库中的组件名称输出结论，不要再用泛化描述替代。
3. 输出匹配依据时，至少覆盖以下内容：
   - Figma 节点名或 variant 串。
   - 命中的组件库组件名。
   - Figma 中解析出的原始属性名和属性值。
   - 命中的关键 props 及其值。
   - 哪些 Figma 属性不应该直接传，例如 `none` 往往表示该 prop 不传。
4. Figma variant 值转换为代码 props 时，遵循以下规则：
   - 默认先按 Figma 解析出的属性名和属性值逐项建立映射，不要先按语义脑补成另一套 props。
   - 优先保留与 Figma 一致的同名 prop 映射；如果组件库存在同名 prop，就先以同名 prop 作为默认实现候选，不要跳过这一步直接改写成别的 prop。
   - 只有在“同名 prop 不存在”、“同名 prop 类型不兼容”或“组件文档明确要求另一种映射”时，才允许放弃同名映射改用别的 prop。
   - 如果 Figma 属性名与组件库 prop 名一致，优先直接沿用同名 prop；不要在未说明原因的情况下改名。
   - 如果 Figma 属性名与组件库 prop 名不一致，必须先列出“Figma 属性名 -> 组件库 prop 名”的显式映射，再编码。
   - 如果 Figma 中已经明确给出属性值，例如 `type=input`、`allowClear=false`、`size=m`，默认按原值落地；禁止仅因语义更像搜索框、按钮或标签就私自改成另一枚举值。
   - 对于像 `type=input, prefix=IconSearchO12` 这类实例，不能仅因为它在视觉或业务语义上像搜索框，就把 `type=input` 擅自改成 `type=search`；除非组件库类型定义、文档或运行限制明确要求这样做。
   - 只有当组件库类型定义明确不支持该属性名或属性值时，才允许偏离 Figma 原值；偏离时必须同时说明“Figma 原值、组件库限制、最终替代值”。
   - `true` / `false` 转成布尔值，不保留字符串形式。
   - `none` 优先解释为“不传该属性”，而不是传入字符串 `none`，除非组件类型定义明确要求字符串枚举。
   - 文案、图标、插槽内容分别落到 `children`、`prefix`、`suffix` 等语义化 props。
   - 只有当组件库类型定义里确实存在对应 prop，才允许透传；不存在时改为样式或结构层处理。
   - 当 Figma variant 值为 `"ReactElement"` 时，表示该 prop 可接收任意 React 元素，不限定具体类型；此时仍需检查该元素本身是否命中组件库组件，优先复用，无法命中再按自定义结构实现。
   - 当 Figma variant 值以 `"Icon"` 开头且以字号结尾（如 `"IconSearchO12"`）时，表示这是一个图标，应从 `@workec/ec-svg-icon` 包导入同名导出，例如 `import { IconSearchO12 } from '@workec/ec-svg-icon'`。
5. 如果 Figma 属性名与组件库 prop 名不完全一致，必须在结论里明确写出映射关系，禁止隐式跳转。
6. 如果一个模块由多个组件库组件组合而成，先拆成最小可复用单元，再分别给出组件名和 props。

### Step 4: Extract Only Useful Design Signals

1. 只提取真正影响结果的样式信息：字号、字重、颜色、间距、边框、圆角、布局和背景。
2. 忽略 Figma 参考代码中的 Tailwind class、绝对定位碎片和不符合仓库规范的实现细节。
3. 间距如果出现左右不等、上下不等，按较大的那个值落地；默认视为标注误差，不照着不等值实现。
4. 文本内容、图标、插画和静态资源优先复用仓库已有内容；远程 Figma 资源默认只作对照，不直接接入业务代码。
5. 对已经命中组件库的节点，只补充组件库无法表达的那部分样式差异；禁止为了像素级还原而放弃组件复用。

### Step 5: Implement Code From The Mapping

1. 先用已经确认的组件名和 props 映射实现代码，再处理未命中组件库的剩余结构。
2. 组件库组件能表达的差异一律通过 props 表达，不要先写自定义 DOM 再反向替换。
3. 使用 Less 和 CSS Modules 组织样式，保持与仓库组件结构一致。
4. 样式类名保持简短、语义明确，优先使用单个业务词或短组合，避免生成过长类名。
5. 颜色、背景、边框优先替换为当前设计体系变量，不直接散落十六进制颜色。
6. 默认使用 flex、padding、margin 组织布局；flex 场景下禁止使用 gap，改用子元素间距控制。
7. 删除无业务意义的包裹节点，不为还原 Figma 细节额外增加冗余 DOM。
8. 如果组件库组件已经覆盖交互、禁用态、加载态或图标位，禁止重复造一层相同行为。

### Step 6: Validate Consistency

1. 先验证“组件识别结论”和“最终代码实现”是否一致，避免前面判断可复用，后面却落成自定义结构。
2. 确认生成结果与目标页面的组件风格、交互语义和设计体系一致，而不是机械照搬 Figma。
3. 检查调用点、类型、样式引用和资源引用是否完整联动。
4. 改完后执行静态错误检查，确保没有新增类型、导入或样式错误。
5. 向用户汇报时，优先给出可复用组件结论、props 映射和关键代码片段，再补充少量样式说明。

## Design System References

- PC 端变量文件：`node_modules/@workec/ec-design/lib/styles/variable.less`。
- 移动端变量文件：`node_modules/@workec/ec-mobile-design/lib/styles/variable.less`。
- 组件文档和类型定义优先通过 MCP 获取，不通过历史代码反推。

## Error Handling

- 如果 Figma 结构和现有页面结构冲突，优先服从当前页面的组件边界和设计体系，不要强行 1:1 复刻图层结构。
- 如果 Figma 给出的颜色、字号或间距和设计体系变量接近，优先映射到现有变量，而不是新增离散样式。
- 如果缺少本地资源且设计又明显依赖该资源，先搜索仓库已有素材；仍缺失时再向用户确认，不直接使用远程资源链接。
- 如果现有父组件无法判断使用的是哪套设计体系，先读取更上层调用链，确认后再编码。
- 如果 Figma 节点看起来像组件，但组件库里没有对应类型定义或 prop 无法表达关键状态，明确标记为“不可直接复用”，不要勉强套组件。
- 如果 Figma variant 值和组件库 prop 枚举不一致，先以组件库类型定义为准，再决定是做值映射、样式补充，还是放弃复用。
- 如果 Figma 已经明确给出属性名和属性值，不要因为“语义上更合理”就改写为另一套 prop 或枚举；除非组件库类型定义不支持，并且已经明确记录替代原因。
- 如果设计稿属性名与组件库存在同名 prop，就先验证这个同名 prop 是否可用；没有做这一步验证前，不允许直接采用非同名映射。
- 如果设计稿已经明确给出枚举值，例如 `type=input`，不能只凭占位文案、前缀图标或用途推断，就把它改成另一个枚举值。

## Figma To Code Checklist

1. 是否已读取 Figma 设计上下文，而不是仅凭截图猜结构。
2. 是否已用节点名、variant 和元数据判断哪些图层或模块可复用组件库组件。
3. 是否已读取目标文件、同级组件和父组件，确认上下文实现方式。
4. 是否已判断当前父组件使用的是 `ec-design` 还是 `ec-mobile-design`，并保持一致。
5. 是否已通过 MCP 获取组件文档或类型定义，而不是通过旧代码猜用法。
6. 是否已明确给出组件命中依据、组件名和 props 映射，而不是只说“可以复用按钮”这类模糊结论。
7. 是否已先列出 Figma 原始属性名和属性值，再进行 props 映射，而不是直接按语义改写。
8. 是否已先验证同名 prop 是否存在且类型兼容，而不是跳过同名映射直接使用别的 prop。
9. 是否已把 Figma variant 值正确转换为代码 props，尤其是布尔值、`none`、插槽和文案。
10. 如果最终代码没有沿用 Figma 原始属性名或属性值，是否已明确写出偏离原因和替代值。
11. 是否已引用 React 相关 skill，而不是在本 skill 内重复 React 通用规范。
12. 是否优先复用当前设计体系变量、图标、组件和资源。
13. 是否保持 DOM 和样式精简，没有照搬绝对定位和 Tailwind 片段。
14. 样式类名是否足够短，边距不等时是否按较大值处理。
15. 是否对改动文件和相关调用点做了静态错误检查。
16. 定制组件库组件样式时，是否通过 `className` 或组件提供的样式入口挂接本地类名，而不是使用 `:global` 覆盖内部类名。
17. 如果使用了 Modal 组件，是否已结合 ActSession 组件，并将底部按钮使用 ActSession 内部自身的UI实现，而不是自定义底部区域。


# Tasks: 023-quick-agent-adapters

- [ ] TASK-001: 扩展 IDEAdapter 接口 + 4 适配器补充指令定义
  - **依赖**: 无
  - **文件**: `src/adapters/registry.ts`
  - **范围**: IDEAdapter 新增 `quickChannelDirective` + `slashCommand`；trae/codebuddy/claude/codex 补充
  - **验收**: tsc --noEmit 通过

- [ ] TASK-002: 新增 adapters/installer.ts 安装器
  - **依赖**: TASK-001
  - **文件**: `src/adapters/installer.ts`（新增）
  - **范围**: `installAdapters(adapterIds, projectRoot, storage)` + `checkAdapterInstalled`
  - **验收**: 幂等安装、生成正确文件

- [ ] TASK-003: 新增 cli/commands/adapters.ts CLI
  - **依赖**: TASK-002
  - **文件**: `src/cli/commands/adapters.ts`（新增）
  - **范围**: `adapters list` + `adapters install [--adapters|--all]`
  - **验收**: list 输出正确、install 生成文件

- [ ] TASK-004: project init 集成适配器选择
  - **依赖**: TASK-003
  - **文件**: `src/cli/commands/project.ts`
  - **范围**: `--adapters` 参数 + 调用 installAdapters
  - **验收**: `project init --adapters cc` 生成对应文件

- [ ] TASK-005: 新增测试
  - **依赖**: TASK-001 ~ TASK-004
  - **文件**: `test/adapters-install.test.mjs`（新增）
  - **验收**: 全部通过

- [ ] TASK-006: 构建 + 全量测试验证
  - **依赖**: TASK-005
  - **验收**: tsc + build + 全部测试通过

---
name: ec-build-migration
description: Migrates projects from @workec/ec-miscellany to @workec/ec-build by updating dependencies, scripts, YAML config, and CI commands. Use when upgrading the build tool or replacing ec-miscellany commands. Don't use for routine dependency bumps, non-ec-build tooling changes, or projects that already run on ec-build.
argument-hint: '可选：指定项目名称（默认从 package.json 读取）'
---

# ec-miscellany To ec-build Migration Procedure

## Use When
- 项目需要从 @workec/ec-miscellany 迁移到 @workec/ec-build。
- 需要统一替换 scripts、.ecproj.yml 和 CI 中的旧命令。
- 需要执行一次完整的 ec-build 升级迁移。

## Avoid When
- 项目已经完成 ec-build 迁移。
- 任务只是普通依赖升级，不涉及构建工具替换。
- 任务只调整业务代码，不涉及工程配置。

## Key Differences
- CLI 命令不再需要传递项目名称参数。
- .ecproj.yml 中部分 imports 的 style 值需要从 true 改为 less。
- useCssModule 属性名需要改为 useCssModules。
- 迁移前需要先执行预处理脚本，覆盖根目录 .npmrc，并补齐 .gitignore 中的构建产物忽略项。
- 其余参数如 -m、-p、--useCountLibs 保持兼容。

## Procedures

### Step 1: Run Pre-migration Script
1. 在目标项目根目录执行预处理脚本。
2. 覆盖根目录 .npmrc 为固定内容，不保留旧 registry 配置。
3. 检查 .gitignore 是否包含 build.warning.json 和 build.error.json；如果缺失则追加。

```bash
node .github/skills/ec-build-migration/scripts/prepare-migration.mjs
```

`.npmrc` 目标内容：

```ini
@workec:registry=http://npm.workec.com
registry=https://registry.npmmirror.com
```

### Step 2: Replace Dependencies
1. 移除 @workec/ec-miscellany。
2. 安装 @workec/ec-build。
3. 确认依赖只保留新的构建工具入口。

```bash
yarn remove @workec/ec-miscellany
yarn add @workec/ec-build
```

### Step 3: Rewrite package.json Scripts
1. 检查 package.json 中所有 scripts。
2. 将 ec-miscellany 命令替换为 ec-build。
3. 去掉命令里的项目名称参数，其余参数保持原样。

| 修改前 | 修改后 |
|---|---|
| ec-miscellany dev <项目名> | ec-build dev |
| ec-miscellany build <项目名> | ec-build build |
| ec-miscellany build -m | ec-build build -m |
| ec-miscellany dev <项目名> -p | ec-build dev -p |
| ec-miscellany build <项目名> --useCountLibs | ec-build build --useCountLibs |

```json
"scripts": {
    "start": "ec-build dev",
    "build": "yarn clean && ec-build build",
    "build:all": "yarn clean && ec-build build -m",
    "https": "ec-build dev -p"
}
```

  ### Step 4: Update .ecproj.yml
1. 检查 imports 列表。
2. 对 antd、@workec/ec-crm-components/lib/extra、@workec/ec-crm-components/lib/core 这几个 libraryName，将 style: true 改为 style: less。
3. 如果对应 libraryName 不存在，直接跳过，不要修改其他库的 style 值。
4. 如果存在 useCssModule，将其改为 useCssModules。

```yaml
imports:
    - libraryName: antd
      style: less
    - libraryName: '@workec/ec-crm-components/lib/extra'
      style: less
    - libraryName: '@workec/ec-crm-components/lib/core'
      style: less
```

### Step 5: Update CI Commands
1. 检查 .gitlab-ci.yml 中所有 ec-miscellany 相关命令。
2. 将 npx ec-miscellany 替换为 npx ec-build。
3. 去掉命令中的项目名称参数，保留其余参数。

```yaml
- npx ec-build build
- npx ec-build build --useCountLibs
```

### Step 6: Validate Migration
1. 搜索仓库中是否还有 ec-miscellany 残留字符串。
2. 检查根目录 .npmrc 是否已被覆盖为目标内容。
3. 检查 .gitignore 是否已包含 build.warning.json 和 build.error.json。
4. 本地运行启动命令，确认 ec-build 可以正常执行。
5. 如果 CI 或本地启动失败，再回到 scripts 和 .ecproj.yml 重新核对参数差异。

## Error Handling
- 如果预处理脚本执行失败，优先排查当前目录是否为目标项目根目录，以及 .npmrc、.gitignore 是否有写权限。
- 如果 .gitignore 不存在，允许脚本直接创建并写入缺失条目。
- 如果 package.json scripts 中仍然依赖项目名称参数，直接删除该参数，不要为兼容旧命令保留混合写法。
- 如果 .ecproj.yml 中不存在目标 libraryName，跳过该项，不修改无关 imports。
- 如果迁移后命令无法启动，优先排查旧命令残留、style 配置和 useCssModules 属性名是否遗漏。

## Checklist
1. 预处理脚本是否已在目标项目根目录执行。
2. 根目录 .npmrc 是否已覆盖为指定 registry 配置。
3. .gitignore 是否已包含 build.warning.json 和 build.error.json。
4. @workec/ec-miscellany 是否已从依赖中移除。
5. @workec/ec-build 是否已正确安装。
6. package.json scripts 中是否已无 ec-miscellany 残留。
7. .ecproj.yml 中目标 libraryName 的 style 是否已改为 less。
8. .ecproj.yml 中 useCssModule 是否已改为 useCssModules。
9. .gitlab-ci.yml 中是否已无 ec-miscellany 残留。
10. 本地启动命令是否已通过验证。

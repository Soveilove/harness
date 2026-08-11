# Learning Report: 026-feature-archive

## 观察分类

### 观察 1：排除法归档优于包含法
- **来源 Feature**：026-feature-archive
- **证据**：归档时用"持久文件白名单"排除，其余 .md 全归档。如果用包含法（列出要归档的文件），未来新增阶段产物时需同步更新清单，容易遗漏。排除法天然兼容新阶段。
- **适用范围**：所有涉及"按类型筛选文件"的 CLI 命令
- **建议目标**：candidate
- **类型**：rule

### 观察 2：storage.list() 非递归是天然隔离机制
- **来源 Feature**：026-feature-archive
- **证据**：`storage.list()` 只返回目录下文件不返回子目录，归档到 `_archive/` 的文件不会被 `context build`、`redline-scanner` 等模块扫描到。这个"限制"反而成了隔离归档文件的天然屏障——不需要额外标记或过滤。
- **适用范围**：所有使用 storage.list() 的模块
- **建议目标**：candidate
- **类型**：rule

### 观察 3：MemoryStorage.exists() 只检查文件不检查目录
- **来源 Feature**：026-feature-archive
- **证据**：实现时第一版用 `storage.exists(featurePath)` 检查目录存在，但 `MemoryStorage.exists()` 检查的是 `files.has(path)`，目录不是文件所以返回 false。改用 `storage.list() + storage.isDirectory()` 组合判断。
- **适用范围**：所有需要检查目录是否存在的代码
- **建议目标**：candidate
- **类型**：pitfall

## 蒸馏分析

### Would-we-rebuild？
- 观察 1（排除法）：会。重写时仍会用白名单排除而非黑名单包含。
- 观察 2（非递归隔离）：会。这是架构设计决策，不是实现细节。
- 观察 3（exists 不检查目录）：会。这是 StorageBackend 接口的行为约定。

### Why 测试
- 观察 1：后续 Feature 新增阶段产物时不用改归档代码。
- 观察 2：后续模块用 `storage.list()` 时需知道这个行为，避免意外扫不到子目录文件。
- 观察 3：后续代码检查目录存在时不要用 `exists`。

### Could-it-be-different？
- 观察 1：换实现方式（如用 frontmatter 标记）仍成立——排除法是策略不是手段。
- 观察 2：如果 `list()` 改为递归，归档隔离就失效了——这个知识依赖当前实现。
- 观察 3：如果 `exists()` 改为也检查目录，就不成立了——这是当前实现的 quirk。

### Means vs Ends
- 观察 1：沉淀"排除法优于包含法"原则，不沉淀具体白名单内容。
- 观察 2：沉淀"非递归 list 天然隔离子目录"洞察，不沉淀具体函数签名。
- 观察 3：沉淀"exists 只查文件不查目录"陷阱，不沉淀具体替代方案。

## 知识提取

```yaml:knowledge-delta
observations:
  - title: "排除法归档优于包含法"
    type: rule
    content: "按类型筛选文件时，用白名单排除持久文件、归档其余全部，优于列出要归档的文件清单。排除法天然兼容未来新增文件类型，包含法需同步更新清单。"
    tags: [cli, file-management, archive]
    category: candidate
    evidence: "026-feature-archive 用持久文件白名单排除，其余 .md 全归档到 _archive/，未来新增阶段产物无需改归档代码"
    relatedEntryId: null

  - title: "storage.list() 非递归是子目录的天然隔离机制"
    type: rule
    content: "StorageBackend.list() 只返回目录下文件不返回子目录文件。归档/隔离文件到子目录后，所有用 list() 的模块（context build、redline-scanner 等）天然扫不到它们，无需额外标记或过滤。"
    tags: [storage, isolation, archive]
    category: candidate
    evidence: "026-feature-archive 归档到 _archive/ 的文件不被 context build 和 redline-scanner 扫描，正是因为 list() 非递归"
    relatedEntryId: null

  - title: "StorageBackend.exists() 只检查文件不检查目录"
    type: pitfall
    content: "exists() 检查的是路径是否为已存储文件，目录不是文件所以返回 false。检查目录是否存在应用 list() + isDirectory() 组合，不能用 exists()。"
    tags: [storage, pitfall]
    category: candidate
    evidence: "026-feature-archive 第一版用 storage.exists(featurePath) 检查目录存在，MemoryStorage 和 FilesystemStorage 都返回 false，改用 list + isDirectory 修复"
    relatedEntryId: null
```

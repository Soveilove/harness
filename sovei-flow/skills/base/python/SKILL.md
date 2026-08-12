---
name: python
description: Python 开发规范与最佳实践。当用户开发 Python 项目、使用类型注解、dataclass/Pydantic、asyncio、pytest 测试、pyproject.toml 打包时唤起。
---

# Python 开发技能

## 核心规范

### 类型注解
- 公共函数/类必须标注类型，私有辅助函数可省略。
- 用 `from __future__ import annotations` 推迟注解求值，兼容旧版本。
- 复杂类型用 `typing` / `collections.abc`（`Sequence`、`Mapping`、`Callable`），避免裸 `list`/`dict` 作为对外接口（Python 3.9+ 可用内置泛型）。
- Optional 用 `X | None`（3.10+）或 `Optional[X]`，避免 `Union[X, None]` 冗长写法。
- 静态检查用 mypy / pyright，CI 中 enforce。

### dataclass / Pydantic
- 内部数据结构用 `@dataclass(slots=True)`（3.10+），不可变用 `frozen=True`。
- 对外接口、配置、API 模型用 Pydantic v2（BaseModel，字段验证放 `@field_validator`）。
- ORM 映射用 SQLAlchemy 2.0 typed，或 Pydantic + ORM 插件。
- 序列化优先 `model_dump()` / `model_validate()`，避免手写 `from_dict`。

### asyncio 异步
- I/O 密集任务（HTTP、DB、文件）用 async，CPU 密集任务用进程池或多进程。
- 异步函数以 `async def` 定义，调用处必须 `await`，禁止同步调用异步函数。
- 并发用 `asyncio.gather`（同质任务）或 `asyncio.TaskGroup`（3.11+，异常更友好）。
- HTTP 客户端用 httpx（同步异步双模式），避免已停止维护的 aiohttp 接入新项目。
- 谨慎处理取消：`asyncio.CancelledError` 不应被吞掉，传播或显式处理。

### 测试
- 用 pytest，测试函数 `test_*`，fixture 显式声明作用域。
- mock 用 `unittest.mock.patch` 或 pytest-mock 的 `mocker`，避免 mock 全局状态。
- 异步测试用 `pytest-asyncio`（mode=auto）。
- 覆盖率 `pytest --cov=<pkg> --cov-report=term-missing`，目标 ≥80%。

### 虚拟环境与打包
- 虚拟环境用 `venv`（标准库）或 `uv`（更快），禁止污染系统 Python。
- 依赖锁用 `uv lock` 或 `pip-tools`，提交 lock 文件。
- 打包配置统一放 `pyproject.toml`（PEP 621），构建后端用 hatchling / setuptools。
- 工具链用 `ruff`（lint + format 替代 flake8/black/isort），`ruff format` 统一风格。
- 版本规范：`python_requires = ">=3.10"`，明确下限。

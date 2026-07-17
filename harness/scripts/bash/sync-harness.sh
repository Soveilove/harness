#!/bin/bash
# Harness 同步脚本
# 用法:
#   ./sync-harness.sh push <项目路径>    # 项目 → 中枢（合并方向，需手动确认覆盖）
#   ./sync-harness.sh pull <项目路径>    # 中枢 → 项目（分发方向）
#   ./sync-harness.sh pull-all           # 中枢 → 所有已注册项目
#   ./sync-harness.sh diff <项目路径>    # 对比差异（不复制）
#   ./sync-harness.sh status             # 查看所有项目同步状态

set -euo pipefail

# === 配置 ===
HUB="/e/memory/harness"
CODEBUDDY_HUB="/e/memory/.codebuddy"

# 已注册项目
PROJECTS=(
  "pino-front|/e/project/holopix/pino-front"
  "pino-front-b|/d/holopix/pino-front-b"
  "pino-front-c|/d/holopix/pino-front-c"
)

# 分发时保护的文件（不覆盖）
PROTECTED_FILES=(
  "feature.json"
)

# 要同步的 harness 子目录
HARNESS_DIRS=(
  "memory"
  "spec-harness"
  "codegraph"
  "templates"
  "scripts"
  "workflows"
  "extensions"
  "integrations"
  "ide-adapters"
)

# CodeBuddy 适配文件
CODEBUDDY_FILES=(
  "rules/core-constraints/RULE.mdc"
  "skills/knowledge-loader/SKILL.md"
)

# 跨 IDE 适配文件（分发到项目根目录）
IDE_ADAPTER_FILES=(
  "CLAUDE.md"
  "AGENTS.md"
)

# === 工具函数 ===
log() { echo "[$(date '+%H:%M:%S')] $*"; }

hash_file() {
  if [ -f "$1" ]; then
    md5sum "$1" | cut -d' ' -f1
  else
    echo "MISSING"
  fi
}

# 对比单个文件
diff_file() {
  local src="$1" dst="$2"
  local src_hash dst_hash
  src_hash=$(hash_file "$src")
  dst_hash=$(hash_file "$dst")
  if [ "$src_hash" = "MISSING" ]; then
    echo "  [仅目标] $dst"
    return 2
  elif [ "$dst_hash" = "MISSING" ]; then
    echo "  [仅源]   $src"
    return 1
  elif [ "$src_hash" != "$dst_hash" ]; then
    echo "  [不同]   $(basename "$src")"
    return 1
  else
    return 0
  fi
}

# 同步单个文件（源 → 目标）
sync_file() {
  local src="$1" dst="$2" protected="$3"
  if [ "$protected" = "true" ]; then
    if [ -f "$dst" ]; then
      log "  跳过保护文件: $(basename "$dst")"
      return 0
    fi
  fi
  mkdir -p "$(dirname "$dst")"
  cp "$src" "$dst"
  log "  已复制: $(basename "$src")"
}

# === 命令实现 ===

cmd_diff() {
  local project_path="$1"
  local spec_dir="$project_path/.specify"
  local has_diff=0

  log "对比中枢 → $project_path"

  # Harness 目录
  for dir in "${HARNESS_DIRS[@]}"; do
    if [ ! -d "$HUB/$dir" ]; then
      continue
    fi
    while IFS= read -r -d '' src; do
      rel="${src#$HUB/}"
      dst="$spec_dir/$rel"
      diff_file "$src" "$dst" || has_diff=1
    done < <(find "$HUB/$dir" -type f -name '*.md' -print0 2>/dev/null)
  done

  # CodeBuddy 适配文件
  for cb_file in "${CODEBUDDY_FILES[@]}"; do
    src="$CODEBUDDY_HUB/$cb_file"
    dst="$project_path/.codebuddy/$cb_file"
    diff_file "$src" "$dst" || has_diff=1
  done

  # 跨 IDE 适配文件
  for ide_file in "${IDE_ADAPTER_FILES[@]}"; do
    src="$HUB/ide-adapters/$ide_file"
    dst="$project_path/$ide_file"
    diff_file "$src" "$dst" || has_diff=1
  done

  if [ "$has_diff" = "0" ]; then
    log "✓ 完全一致，无需同步"
  fi
}

cmd_pull() {
  local project_path="$1"
  local spec_dir="$project_path/.specify"

  log "分发: 中枢 → $project_path"

  # 确保目录存在
  mkdir -p "$spec_dir"
  mkdir -p "$project_path/.codebuddy/rules/core-constraints"
  mkdir -p "$project_path/.codebuddy/skills/knowledge-loader"

  # 复制 index.md（可改标题）
  if [ -f "$HUB/index.md" ]; then
    cp "$HUB/index.md" "$spec_dir/index.md"
    log "  已复制: index.md"
  fi

  # 复制 harness 子目录
  for dir in "${HARNESS_DIRS[@]}"; do
    if [ -d "$HUB/$dir" ]; then
      mkdir -p "$spec_dir/$dir"
      cp -r "$HUB/$dir/"* "$spec_dir/$dir/" 2>/dev/null || true
      log "  已复制: $dir/"
    fi
  done

  # 复制配置文件（除 feature.json）
  for f in extensions.yml init-options.json integration.json; do
    if [ -f "$HUB/$f" ]; then
      cp "$HUB/$f" "$spec_dir/$f"
    fi
  done
  # feature.json 只在目标不存在时复制
  if [ -f "$HUB/feature.json" ] && [ ! -f "$spec_dir/feature.json" ]; then
    cp "$HUB/feature.json" "$spec_dir/feature.json"
    log "  已复制: feature.json（新建）"
  else
    log "  跳过保护文件: feature.json"
  fi

  # 复制 CodeBuddy 适配文件
  for cb_file in "${CODEBUDDY_FILES[@]}"; do
    src="$CODEBUDDY_HUB/$cb_file"
    dst="$project_path/.codebuddy/$cb_file"
    if [ -f "$src" ]; then
      mkdir -p "$(dirname "$dst")"
      cp "$src" "$dst"
      log "  已复制: .codebuddy/$cb_file"
    fi
  done

  # 复制跨 IDE 适配文件（到项目根目录）
  for ide_file in "${IDE_ADAPTER_FILES[@]}"; do
    src="$HUB/ide-adapters/$ide_file"
    dst="$project_path/$ide_file"
    if [ -f "$src" ]; then
      cp "$src" "$dst"
      log "  已复制: $ide_file"
    fi
  done

  log "✓ 分发完成: $project_path"
}

cmd_pull_all() {
  log "全量分发到所有项目"
  for entry in "${PROJECTS[@]}"; do
    IFS='|' read -r name path <<< "$entry"
    if [ -d "$path" ]; then
      cmd_pull "$path"
    else
      log "跳过（目录不存在）: $name → $path"
    fi
  done
  log "✓ 全量分发完成"
}

cmd_push() {
  local project_path="$1"
  local spec_dir="$project_path/.specify"

  log "合并: $project_path → 中枢"
  log "⚠️  合并方向需要人工确认，仅显示差异："
  cmd_diff "$project_path"
  log ""
  log "请手动确认后，逐个复制需要合并的文件。"
  log "或使用: cp <项目文件> <中枢文件>"
}

cmd_status() {
  log "项目同步状态"
  log "=========================================="

  for entry in "${PROJECTS[@]}"; do
    IFS='|' read -r name path <<< "$entry"
    if [ ! -d "$path" ]; then
      log "$name: ✗ 目录不存在 ($path)"
      continue
    fi

    local spec_dir="$path/.specify"
    local diff_count=0

    # 检查 harness 目录
    for dir in "${HARNESS_DIRS[@]}"; do
      if [ ! -d "$HUB/$dir" ]; then
        continue
      fi
      while IFS= read -r -d '' src; do
        rel="${src#$HUB/}"
        dst="$spec_dir/$rel"
        src_hash=$(hash_file "$src")
        dst_hash=$(hash_file "$dst")
        if [ "$src_hash" != "$dst_hash" ]; then
          diff_count=$((diff_count + 1))
        fi
      done < <(find "$HUB/$dir" -type f -name '*.md' -print0 2>/dev/null)
    done

    # 检查 CodeBuddy 文件
    for cb_file in "${CODEBUDDY_FILES[@]}"; do
      src="$CODEBUDDY_HUB/$cb_file"
      dst="$path/.codebuddy/$cb_file"
      src_hash=$(hash_file "$src")
      dst_hash=$(hash_file "$dst")
      if [ "$src_hash" != "$dst_hash" ]; then
        diff_count=$((diff_count + 1))
      fi
    done

    # 检查跨 IDE 适配文件
    for ide_file in "${IDE_ADAPTER_FILES[@]}"; do
      src="$HUB/ide-adapters/$ide_file"
      dst="$path/$ide_file"
      src_hash=$(hash_file "$src")
      dst_hash=$(hash_file "$dst")
      if [ "$src_hash" != "$dst_hash" ]; then
        diff_count=$((diff_count + 1))
      fi
    done

    if [ "$diff_count" = "0" ]; then
      log "$name: ✓ 已同步 ($path)"
    else
      log "$name: ✗ $diff_count 个文件不同 ($path)"
    fi
  done
  log "=========================================="
}

# === 主入口 ===

case "${1:-}" in
  push)
    [ -z "${2:-}" ] && { echo "用法: $0 push <项目路径>"; exit 1; }
    cmd_push "$2"
    ;;
  pull)
    [ -z "${2:-}" ] && { echo "用法: $0 pull <项目路径>"; exit 1; }
    cmd_pull "$2"
    ;;
  pull-all)
    cmd_pull_all
    ;;
  diff)
    [ -z "${2:-}" ] && { echo "用法: $0 diff <项目路径>"; exit 1; }
    cmd_diff "$2"
    ;;
  status)
    cmd_status
    ;;
  *)
    echo "Harness 同步脚本"
    echo ""
    echo "用法:"
    echo "  $0 status                 查看所有项目同步状态"
    echo "  $0 diff <项目路径>         对比中枢与项目的差异"
    echo "  $0 pull <项目路径>         中枢 → 项目（分发）"
    echo "  $0 pull-all                中枢 → 所有项目"
    echo "  $0 push <项目路径>         项目 → 中枢（显示差异，需手动确认）"
    echo ""
    echo "已注册项目:"
    for entry in "${PROJECTS[@]}"; do
      IFS='|' read -r name path <<< "$entry"
      echo "  $name → $path"
    done
    exit 0
    ;;
esac

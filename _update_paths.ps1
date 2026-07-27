$utf8 = New-Object System.Text.UTF8Encoding $false

# 需要更新的文件列表
$files = @(
  ".agents\skills\knowledge-loader\SKILL.md",
  ".codebuddy\skills\knowledge-loader\SKILL.md",
  "harness\index.md",
  "harness\workflows\USAGE.md",
  "harness\workflows\systematic-debugging.md",
  "harness\spec-harness\memory-audit-checklist.md",
  "harness\project\project.yaml",
  ".agents\skills\distill\SKILL.md",
  ".agents\skills\distill\references\distill-formats.md",
  ".codebuddy\skills\distill\SKILL.md",
  ".codebuddy\rules\core-constraints\RULE.mdc"
)

foreach ($f in $files) {
  $full = Join-Path "E:\memory" $f
  if (-not (Test-Path $full)) { Write-Output "SKIP: $f"; continue }
  $c = [System.IO.File]::ReadAllText($full, [System.Text.Encoding]::UTF8)
  
  # 料文件路径前缀替换
  $c = $c -replace '<harness-root>/memory/', '<harness-root>/project/memory/'
  $c = $c -replace '<harness-root>/codegraph/', '<harness-root>/project/codegraph/'
  $c = $c -replace 'spec-harness/implementation-rules', 'project/rules/implementation-rules'
  $c = $c -replace 'spec-harness/pending-rules', 'project/rules/pending-rules'
  $c = $c -replace 'spec-harness/rejected-patterns', 'project/rules/rejected-patterns'
  
  # 路径引用替换（反引号包裹的路径）
  $c = $c -replace '``memory/', '``project/memory/'
  $c = $c -replace '``codegraph/', '``project/codegraph/'
  
  # 表格和链接中的路径
  $c = $c -replace '\]memory/', ']project/memory/'
  $c = $c -replace '\]codegraph/', ']project/codegraph/'
  $c = $c -replace '\(memory/', '(project/memory/'
  $c = $c -replace '\(codegraph/', '(project/codegraph/'
  $c = $c -replace '\(spec-harness/implementation', '(project/rules/implementation'
  $c = $c -replace '\(spec-harness/pending', '(project/rules/pending'
  $c = $c -replace '\(spec-harness/rejected', '(project/rules/rejected'
  
  # index.md 加载顺序
  $c = $c -replace 'memory/MEMORY\.md', 'project/memory/MEMORY.md'
  $c = $c -replace 'memory/user-preferences', 'project/memory/user-preferences'
  $c = $c -replace 'memory/constitution', 'project/memory/constitution'
  $c = $c -replace 'memory/vue-pitfalls', 'project/memory/vue-pitfalls'
  $c = $c -replace 'memory/project-architecture', 'project/memory/project-architecture'
  $c = $c -replace 'memory/design-decisions', 'project/memory/design-decisions'
  $c = $c -replace 'memory/design-tools', 'project/memory/design-tools'
  $c = $c -replace 'memory/figma-config', 'project/memory/figma-config'
  $c = $c -replace 'codegraph/index\.md', 'project/codegraph/index.md'
  $c = $c -replace 'codegraph/recent-work', 'project/codegraph/recent-work'
  $c = $c -replace 'codegraph/board-code-map', 'project/codegraph/board-code-map'
  $c = $c -replace 'codegraph/board-video-code-map', 'project/codegraph/board-video-code-map'
  
  # 目录树描述
  $c = $c -replace 'memory/              #', 'project/memory/       #'
  $c = $c -replace 'codegraph/           #', 'project/codegraph/    #'
  $c = $c -replace 'spec-harness/        # stable', 'spec-harness/        # stable/pending/rejected 审计清单(壳)'
  
  # project.yaml 路径
  $c = $c -replace 'path: memory/', 'path: project/memory/'
  $c = $c -replace 'path: codegraph/', 'path: project/codegraph/'
  $c = $c -replace 'path: spec-harness/implementation', 'path: project/rules/implementation'
  $c = $c -replace 'path: spec-harness/rejected', 'path: project/rules/rejected'
  $c = $c -replace 'path: spec-harness/pending', 'path: project/rules/pending'
  
  [System.IO.File]::WriteAllText($full, $c, $utf8)
  Write-Output "OK: $f"
}
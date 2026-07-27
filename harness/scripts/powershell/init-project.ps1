param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,
    [switch]$Blank
)

$ErrorActionPreference = "Stop"
$HarnessRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$MemoryRoot = [System.IO.Path]::GetFullPath((Join-Path $HarnessRoot ".."))

if (-not (Test-Path -LiteralPath $ProjectPath)) {
    throw "Project path does not exist: $ProjectPath"
}
$ProjectPath = [System.IO.Path]::GetFullPath($ProjectPath)
$SpecifyRoot = Join-Path $ProjectPath ".specify"

Write-Output "=== Sovei Harness Init ==="
Write-Output "Project: $ProjectPath"
Write-Output "Mode: $(if ($Blank) { 'Blank (empty project knowledge)' } else { 'Copy (inherit current project knowledge)' })"
Write-Output ""

# Step 1: Create .specify directory
[System.IO.Directory]::CreateDirectory($SpecifyRoot) | Out-Null
Write-Output "[1/4] Created .specify/"

# Step 2: Copy shell files (workflows, templates, scripts, spec-harness, ide-adapters, extensions, integrations)
$ShellDirs = @("workflows", "templates", "scripts", "spec-harness", "extensions", "integrations")
foreach ($dir in $ShellDirs) {
    $src = Join-Path $HarnessRoot $dir
    if (Test-Path -LiteralPath $src) {
        $dst = Join-Path $SpecifyRoot $dir
        Copy-Item -Path $src -Destination $dst -Recurse -Force
        Write-Output "  Copied: $dir/"
    }
}

# Copy root files
foreach ($file in @("index.md", "extensions.yml", "init-options.json", "integration.json")) {
    $src = Join-Path $HarnessRoot $file
    if (Test-Path -LiteralPath $src) {
        Copy-Item -Path $src -Destination (Join-Path $SpecifyRoot $file) -Force
    }
}
Write-Output "[2/4] Shell files copied"

# Step 3: Copy project knowledge (or blank templates)
$ProjectSrc = Join-Path $HarnessRoot "project"
$ProjectDst = Join-Path $SpecifyRoot "project"
[System.IO.Directory]::CreateDirectory($ProjectDst) | Out-Null
[System.IO.Directory]::CreateDirectory((Join-Path $ProjectDst "memory")) | Out-Null
[System.IO.Directory]::CreateDirectory((Join-Path $ProjectDst "codegraph")) | Out-Null
[System.IO.Directory]::CreateDirectory((Join-Path $ProjectDst "rules")) | Out-Null

if ($Blank) {
    # Blank mode: copy only template scaffolding, no actual knowledge content
    $blankYaml = @"
# 项目声明 — 声明当前 harness 绑定的项目
# 修改本文件声明你的项目，然后开始积累知识

project:
  name: new-project
  description: TODO
  tech_stack:
    framework: TODO
    language: TODO
    state: TODO
    build: TODO
    terminal: TODO
  started: $(Get-Date -Format "yyyy-MM-dd")
"@
    [System.IO.File]::WriteAllText((Join-Path $ProjectDst "project.yaml"), $blankYaml, (New-Object System.Text.UTF8Encoding $false))
    Write-Output "[3/4] Blank project.yaml created (fill in your project info)"
} else {
    # Copy mode: inherit current project knowledge
    if (Test-Path -LiteralPath $ProjectSrc) {
        Copy-Item -Path (Join-Path $ProjectSrc "*") -Destination $ProjectDst -Recurse -Force
        Write-Output "[3/4] Project knowledge copied from current project"
    } else {
        Write-Output "[3/4] No project knowledge to copy (new project)"
    }
}

# Step 4: Copy IDE skills and commands
$IdeItems = @(
    @{ Src = ".codebuddy\rules\core-constraints\RULE.mdc"; Dst = ".codebuddy\rules\core-constraints\RULE.mdc" },
    @{ Src = ".codebuddy\skills\knowledge-loader"; Dst = ".codebuddy\skills\knowledge-loader" },
    @{ Src = ".codebuddy\skills\sovei-workflow"; Dst = ".codebuddy\skills\sovei-workflow" },
    @{ Src = ".codebuddy\skills\distill"; Dst = ".codebuddy\skills\distill" },
    @{ Src = ".codebuddy\commands\sovei"; Dst = ".codebuddy\commands\sovei" },
    @{ Src = ".codebuddy\commands\distill.md"; Dst = ".codebuddy\commands\distill.md" },
    @{ Src = ".agents\skills\sovei-workflow"; Dst = ".agents\skills\sovei-workflow" },
    @{ Src = ".agents\skills\knowledge-loader"; Dst = ".agents\skills\knowledge-loader" },
    @{ Src = ".agents\skills\distill"; Dst = ".agents\skills\distill" },
    @{ Src = ".trae\skills\sovei-workflow"; Dst = ".trae\skills\sovei-workflow" },
    @{ Src = ".trae\skills\distill"; Dst = ".trae\skills\distill" }
)
$copied = 0
foreach ($item in $IdeItems) {
    $src = Join-Path $MemoryRoot $item.Src
    if (Test-Path -LiteralPath $src) {
        $dst = Join-Path $ProjectPath $item.Dst
        $dstDir = Split-Path -Parent $dst
        [System.IO.Directory]::CreateDirectory($dstDir) | Out-Null
        Copy-Item -Path $src -Destination $dst -Recurse -Force
        $copied++
    }
}

# Claude commands
$claudeSrc = Join-Path $HarnessRoot "ide-adapters\claude\commands"
if (Test-Path -LiteralPath $claudeSrc) {
    $claudeDst = Join-Path $ProjectPath ".claude\commands"
    [System.IO.Directory]::CreateDirectory($claudeDst) | Out-Null
    Copy-Item -Path "$claudeSrc\*" -Destination $claudeDst -Recurse -Force
    $copied++
}

# IDE adapters
$adapterSrc = Join-Path $HarnessRoot "ide-adapters\sovei-adapters.yaml"
if (Test-Path -LiteralPath $adapterSrc) {
    $adapterDst = Join-Path $SpecifyRoot "ide-adapters\sovei-adapters.yaml"
    [System.IO.Directory]::CreateDirectory((Split-Path -Parent $adapterDst)) | Out-Null
    Copy-Item -Path $adapterSrc -Destination $adapterDst -Force
    $copied++
}
$distillAdapterSrc = Join-Path $HarnessRoot "ide-adapters\distill-adapters.yaml"
if (Test-Path -LiteralPath $distillAdapterSrc) {
    $distillAdapterDst = Join-Path $SpecifyRoot "ide-adapters\distill-adapters.yaml"
    Copy-Item -Path $distillAdapterSrc -Destination $distillAdapterDst -Force
}

# AGENTS.md and CLAUDE.md (protected)
foreach ($adapter in @("AGENTS.md", "CLAUDE.md")) {
    $src = Join-Path $HarnessRoot "ide-adapters\$adapter"
    $dst = Join-Path $ProjectPath $adapter
    if (Test-Path -LiteralPath $src) {
        Copy-Item -Path $src -Destination $dst -Force
    }
}

Write-Output "[4/4] IDE skills and commands copied ($copied items)"
Write-Output ""
Write-Output "=== Init complete ==="
Write-Output "Next steps:"
Write-Output "  1. Edit .specify/project/project.yaml to declare your project"
if ($Blank) {
    Write-Output "  2. Start accumulating knowledge (debug records, specs, etc.)"
    Write-Output "  3. Use `$distill to distill knowledge when ready"
} else {
    Write-Output "  2. Review inherited knowledge in .specify/project/"
    Write-Output "  3. Clear project-specific content that doesn't apply"
}
Write-Output "  4. Use sync-harness.ps1 -Mode Diff to verify alignment"
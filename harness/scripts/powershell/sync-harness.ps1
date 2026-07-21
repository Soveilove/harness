param(
    [ValidateSet("Diff", "Pull", "Status")]
    [string]$Mode = "Status",
    [string]$ProjectPath,
    [string]$HarnessRootOverride
)

$ErrorActionPreference = "Stop"
$LocalHarnessRoot = [System.IO.Path]::GetFullPath((Join-Path $PSScriptRoot "..\.."))
$IsDistributedCopy = (Split-Path -Leaf $LocalHarnessRoot) -eq ".specify"
if (-not [string]::IsNullOrWhiteSpace($HarnessRootOverride)) {
    $HarnessRoot = [System.IO.Path]::GetFullPath($HarnessRootOverride)
} elseif ($IsDistributedCopy -and (Test-Path -LiteralPath "E:\memory\harness\index.md")) {
    $HarnessRoot = "E:\memory\harness"
} else {
    $HarnessRoot = $LocalHarnessRoot
}
$MemoryRoot = [System.IO.Path]::GetFullPath((Join-Path $HarnessRoot ".."))
$HarnessDirectories = @("memory", "spec-harness", "codegraph", "templates", "scripts", "workflows", "extensions", "integrations")
$Projects = @(
    @{ Id = "pino-front-a"; Path = "E:\project\holopix\pino-front" },
    @{ Id = "pino-front-b"; Path = "D:\holopix\pino-front-b" },
    @{ Id = "pino-front-c"; Path = "D:\holopix\pino-front-c" }
)

function Get-Hash([string]$Path) {
    if (-not (Test-Path -LiteralPath $Path)) {
        return $null
    }
    return (Get-FileHash -Algorithm SHA256 -LiteralPath $Path).Hash
}

function Get-HarnessFiles {
    foreach ($directory in $HarnessDirectories) {
        $sourceDirectory = Join-Path $HarnessRoot $directory
        if (-not (Test-Path -LiteralPath $sourceDirectory)) {
            continue
        }
        Get-ChildItem -Recurse -File -LiteralPath $sourceDirectory |
            Where-Object { $_.Extension -ne ".pyc" -and $_.FullName -notmatch "[\\/]__pycache__[\\/]" } |
            ForEach-Object {
            [pscustomobject]@{
                Source = $_.FullName
                RelativePath = $_.FullName.Substring($HarnessRoot.Length + 1)
            }
        }
    }
}

function Get-SyncItems([string]$TargetProject) {
    $specifyRoot = Join-Path $TargetProject ".specify"
    $items = @(
        Get-HarnessFiles | ForEach-Object {
            [pscustomobject]@{ Source = $_.Source; Target = Join-Path $specifyRoot $_.RelativePath; Protected = $false }
        }
    )

    foreach ($file in @("index.md", "extensions.yml", "init-options.json", "integration.json")) {
        $source = Join-Path $HarnessRoot $file
        if (Test-Path -LiteralPath $source) {
            $items += [pscustomobject]@{ Source = $source; Target = Join-Path $specifyRoot $file; Protected = $false }
        }
    }

    $featureSource = Join-Path $HarnessRoot "feature.json"
    if (Test-Path -LiteralPath $featureSource) {
        $items += [pscustomobject]@{ Source = $featureSource; Target = Join-Path $specifyRoot "feature.json"; Protected = $true }
    }

    $codeBuddyItems = @(
        @(".codebuddy\rules\core-constraints\RULE.mdc", ".codebuddy\rules\core-constraints\RULE.mdc"),
        @(".codebuddy\skills\knowledge-loader\SKILL.md", ".codebuddy\skills\knowledge-loader\SKILL.md")
    )
    foreach ($mapping in $codeBuddyItems) {
        $source = Join-Path $MemoryRoot $mapping[0]
        if (Test-Path -LiteralPath $source) {
            $items += [pscustomobject]@{ Source = $source; Target = Join-Path $TargetProject $mapping[1]; Protected = $false }
        }
    }

    foreach ($adapter in @("AGENTS.md", "CLAUDE.md")) {
        $source = Join-Path $HarnessRoot "ide-adapters\$adapter"
        if (Test-Path -LiteralPath $source) {
            $items += [pscustomobject]@{ Source = $source; Target = Join-Path $TargetProject $adapter; Protected = $true }
        }
    }

    $soveiSkillSource = Join-Path $MemoryRoot ".agents\skills\sovei-workflow"
    if (Test-Path -LiteralPath $soveiSkillSource) {
        Get-ChildItem -Recurse -File -LiteralPath $soveiSkillSource |
            Where-Object { $_.Extension -ne ".pyc" -and $_.FullName -notmatch "[\\/]__pycache__[\\/]" } |
            ForEach-Object {
            $relativePath = $_.FullName.Substring($soveiSkillSource.Length + 1)
            $items += [pscustomobject]@{
                Source = $_.FullName
                Target = Join-Path $TargetProject ".agents\skills\sovei-workflow\$relativePath"
                Protected = $false
            }
        }
    }

    $claudeCommandsSource = Join-Path $HarnessRoot "ide-adapters\claude\commands\sovei"
    if (Test-Path -LiteralPath $claudeCommandsSource) {
        Get-ChildItem -Recurse -File -LiteralPath $claudeCommandsSource | ForEach-Object {
            $relativePath = $_.FullName.Substring($claudeCommandsSource.Length + 1)
            $items += [pscustomobject]@{
                Source = $_.FullName
                Target = Join-Path $TargetProject ".claude\commands\sovei\$relativePath"
                Protected = $false
            }
        }
    }

    return $items
}

function Compare-Project([string]$TargetProject) {
    $differences = @()
    foreach ($item in Get-SyncItems $TargetProject) {
        if ($item.Protected -and (Test-Path -LiteralPath $item.Target)) {
            continue
        }
        $sourceHash = Get-Hash $item.Source
        $targetHash = Get-Hash $item.Target
        if ($sourceHash -ne $targetHash) {
            $differences += [pscustomobject]@{
                State = if ($null -eq $targetHash) { "Missing" } else { "Different" }
                Target = $item.Target
            }
        }
    }
    return $differences
}

function Pull-Project([string]$TargetProject) {
    foreach ($item in Get-SyncItems $TargetProject) {
        if ($item.Protected -and (Test-Path -LiteralPath $item.Target)) {
            Write-Output "Protected: $($item.Target)"
            continue
        }
        $targetDirectory = Split-Path -Parent $item.Target
        [System.IO.Directory]::CreateDirectory($targetDirectory) | Out-Null
        Copy-Item -Force -LiteralPath $item.Source -Destination $item.Target
        Write-Output "Synced: $($item.Target)"
    }
}

if ($Mode -in @("Diff", "Pull") -and [string]::IsNullOrWhiteSpace($ProjectPath)) {
    if ($IsDistributedCopy) {
        $ProjectPath = Split-Path -Parent $LocalHarnessRoot
    } else {
        throw "ProjectPath is required for $Mode when running the central Harness script."
    }
}

switch ($Mode) {
    "Diff" {
        $differences = @(Compare-Project ([System.IO.Path]::GetFullPath($ProjectPath)))
        $differences | Format-Table -AutoSize
        Write-Output "Difference count: $($differences.Count)"
    }
    "Pull" {
        Pull-Project ([System.IO.Path]::GetFullPath($ProjectPath))
    }
    "Status" {
        foreach ($project in $Projects) {
            if (-not (Test-Path -LiteralPath $project.Path)) {
                Write-Output "$($project.Id): missing"
                continue
            }
            $count = @(Compare-Project $project.Path).Count
            Write-Output "$($project.Id): $count difference(s)"
        }
    }
}

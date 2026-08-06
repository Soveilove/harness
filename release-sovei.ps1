[CmdletBinding()]
param(
    [string]$ExpectedVersion,
    [ValidateSet('next', 'latest')]
    [string]$Tag = 'next',
    [switch]$AllowDirty,
    [switch]$ValidateOnly,
    [switch]$MajorBump
)

$ErrorActionPreference = 'Stop'
$repoRoot = $PSScriptRoot
$packageDir = Join-Path $repoRoot 'packages/sovei-core'
$packageFile = Join-Path $packageDir 'package.json'

function Invoke-Checked {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Command,
        [Parameter(Mandatory = $true)]
        [string[]]$Arguments
    )

    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) {
        throw "命令执行失败：$Command $($Arguments -join ' ')"
    }
}

if (-not (Test-Path -LiteralPath $packageFile)) {
    throw "未找到包声明：$packageFile"
}

$package = Get-Content -Raw -Encoding UTF8 -LiteralPath $packageFile | ConvertFrom-Json
$packageName = [string]$package.name
$version = [string]$package.version

if ($ExpectedVersion -and $ExpectedVersion -ne $version) {
    throw "版本不一致：期望 $ExpectedVersion，package.json 实际为 $version"
}

if ($Tag -eq 'latest' -and $version -match '-') {
    throw "预发布版本 $version 不允许发布到 latest tag。预发布版本请使用 -Tag next；latest 仅接受稳定版本（不含预发布后缀）。"
}

Write-Host ""
Write-Host "准备发布 $packageName@$version（tag: $Tag）"
Write-Host ""

Push-Location $repoRoot
try {
    $dirty = @(git status --porcelain)
    if ($LASTEXITCODE -ne 0) {
        throw '无法读取 Git 工作区状态。'
    }
    if ($dirty.Count -gt 0 -and -not $AllowDirty) {
        Write-Host '当前存在未提交变更：' -ForegroundColor Yellow
        $dirty | ForEach-Object { Write-Host "  $_" }
        throw '默认禁止从脏工作区发布。确认这些改动属于本次版本后，提交它们；紧急情况下显式使用 -AllowDirty。'
    }
    if ($dirty.Count -gt 0) {
        Write-Host '警告：正在从脏工作区发布。' -ForegroundColor Yellow
    }

    Write-Host '1/6 检查 npm 登录身份'
    Invoke-Checked 'npm' @('whoami')

    Write-Host '2/6 检查远端版本是否已存在'
    $remoteVersionsJson = (& npm view $packageName versions '--json') -join "`n"
    if ($LASTEXITCODE -ne 0) {
        throw "无法查询 $packageName 的远端版本。"
    }
    $remoteVersions = @($remoteVersionsJson | ConvertFrom-Json)
    if ($remoteVersions -contains $version) {
        throw "远端已存在 $packageName@$version，npm 版本不可覆盖。"
    }

    # 版本递增策略：默认只允许 patch bump，minor/major 需显式 -MajorBump
    # 预发布版本（含 '-'）跳过此检查，走 next tag 的独立逻辑。
    if ($version -notmatch '-') {
        $stableRemote = @($remoteVersions | Where-Object { $_ -notmatch '-' } |
            Sort-Object { [version]$_ })
        if ($stableRemote.Count -gt 0) {
            $latestRemote = [string]$stableRemote[-1]
            try {
                $remoteParts = [version]$latestRemote
                $localParts  = [version]$version
            } catch {
                # 版本号非标准三段格式时跳过检查，避免误报
                $remoteParts = $null
            }
            if ($remoteParts) {
                $isMinorBump = $localParts.Minor -gt $remoteParts.Minor -and $localParts.Major -eq $remoteParts.Major
                $isMajorBump = $localParts.Major -gt $remoteParts.Major
                if (($isMinorBump -or $isMajorBump) -and -not $MajorBump) {
                    $bumpType = if ($isMajorBump) { 'major' } else { 'minor' }
                    throw "版本递增策略阻止发布：$latestRemote → $version 是 $bumpType bump。默认只允许 patch 递增。如需发布 $bumpType 版本，请显式使用 -MajorBump 参数。"
                }
                if ($MajorBump -and -not ($isMinorBump -or $isMajorBump)) {
                    Write-Host "提示：已指定 -MajorBump，但 $latestRemote → $version 实际为 patch bump，参数无需使用。" -ForegroundColor DarkGray
                }
            }
        }
    }

    Write-Host '3/6 检查版本递增策略'
    if ($version -match '-') {
        Write-Host "  预发布版本，跳过递增策略检查"
    } elseif ($stableRemote.Count -gt 0 -and $remoteParts) {
        Write-Host "  远端最新稳定版：$latestRemote → 待发布：$version"
        if ($MajorBump -and ($isMinorBump -or $isMajorBump)) {
            $bumpType = if ($isMajorBump) { 'major' } else { 'minor' }
            Write-Host "  已授权 $bumpType bump（-MajorBump）" -ForegroundColor Yellow
        }
    } else {
        Write-Host "  无法比较版本（远端无稳定版或版本格式非标准），跳过检查"
    }

    Write-Host '4/6 运行类型检查'
    Invoke-Checked 'pnpm' @('--dir', 'packages/sovei-core', 'run', 'check')

    Write-Host '5/6 运行完整测试'
    Invoke-Checked 'pnpm' @('--dir', 'packages/sovei-core', 'test')

    Write-Host '6/6 检查发布包白名单'
    Invoke-Checked 'pnpm' @('--dir', 'packages/sovei-core', 'run', 'verify:package')

    if ($ValidateOnly) {
        Write-Host ""
        Write-Host "预检通过：$packageName@$version 尚未发布。"
        exit 0
    }

    # 用 npm publish 而非 pnpm publish:pnpm 10 的 publish 会做 git 检查,且把
    # --no-git-checks 透传给 npm publish 触发 EUSAGE。npm publish 不检查 git。
    # --ignore-scripts 跳过 prepack(上面的 4/5/6 已跑 check+test+verify 兜底)。
    # 使用 ~/.npmrc 中的 Automation token,2FA 下免 OTP,无需交互输入。
    Push-Location $packageDir
    try {
        Invoke-Checked 'npm' @('publish', '--tag', $Tag, '--ignore-scripts')
    } finally {
        Pop-Location
    }

    # npm publish 成功后 registry 元数据传播可能有数秒延迟,立即 npm view 会 404
    # 误报失败(实际已发布)。重试几次,避免假失败。
    $published = $null
    for ($i = 0; $i -lt 6; $i++) {
        $viewOut = & npm view "$packageName@$version" version 2>$null
        if ($LASTEXITCODE -eq 0 -and $viewOut -and $viewOut.Trim() -eq $version) {
            $published = $version
            break
        }
        Start-Sleep -Seconds 5
    }
    if ($published -ne $version) {
        throw "发布命令已结束,但远端版本校验失败(可能仍在传播)。稍后用 'npm view $packageName@$version version' 确认。"
    }

    Write-Host ""
    Write-Host "发布完成：$packageName@$version（tag: $Tag）" -ForegroundColor Green
}
finally {
    Pop-Location
}

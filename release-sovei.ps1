[CmdletBinding()]
param(
    [string]$ExpectedVersion,
    [ValidateSet('next', 'latest')]
    [string]$Tag = 'next',
    [switch]$AllowDirty,
    [switch]$ValidateOnly
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

    Write-Host '1/5 检查 npm 登录身份'
    Invoke-Checked 'npm' @('whoami')

    Write-Host '2/5 检查远端版本是否已存在'
    $remoteVersionsJson = (& npm view $packageName versions '--json') -join "`n"
    if ($LASTEXITCODE -ne 0) {
        throw "无法查询 $packageName 的远端版本。"
    }
    $remoteVersions = @($remoteVersionsJson | ConvertFrom-Json)
    if ($remoteVersions -contains $version) {
        throw "远端已存在 $packageName@$version，npm 版本不可覆盖。"
    }

    Write-Host '3/5 运行类型检查'
    Invoke-Checked 'pnpm' @('--dir', 'packages/sovei-core', 'run', 'check')

    Write-Host '4/5 运行完整测试'
    Invoke-Checked 'pnpm' @('--dir', 'packages/sovei-core', 'test')

    Write-Host '5/5 检查发布包白名单'
    Invoke-Checked 'pnpm' @('--dir', 'packages/sovei-core', 'run', 'verify:package')

    if ($ValidateOnly) {
        Write-Host ""
        Write-Host "预检通过：$packageName@$version 尚未发布。"
        exit 0
    }

    $otp = Read-Host '请输入 npm Authenticator 当前的 6 位 OTP'
    if ($otp -notmatch '^\d{6}$') {
        throw 'OTP 格式无效，必须是 6 位数字。'
    }

    # 用 npm publish 而非 pnpm publish:pnpm 10 的 publish 会做 git 检查,且把
    # --no-git-checks 透传给 npm publish 触发 EUSAGE。npm publish 不检查 git。
    # --ignore-scripts 跳过 prepack(上面的 3/4/5 已跑 check+test+verify 兜底)。
    Push-Location $packageDir
    try {
        Invoke-Checked 'npm' @('publish', '--tag', $Tag, '--ignore-scripts', '--otp', $otp)
    } finally {
        Pop-Location
    }

    $published = (& npm view "$packageName@$version" version).Trim()
    if ($LASTEXITCODE -ne 0 -or $published -ne $version) {
        throw '发布命令已结束，但远端版本校验失败。'
    }

    Write-Host ""
    Write-Host "发布完成：$packageName@$version（tag: $Tag）" -ForegroundColor Green
}
finally {
    Pop-Location
}

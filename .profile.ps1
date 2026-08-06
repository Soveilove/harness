# ============================================================
# harness 开发环境 PowerShell 配置
#
# 作用：解决在 PowerShell 中运行 Node/sovei 等外部程序时
#       stdout 被 CLIXML 序列化、进度条噪音、编码混乱等问题。
#
# 使用方式：
#   在仓库根执行  . .\.profile.ps1   (点号+空格，表示 source)
#   或写入你的 $PROFILE：
#      Add-Content $PROFILE ". d:\project\harness\.profile.ps1"
# ============================================================

# 1) 统一 UTF-8 编码，避免 PowerShell 按系统代码页(GBK)读取 UTF-8 输出导致乱码
try {
  [Console]::InputEncoding  = [System.Text.Encoding]::UTF8
  [Console]::OutputEncoding = [System.Text.Encoding]::UTF8
} catch { Write-Warning '无法设置控制台 UTF-8 编码' }

# 2) 关闭进度流，消除 Invoke-WebRequest / Expand-Archive 等命令的
#    CLIXML 进度条噪音（外部程序输出可读性差的主要来源）
$ProgressPreference = 'SilentlyContinue'

# 3) 让 Git 也使用 UTF-8 输出，避免中文路径/日志乱码
try { $env:LC_ALL = 'en_US.UTF-8' } catch {}

# 4) 辅助函数：以"透传"方式运行外部程序，绕开 PowerShell 的
#    CLIXML 序列化包装，直接看到干净输出。
#    用法：  RunRaw sovei workflow status 017-node14-compat
function RunRaw {
  <#
    .SYNOPSIS
      以 cmd /c 透传方式运行命令，返回原始 stdout/stderr，避免 CLIXML 干扰。
  #>
  param([Parameter(Mandatory = $true)][string]$Command)
  cmd /c $Command
  return $LASTEXITCODE
}

# 推送代码到 GitHub Pages
# 用法：先开启 VPN/Clash（确保 7890 代理可用），再运行：
#   powershell -ExecutionPolicy Bypass -File scripts/push-github.ps1

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot\..

Write-Host "检查代理 7890..." -ForegroundColor Cyan
$proxyOk = (Test-NetConnection 127.0.0.1 -Port 7890 -WarningAction SilentlyContinue).TcpTestSucceeded
if (-not $proxyOk) {
    Write-Host "代理未运行！请先打开 Clash/VPN，确保 127.0.0.1:7890 可用。" -ForegroundColor Red
    Write-Host "不要清空 git 代理（不要用 -c http.proxy=）。" -ForegroundColor Yellow
    exit 1
}

Write-Host "代理正常，开始推送..." -ForegroundColor Green

$pending = git status --porcelain
if ($pending) {
    git add .
    git -c user.name="charlie4399828-cpu" -c user.email="charlie4399828-cpu@users.noreply.github.com" `
        commit -m "更新昌隆茶业官网"
}

git push origin main
if ($LASTEXITCODE -eq 0) {
    Write-Host "推送成功！约 1 分钟后访问 GitHub Pages。" -ForegroundColor Green
} else {
    Write-Host "推送失败，请检查网络或 VPN。" -ForegroundColor Red
    exit 1
}

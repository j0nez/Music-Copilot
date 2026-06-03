param(
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$Electron
)

$rootDir = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$backendDir = Join-Path $rootDir "backend"
$frontendDir = Join-Path $rootDir "frontend"

$env:PYTHONPATH = $rootDir

function Start-Backend {
    Write-Host "Starting backend..." -ForegroundColor Green
    Set-Location -LiteralPath $backendDir
    $venvPython = Join-Path $backendDir "venv\Scripts\python.exe"
    & $venvPython -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
}

function Start-Frontend {
    Write-Host "Starting frontend..." -ForegroundColor Green
    Set-Location -LiteralPath $frontendDir
    npm run dev
}

function Start-Electron {
    Write-Host "Starting Electron + Vite..." -ForegroundColor Green
    Set-Location -LiteralPath $frontendDir
    npm run dev:electron
}

if ($Electron) {
    Start-Electron
} elseif ($FrontendOnly) {
    Start-Frontend
} elseif ($BackendOnly) {
    Start-Backend
} else {
    # Start both
    $backendJob = Start-Job -ScriptBlock {
        param($backendDir, $rootDir)
        $env:PYTHONPATH = $rootDir
        Set-Location -LiteralPath $backendDir
        & "venv/Scripts/python.exe" -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
    } -ArgumentList $backendDir, $rootDir

    try {
        Start-Frontend
    } finally {
        Stop-Job $backendJob -ErrorAction SilentlyContinue
        Remove-Job $backendJob -ErrorAction SilentlyContinue
    }
}

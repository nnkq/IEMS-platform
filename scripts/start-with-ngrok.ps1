<#
Usage: run this from the repository root in PowerShell.
Prereqs: ngrok in PATH, Python/Node/NPM installed.

This script will:
- start ngrok forwarding to port 5000 (backend)
- read the https public URL from ngrok API
- update backend/.env and frontend/.env with NGROK_URL / CLIENT_URL / VITE_PUBLIC_APP_URL
- export NGROK_URL for the AI-DIAGNOSIS process and start it
- start backend (node server.js) and frontend (npm run dev) in separate processes
#>

Set-StrictMode -Version Latest

$root = (Get-Location).Path
Write-Host "Repo root: $root"

function Update-Or-Append($filePath, $key, $value) {
    if (-Not (Test-Path $filePath)) { New-Item -Path $filePath -ItemType File -Force | Out-Null }
    $content = Get-Content $filePath -Raw
    if ($content -match "(?m)^$([regex]::Escape($key))=") {
        $new = ($content -replace "(?m)^$([regex]::Escape($key))=.*", "$key=$value")
        $new | Set-Content $filePath -Force
    } else {
        Add-Content $filePath "`n$key=$value"
    }
}

Write-Host "Starting ngrok (http 5000)..."
$ngrokProc = Start-Process -FilePath ngrok -ArgumentList "http 5000" -PassThru

Write-Host "Waiting for ngrok to initialize..."
Start-Sleep -Seconds 2

$publicUrl = $null
for ($i=0; $i -lt 30; $i++) {
    try {
        $t = Invoke-RestMethod -Uri http://127.0.0.1:4040/api/tunnels -ErrorAction Stop
        if ($t.tunnels) {
            $https = $t.tunnels | Where-Object { $_.proto -eq 'https' } | Select-Object -First 1
            if ($https -and $https.public_url) { $publicUrl = $https.public_url; break }
        }
    } catch {
        # ignore
    }
    Start-Sleep -Seconds 1
}

if (-not $publicUrl) {
    Write-Error "Could not find ngrok public URL. Ensure ngrok is installed and allowed to start. Check http://127.0.0.1:4040"
    exit 1
}

Write-Host "ngrok public URL: $publicUrl"

# Update env files
$backendEnv = Join-Path $root 'backend\.env'
$frontendEnv = Join-Path $root 'frontend\.env'

Write-Host "Updating $backendEnv and $frontendEnv"
Update-Or-Append $backendEnv 'NGROK_URL' $publicUrl
Update-Or-Append $backendEnv 'CLIENT_URL' $publicUrl
Update-Or-Append $backendEnv 'PUBLIC_CLIENT_URL' $publicUrl

# Frontend needs both the public app URL and the backend API URL (same ngrok URL)
Update-Or-Append $frontendEnv 'VITE_PUBLIC_APP_URL' $publicUrl
Update-Or-Append $frontendEnv 'VITE_BACKEND_URL' $publicUrl

# Export NGROK_URL for AI-DIAGNOSIS process
$env:NGROK_URL = $publicUrl
$env:PYTHONIOENCODING = 'utf-8'
$env:PYTHONUTF8 = '1'

Write-Host "Starting AI-DIAGNOSIS (Python)"
Start-Process -FilePath python -ArgumentList 'src/app.py' -WorkingDirectory (Join-Path $root 'AI-DIAGNOSIS') -NoNewWindow -PassThru | Out-Null

Write-Host "Starting backend (node server.js)"
Start-Process -FilePath node -ArgumentList 'server.js' -WorkingDirectory (Join-Path $root 'backend') -NoNewWindow -PassThru | Out-Null

Write-Host "Starting frontend (npm run dev)"
Start-Process -FilePath npm -ArgumentList 'run','dev' -WorkingDirectory (Join-Path $root 'frontend') -NoNewWindow -PassThru | Out-Null

Write-Host "All processes started. ngrok URL: $publicUrl"
Write-Host "Note: Check individual terminals/process windows for logs. If ngrok uses a different URL, re-run this script."

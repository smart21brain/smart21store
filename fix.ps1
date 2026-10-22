param([string]$Project)
$ErrorActionPreference = 'Stop'
Set-Location $Project
if (-not (Test-Path 'wrangler.toml')) {
  Write-Host ''
  Write-Host 'ERROR: wrangler.toml not found in:' $Project -ForegroundColor Red
  Write-Host 'Open the terminal INSIDE your project folder (where wrangler.toml is) and run s21-fix\fix-and-push.bat again.'
  exit 1
}
$here = Split-Path -Parent $MyInvocation.MyCommand.Path
$utf8 = New-Object System.Text.UTF8Encoding($false)

# 1. Put the known-good worker files back (raw byte copy, UTF-8)
if (-not (Test-Path 'src')) { New-Item -ItemType Directory -Path 'src' | Out-Null }
Copy-Item (Join-Path $here 'clean\index.js') 'src\index.js' -Force
Copy-Item (Join-Path $here 'clean\store-api.js') 'src\store-api.js' -Force
Write-Host 'Restored src\index.js and src\store-api.js'

# 2. Convert any other UTF-16 / NUL-byte text file to plain UTF-8
$files = Get-ChildItem -Recurse -File -Include *.js,*.mjs,*.json,*.toml,*.sql,*.html,*.md,*.txt |
  Where-Object { $_.FullName -notmatch '\\node_modules\\|\\\.git\\|\\sample-files\\|\\s21-fix\\|\\\.wrangler\\' }
foreach ($f in $files) {
  $b = [System.IO.File]::ReadAllBytes($f.FullName)
  if ($b.Length -eq 0) { Write-Host ('EMPTY FILE (check it): ' + $f.FullName) -ForegroundColor Yellow; continue }
  $text = $null
  if ($b.Length -ge 2 -and $b[0] -eq 0xFF -and $b[1] -eq 0xFE) { $text = [System.Text.Encoding]::Unicode.GetString($b, 2, $b.Length - 2) }
  elseif ($b.Length -ge 2 -and $b[0] -eq 0xFE -and $b[1] -eq 0xFF) { $text = [System.Text.Encoding]::BigEndianUnicode.GetString($b, 2, $b.Length - 2) }
  elseif ($b -contains 0) {
    if ($b.Length -gt 1 -and $b[1] -eq 0) { $text = [System.Text.Encoding]::Unicode.GetString($b) }
    else { $text = [System.Text.Encoding]::BigEndianUnicode.GetString($b) }
  }
  elseif ($b.Length -ge 3 -and $b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) { $text = [System.Text.Encoding]::UTF8.GetString($b, 3, $b.Length - 3) }
  if ($null -ne $text) {
    [System.IO.File]::WriteAllText($f.FullName, $text, $utf8)
    Write-Host ('Converted to UTF-8: ' + $f.FullName)
  }
}

# 3. Warnings for things the build still needs
if (-not (Test-Path 'src\lib\auth.js')) {
  Write-Host ''
  Write-Host 'WARNING: src\lib\auth.js is missing. Copy it from your Smart21Brain project into src\lib\ before the build can pass.' -ForegroundColor Yellow
}
if (Select-String -Path 'wrangler.toml' -Pattern 'PASTE-ID' -Quiet) {
  Write-Host ''
  Write-Host 'WARNING: wrangler.toml still has the PASTE-ID placeholder. Put your real database_id there.' -ForegroundColor Yellow
}

# 4. Commit and push
Write-Host ''
Write-Host 'Pushing to GitHub...'
git add -A .
git commit -m "Fix worker files encoding (UTF-8)"
if ($LASTEXITCODE -ne 0) { Write-Host 'Nothing new to commit (or commit failed) - trying push anyway.' }
git push
if ($LASTEXITCODE -ne 0) { Write-Host 'PUSH FAILED - copy the message above and send it to me.' -ForegroundColor Red; exit 1 }
Write-Host ''
Write-Host 'DONE. Cloudflare will rebuild now.' -ForegroundColor Green

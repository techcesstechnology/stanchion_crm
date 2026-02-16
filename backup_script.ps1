$source = Get-Location
$parent = (Get-Item $source).Parent.FullName
$temp = Join-Path $parent "Stanchion_CRM_Template_Export"
$zip = Join-Path $parent "Stanchion_CRM_Backup.zip"

Write-Host "Preparing backup..."
Write-Host "Source: $source"
Write-Host "Temporary Dir: $temp"

# Clean previous runs
if (Test-Path $temp) { Remove-Item $temp -Recurse -Force }

# Copy files using Robocopy (Fast and supports exclusions)
# Excludes: node_modules, .git (history), .firebase (cache), dist (build), .gemini (agent)
# Exclude File: .firebaserc (project binding)
Write-Host "Copying files..."
$p = Start-Process robocopy -ArgumentList "`"$source`" `"$temp`" /E /XD node_modules .git .firebase dist .gemini /XF .firebaserc" -Wait -PassThru -NoNewWindow

# Robocopy exit codes 0-7 are success variants
if ($p.ExitCode -gt 7) { 
    Write-Error "Robocopy failed with code $($p.ExitCode)"
    exit 1
}

# Compress
Write-Host "Compressing to ZIP..."
Compress-Archive -Path "$temp\*" -DestinationPath $zip -Force

# Cleanup
Remove-Item $temp -Recurse -Force
Remove-Item ".\backup_script.ps1" -ErrorAction SilentlyContinue

Write-Host "DONE. Backup created at: $zip"

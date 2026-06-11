# deploy_ml.ps1
# WearYourStyle ML Server Hugging Face Spaces Deployer

Write-Host ">>> WearYourStyle: Hugging Face ML Server Deployer <<<" -ForegroundColor Cyan

# Choose authentication method
Write-Host "Select Authentication Method:" -ForegroundColor Yellow
Write-Host "1) SSH Key (Recommended if set up)"
Write-Host "2) Access Token (HTTPS)"
$authChoice = Read-Host -Prompt "Enter choice [1 or 2, default: 1]"

if ([string]::IsNullOrWhiteSpace($authChoice)) {
    $authChoice = "1"
}

$repoUrl = ""
if ($authChoice -eq "1") {
    $repoUrl = "git@hf.co:spaces/Bharathganga/Wear"
    Write-Host "Using SSH authentication: $repoUrl" -ForegroundColor Gray
} else {
    $token = Read-Host -Prompt "Enter your Hugging Face Access Token (with WRITE permissions)"
    if ([string]::IsNullOrWhiteSpace($token)) {
        Write-Host "❌ Error: Token cannot be empty." -ForegroundColor Red
        exit 1
    }
    $repoUrl = "https://Bharathganga:$token@huggingface.co/spaces/Bharathganga/Wear"
}

$tempDir = Join-Path $PSScriptRoot "hf_deploy_temp"
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}

# 2. Clone Hugging Face Space repository
Write-Host "`n[1/4] Cloning Hugging Face Space repository..." -ForegroundColor Yellow
git clone $repoUrl $tempDir

if (-not (Test-Path $tempDir)) {
    Write-Host "❌ Error: Failed to clone Hugging Face Space. Double check your token and Space visibility." -ForegroundColor Red
    exit 1
}

# 3. Copy MlServer files to target folder
Write-Host "`n[2/4] Copying MlServer files..." -ForegroundColor Yellow
$mlServerDir = Join-Path $PSScriptRoot "MlServer"

# Create a clean target copy (excluding environment files, caches, large binary models, and test uploads)
Get-ChildItem -Path $mlServerDir -Exclude "venv", "__pycache__", ".git", "*.task", "*.tflite", "uploads", "test_output.png" | ForEach-Object {
    Copy-Item -Path $_.FullName -Destination $tempDir -Recurse -Force
}

# 4. Commit and Push to Hugging Face
Write-Host "`n[3/4] Committing and pushing changes to Hugging Face..." -ForegroundColor Yellow
Push-Location $tempDir

# Ensure a local git user is defined for the commit
git config user.name "Bharath Ganga"
git config user.email "bharathganga7@gmail.com"

git add .
git commit -m "deploy: update ML Server files"
git push origin main

Pop-Location

# 5. Cleanup
Write-Host "`n[4/4] Cleaning up temporary files..." -ForegroundColor Yellow
if (Test-Path $tempDir) {
    Remove-Item -Recurse -Force $tempDir
}

Write-Host "`n✅ Success! Deployed to: https://huggingface.co/spaces/Bharathganga/Wear" -ForegroundColor Green
Write-Host "Wait a few minutes for the container build to finish on Hugging Face Spaces." -ForegroundColor Gray

# Setup MCP Servers for Claude Desktop
# This script configures Puppeteer + Playwright MCP servers for browser automation

$configPath = "$env:APPDATA\Claude\claude_desktop_config.json"
$configDir = Split-Path $configPath

Write-Host "Setting up MCP configuration..." -ForegroundColor Cyan
Write-Host "Config path: $configPath" -ForegroundColor Gray

# Create directory if it doesn't exist
if (-not (Test-Path $configDir)) {
    Write-Host "Creating config directory..." -ForegroundColor Yellow
    New-Item -ItemType Directory -Path $configDir -Force | Out-Null
}

# Check if config file exists
$existingConfig = $null
if (Test-Path $configPath) {
    Write-Host "Existing config found, merging..." -ForegroundColor Yellow
    $existingConfig = Get-Content $configPath -Raw | ConvertFrom-Json
}

# Create or update config
if ($existingConfig) {
    # Merge with existing config
    if (-not $existingConfig.mcpServers) {
        $existingConfig | Add-Member -MemberType NoteProperty -Name "mcpServers" -Value @{}
    }

    $existingConfig.mcpServers | Add-Member -MemberType NoteProperty -Name "puppeteer" -Value @{
        command = "npx"
        args = @("-y", "@modelcontextprotocol/server-puppeteer")
    } -Force

    $existingConfig.mcpServers | Add-Member -MemberType NoteProperty -Name "playwright" -Value @{
        command = "npx"
        args = @("-y", "@executeautomation/playwright-mcp-server")
    } -Force

    $configJson = $existingConfig | ConvertTo-Json -Depth 10
} else {
    # Create new config
    $config = @{
        mcpServers = @{
            puppeteer = @{
                command = "npx"
                args = @("-y", "@modelcontextprotocol/server-puppeteer")
            }
            playwright = @{
                command = "npx"
                args = @("-y", "@executeautomation/playwright-mcp-server")
            }
        }
    }

    $configJson = $config | ConvertTo-Json -Depth 10
}

# Write config
$configJson | Out-File -FilePath $configPath -Encoding UTF8 -Force

Write-Host ""
Write-Host "MCP configuration created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration details:" -ForegroundColor Cyan
Write-Host "   Servers: Puppeteer + Playwright" -ForegroundColor Gray
Write-Host "   Location: $configPath" -ForegroundColor Gray
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor Yellow
Write-Host "   1. Restart Claude Desktop application" -ForegroundColor White
Write-Host "   2. After restart, I can control browser for testing" -ForegroundColor White
Write-Host ""

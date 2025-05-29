#!/usr/bin/env pwsh

<#
.SYNOPSIS
    Deploy the dsanchezcr.com infrastructure and application to Azure.

.DESCRIPTION
    This script provides an interactive way to deploy the infrastructure using Bicep templates.
    It handles resource group creation, template validation, and deployment.

.PARAMETER ResourceGroupName
    The name of the Azure resource group. Default: dsanchezcr

.PARAMETER Location
    The Azure region to deploy to. Default: eastus2

.PARAMETER WhatIf
    Run a what-if deployment to preview changes without deploying

.PARAMETER SkipValidation
    Skip Bicep template validation

.EXAMPLE
    .\deploy.ps1
    Deploy with default settings

.EXAMPLE
    .\deploy.ps1 -WhatIf
    Preview changes without deploying

.EXAMPLE
    .\deploy.ps1 -ResourceGroupName "my-rg" -Location "westus2"
    Deploy to a custom resource group and location
#>

param(
    [string]$ResourceGroupName = "dsanchezcr",
    [string]$Location = "eastus2",
    [switch]$WhatIf,
    [switch]$SkipValidation
)

# Set error action preference
$ErrorActionPreference = "Stop"

function Write-Step {
    param([string]$Message)
    Write-Host "🔄 $Message" -ForegroundColor Cyan
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

# Check if Azure CLI is installed
try {
    az --version | Out-Null
    Write-Success "Azure CLI is installed"
} catch {
    Write-Error "Azure CLI is not installed. Please install it first: https://aka.ms/azurecli"
    exit 1
}

# Check if user is logged in
try {
    $account = az account show 2>$null | ConvertFrom-Json
    if (-not $account) {
        throw "Not logged in"
    }
    Write-Success "Logged in as $($account.user.name) on subscription '$($account.name)'"
} catch {
    Write-Warning "Not logged in to Azure. Please run 'az login' first."
    exit 1
}

# Navigate to the script directory
$ScriptRoot = $PSScriptRoot
if (-not $ScriptRoot) {
    $ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
}
$InfraPath = Join-Path $ScriptRoot "infra"

if (-not (Test-Path $InfraPath)) {
    Write-Error "Infrastructure folder not found at: $InfraPath"
    exit 1
}

Push-Location $InfraPath

try {
    # Validate Bicep template
    if (-not $SkipValidation) {
        Write-Step "Validating Bicep template..."
        az bicep build --file "main.bicep"
        Write-Success "Bicep template validation passed"
    }

    # Create resource group if it doesn't exist
    Write-Step "Creating resource group '$ResourceGroupName' in '$Location'..."
    az group create --name $ResourceGroupName --location $Location | Out-Null
    Write-Success "Resource group '$ResourceGroupName' is ready"

    # Deploy or preview
    if ($WhatIf) {
        Write-Step "Running what-if deployment preview..."
        az deployment group what-if `
            --resource-group $ResourceGroupName `
            --template-file "main.bicep" `
            --parameters "main.parameters.json"
        Write-Success "What-if deployment completed"
    } else {
        Write-Step "Deploying infrastructure to Azure..."
        $deploymentOutput = az deployment group create `
            --resource-group $ResourceGroupName `
            --template-file "main.bicep" `
            --parameters "main.parameters.json" `
            --query "properties.outputs" `
            --output json | ConvertFrom-Json

        Write-Success "Infrastructure deployment completed!"
        
        # Display outputs
        Write-Host "`n📋 Deployment Outputs:" -ForegroundColor Yellow
        Write-Host "  Static Web App URL: $($deploymentOutput.staticWebAppUrl.value)"
        Write-Host "  Function App URL: $($deploymentOutput.functionAppUrl.value)"
        Write-Host "  Storage Account: $($deploymentOutput.storageAccountName.value)"
        
        Write-Host "`n🚀 Next Steps:" -ForegroundColor Yellow
        Write-Host "  1. Deploy your Docusaurus site: npm run build && npm run deploy"
        Write-Host "  2. Deploy Azure Functions: cd api && func azure functionapp publish $($deploymentOutput.functionAppName.value)"
        Write-Host "  3. Configure custom domains in the Azure portal if needed"
    }

} catch {
    Write-Error "Deployment failed: $($_.Exception.Message)"
    exit 1
} finally {
    Pop-Location
}

Write-Success "Script completed successfully! 🎉"

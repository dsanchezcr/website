# Infrastructure as Code for dsanchezcr.com

This folder contains Bicep templates to deploy the infrastructure for the dsanchezcr.com website.

## Architecture

The infrastructure includes:

- **Azure Static Web App** - Hosts the Docusaurus website
- **Azure Functions** - Serverless API backend (.NET 9.0 isolated)
- **Azure Storage Account** - Function app storage
- **Application Insights** - Application monitoring and telemetry
- **Communication Services** - Email and communication features
- **App Service Plan** - Consumption tier for cost optimization

## Prerequisites

- Azure CLI installed and authenticated
- Contributor or Owner access to the Azure subscription
- Node.js 18+ and npm (for the Docusaurus site)
- .NET 8 SDK (for Azure Functions)
- Optional: Azure Developer CLI for simplified deployment

## Deployment Options

### Option 1: Azure Developer CLI (AZD) - Recommended

The project includes an `azure.yaml` file for seamless deployment:

1. **Install Azure Developer CLI:**
   ```powershell
   # Windows (PowerShell)
   winget install microsoft.azd
   ```

2. **Initialize and deploy:**
   ```powershell
   azd up
   ```

   This single command will:
   - Provision all Azure resources using Bicep
   - Build and deploy the Docusaurus site
   - Build and deploy the Azure Functions API

### Option 2: Azure CLI Manual Deployment

```powershell
# Create resource group if it doesn't exist
az group create --name dsanchezcr --location eastus2

# Deploy infrastructure
az deployment group create `
  --resource-group dsanchezcr `
  --template-file infra/main.bicep `
  --parameters infra/main.parameters.json

# Preview changes before deployment (optional)
az deployment group what-if `
  --resource-group dsanchezcr `
  --template-file infra/main.bicep `
  --parameters infra/main.parameters.json
```

### Option 3: GitHub Actions CI/CD Pipeline

The repository includes a complete CI/CD workflow at `.github/workflows/deploy.yml`:

1. **Configure GitHub Secrets:**
   - `AZURE_CREDENTIALS`: Service principal credentials (JSON format)
   - `AZURE_SUBSCRIPTION_ID`: Your Azure subscription ID  
   - `AZURE_STATIC_WEB_APPS_API_TOKEN`: Static Web App deployment token

2. **Create Azure Service Principal:**
   ```powershell
   az ad sp create-for-rbac --name "dsanchezcr-website-sp" `
     --role contributor `
     --scopes /subscriptions/<subscription-id> `
     --sdk-auth
   ```

3. **Automatic Deployment:**
   - Triggers on pushes to `main` branch
   - Validates Bicep templates
   - Deploys infrastructure
   - Builds and deploys applications

## Parameters

The template accepts the following parameters:

| Parameter | Description | Default Value |
|-----------|-------------|---------------|
| `location` | Azure region for resources | `East US 2` |
| `namePrefix` | Prefix for resource names | `dsanchezcr` |
| `repositoryUrl` | GitHub repository URL | `https://github.com/dsanchezcr/website` |
| `repositoryBranch` | Repository branch | `main` |

## Outputs

After deployment, the template returns:

- Static Web App URL
- Function App URL  
- Storage Account name
- Application Insights instrumentation details
- Communication Services hostname

## Post-Deployment Steps

1. **Configure Static Web App**:
   - Set up custom domains in the Azure portal
   - Configure authentication if needed

2. **Deploy Function App**:
   - Use the existing build task or Azure DevOps pipeline
   - Verify API endpoints are working

3. **Verify Monitoring**:
   - Check Application Insights telemetry
   - Set up alerts as needed

## Notes

- The template is designed to match your existing infrastructure
- Uses consumption tier for cost optimization
- Includes security best practices (HTTPS only, TLS 1.2+)
- Resources are tagged for easier management

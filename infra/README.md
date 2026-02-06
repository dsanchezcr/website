# Infrastructure as Code - Azure Static Web Apps

This folder contains the Bicep templates for deploying the dsanchezcr.com website infrastructure to Azure.

## Architecture

The infrastructure includes:
- **Azure Static Web App** (Standard SKU) with managed .NET 9 API
- **Application Insights** for monitoring and logging
- **Log Analytics Workspace** for centralized logging
- **Azure Storage Account** for Table Storage (token persistence)
- **Azure AI Search** (Free tier) for RAG capabilities in the AI chatbot

## Files

| File | Description |
|------|-------------|
| `main.bicep` | Main Bicep template with all resources and parameters |
| `main.parameters.json` | Parameters file with default values (sensitive values not included) |
| `bicepconfig.json` | Bicep linting and configuration rules |

## Prerequisites

1. Azure CLI installed and logged in
2. An Azure subscription with appropriate permissions
3. GitHub repository URL for automatic deployments

## Deployment

### Quick Deploy

```bash
# Login to Azure
az login

# Set your subscription
az account set --subscription "<subscription-id>"

# Create a resource group (if it doesn't exist)
az group create --name dsanchezcr-rg --location eastus2

# Deploy the infrastructure
az deployment group create \
  --resource-group dsanchezcr-rg \
  --template-file main.bicep \
  --parameters main.parameters.json \
  --parameters \
    azureCommunicationServicesConnectionString="<your-acs-connection-string>" \
    recaptchaSecretKey="<your-recaptcha-secret>" \
    azureOpenAIEndpoint="<your-openai-endpoint>" \
    azureOpenAIKey="<your-openai-key>" \
    googleAnalyticsPropertyId="<your-ga-property-id>" \
    googleAnalyticsCredentialsJson="<your-ga-credentials-json>"
```

### Using What-If (Preview Changes)

```bash
az deployment group what-if \
  --resource-group dsanchezcr-rg \
  --template-file main.bicep \
  --parameters main.parameters.json
```

## Environment Variables (API Configuration)

The following environment variables are configured as app settings for the managed API:

| Variable | Description | Required |
|----------|-------------|----------|
| `AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING` | Connection string for Azure Communication Services (email) | Yes |
| `RECAPTCHA_SECRET_KEY` | Google reCAPTCHA v3 secret key | Yes |
| `AZURE_OPENAI_ENDPOINT` | Azure OpenAI service endpoint | No* |
| `AZURE_OPENAI_KEY` | Azure OpenAI API key | No* |
| `AZURE_OPENAI_DEPLOYMENT` | Azure OpenAI model deployment name | No* |
| `GOOGLE_ANALYTICS_PROPERTY_ID` | GA4 property ID | No* |
| `GOOGLE_ANALYTICS_CREDENTIALS_JSON` | GA4 service account credentials JSON | No* |
| `AZURE_SEARCH_ENDPOINT` | Azure AI Search service endpoint | No* |
| `AZURE_SEARCH_API_KEY` | Azure AI Search admin API key | No* |
| `AZURE_SEARCH_INDEX_NAME` | Azure AI Search index name | No* |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Storage connection for Table Storage | No* |
| `REINDEX_SECRET_KEY` | Secret key for authenticating reindex API calls | No* |
| `WEBSITE_URL` | The public website URL | Yes |
| `API_URL` | The API endpoint URL (auto-configured) | Auto |
| `APPLICATIONINSIGHTS_CONNECTION_STRING` | App Insights connection (auto-configured) | Auto |

*Required if the corresponding feature is enabled.

## API Endpoints

After deployment, the following API endpoints will be available:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/contact` | POST | Submit contact form (initiates email verification) |
| `/api/verify` | GET | Verify email address from contact form |
| `/api/weather` | GET | Get weather data for predefined locations |
| `/api/online-users` | GET | Get 24-hour visitor count |
| `/api/nlweb/ask` | POST | Chat with AI assistant (uses RAG with Azure AI Search) |
| `/api/health` | GET | Health check endpoint for monitoring |
| `/api/reindex` | POST | Update search index (requires X-Reindex-Key header) |

## Post-Deployment Steps

1. **Get the deployment token** for GitHub Actions:
   ```bash
   az staticwebapp secrets list --name dsanchezcr --resource-group dsanchezcr-rg
   ```

2. **Add the deployment token** as a GitHub secret named `AZURE_STATIC_WEB_APPS_API_TOKEN`

3. **Add the reindex secret** as a GitHub secret named `REINDEX_SECRET_KEY` (same value as the app setting)

4. **Add the website URL** as a GitHub variable named `WEBSITE_URL` (e.g., `https://dsanchezcr.com`)

5. **Create the Azure AI Search index** in Azure Portal:
   - Go to Azure AI Search > Indexes > Add Index
   - Name: `website-content`
   - Fields: `id` (key), `title`, `content`, `description`, `url`, `category`, `tags`, `date`

6. **Configure custom domain** (optional):
   - Add a CNAME record pointing to the Static Web App default hostname
   - Configure the custom domain in the Azure Portal or update the Bicep template

4. **Verify the deployment**:
   - Visit the default hostname URL
   - Test each API endpoint
   - Check Application Insights for telemetry

## Updating Configuration

To update environment variables after deployment:

```bash
az staticwebapp appsettings set \
  --name dsanchezcr \
  --resource-group dsanchezcr-rg \
  --setting-names "KEY=value"
```

## Cleanup

To delete all resources:

```bash
az group delete --name dsanchezcr-rg --yes --no-wait
```

## Troubleshooting

### Build Failures
- Check the Azure Portal > Static Web App > Deployment center for build logs
- Ensure the `outputLocation` matches the Docusaurus build output (`build/`)

### API 404 Errors
- Verify the API is building successfully (check build logs)
- Ensure routes in `host.json` match the expected paths
- Check that `staticwebapp.config.json` has `apiRuntime` set to `dotnet-isolated:9.0`

### Authentication Issues
- Verify environment variables are set correctly
- Check Application Insights for detailed error logs

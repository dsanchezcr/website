# Azure Functions Weather API

This directory contains the Azure Functions implementation for the weather widget functionality.

## Overview

The weather API provides real-time weather data for predefined locations (Orlando, FL and San José, CR) using the Open-meteo API. It includes server-side caching to optimize performance and reduce API calls.

## Functions

### GetWeatherFunction

- **Endpoint**: `/api/GetWeatherFunction`
- **Method**: GET
- **Parameters**:
  - `location` (optional): Specific location key (`orlando` or `sanjose`)
  - `lat` & `lon` (optional): Latitude and longitude coordinates for custom location
- **Response**: JSON array of weather data objects

## Deployment Steps

### Prerequisites

1. **Azure Account**: Ensure you have an Azure subscription
2. **Azure CLI**: Install [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/install-azure-cli)
3. **Azure Functions Core Tools**: Install [Azure Functions Core Tools](https://docs.microsoft.com/en-us/azure/azure-functions/functions-run-local)
4. **.NET 9.0**: Ensure .NET 9.0 SDK is installed

### Local Development

1. **Install dependencies**:
   ```bash
   cd api
   dotnet restore
   ```

2. **Run locally**:
   ```bash
   func start
   ```

3. **Test the function**:
   ```bash
   curl "http://localhost:7071/api/GetWeatherFunction?location=orlando"
   ```

### Azure Deployment

#### Option 1: Deploy via Azure CLI

1. **Login to Azure**:
   ```bash
   az login
   ```

2. **Create a resource group** (if not exists):
   ```bash
   az group create --name rg-weather-api --location eastus
   ```

3. **Create a storage account**:
   ```bash
   az storage account create \
     --name weatherapistorageXXXX \
     --resource-group rg-weather-api \
     --location eastus \
     --sku Standard_LRS
   ```

4. **Create the Function App**:
   ```bash
   az functionapp create \
     --resource-group rg-weather-api \
     --consumption-plan-location eastus \
     --runtime dotnet-isolated \
     --runtime-version 9.0 \
     --functions-version 4 \
     --name weather-api-function-XXXX \
     --storage-account weatherapistorageXXXX \
     --disable-app-insights false
   ```

5. **Deploy the function**:
   ```bash
   cd api
   func azure functionapp publish weather-api-function-XXXX
   ```

#### Option 2: Deploy via GitHub Actions

1. **Set up GitHub secrets**:
   - `AZURE_FUNCTIONAPP_PUBLISH_PROFILE`: Download publish profile from Azure portal
   - `AZURE_FUNCTIONAPP_NAME`: Your function app name

2. **Create GitHub Actions workflow** (`.github/workflows/azure-functions.yml`):
   ```yaml
   name: Deploy Azure Function
   
   on:
     push:
       branches: [ main ]
       paths: [ 'api/**' ]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
       - uses: actions/checkout@v3
       
       - name: Setup .NET
         uses: actions/setup-dotnet@v3
         with:
           dotnet-version: '9.0.x'
           
       - name: Restore dependencies
         run: dotnet restore
         working-directory: ./api
         
       - name: Build
         run: dotnet build --no-restore
         working-directory: ./api
         
       - name: Publish
         run: dotnet publish --no-build --output publish
         working-directory: ./api
         
       - name: Deploy to Azure Functions
         uses: Azure/functions-action@v1
         with:
           app-name: ${{ secrets.AZURE_FUNCTIONAPP_NAME }}
           package: './api/publish'
           publish-profile: ${{ secrets.AZURE_FUNCTIONAPP_PUBLISH_PROFILE }}
   ```

#### Option 3: Deploy via Azure Static Web Apps (Recommended)

If you're already using Azure Static Web Apps for the website:

1. **Update Static Web Apps configuration** (`staticwebapp.config.json`):
   ```json
   {
     "platform": {
       "apiRuntime": "dotnet:9.0"
     },
     "routes": [
       {
         "route": "/api/*",
         "allowedRoles": ["anonymous"]
       }
     ]
   }
   ```

2. **The function will be automatically deployed** with your static web app.

### Configuration

#### Environment Variables

Configure these in your Function App settings:

- **FUNCTIONS_WORKER_RUNTIME**: `dotnet-isolated`
- **WEBSITE_RUN_FROM_PACKAGE**: `1` (for better performance)

#### CORS Settings

If deploying separately from the website, configure CORS:

```bash
az functionapp cors add \
  --resource-group rg-weather-api \
  --name weather-api-function-XXXX \
  --allowed-origins "https://yourdomain.com"
```

### Monitoring

1. **Application Insights**: Automatically enabled for monitoring and logging
2. **Function logs**: View in Azure portal under Monitor > Logs
3. **Performance**: Monitor API response times and error rates

### API Usage

Once deployed, the API will be available at:
- **Azure Functions**: `https://weather-api-function-XXXX.azurewebsites.net/api/GetWeatherFunction`
- **Static Web Apps**: `https://yoursite.azurestaticapps.net/api/GetWeatherFunction`

Example requests:
```bash
# Get all locations
curl "https://yoursite.azurestaticapps.net/api/GetWeatherFunction"

# Get specific location
curl "https://yoursite.azurestaticapps.net/api/GetWeatherFunction?location=orlando"

# Get weather by coordinates
curl "https://yoursite.azurestaticapps.net/api/GetWeatherFunction?lat=28.5383&lon=-81.3792"
```

### Troubleshooting

1. **Build issues**: Ensure .NET 9.0 SDK is installed
2. **CORS errors**: Configure appropriate CORS settings
3. **Rate limiting**: The function includes 1-hour caching to prevent API rate limits
4. **SSL/HTTPS**: Ensure all requests are made over HTTPS in production

### Cost Optimization

- **Caching**: 1-hour server-side cache reduces API calls
- **Consumption plan**: Pay only for function executions
- **Open-meteo API**: Free tier allows 10,000 calls per day

### Security

- **No API keys required**: Uses Open-meteo free API
- **HTTPS only**: All communication encrypted
- **No sensitive data**: Weather data is public information
- **Input validation**: Coordinates and location parameters are validated
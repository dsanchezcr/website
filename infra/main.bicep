// =============================================================================
// DSANCHEZCR Infrastructure as Code
// =============================================================================
// This Bicep template creates the infrastructure for dsanchezcr.com website
// Based on existing resources in the dsanchezcr resource group

targetScope = 'resourceGroup'

// =============================================================================
// PARAMETERS
// =============================================================================

@description('Location for all resources')
param location string = 'East US 2'

@description('Name prefix for resources')
param namePrefix string = 'dsanchezcr'

@description('Static Web App repository URL')
param repositoryUrl string = 'https://github.com/dsanchezcr/website'

@description('Static Web App repository branch')
param repositoryBranch string = 'main'

// =============================================================================
// VARIABLES
// =============================================================================

var resourceName = namePrefix
var appServicePlanName = 'ASP-${namePrefix}-${uniqueString(resourceGroup().id)}'
var storageAccountName = replace(namePrefix, '-', '')
var logAnalyticsName = 'DefaultWorkspace-${subscription().subscriptionId}-EUS2'

// =============================================================================
// RESOURCES
// =============================================================================

// Storage Account for Function App
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' = {
  name: storageAccountName
  location: location
  kind: 'StorageV2'
  sku: {
    name: 'Standard_LRS'
  }
  properties: {
    supportsHttpsTrafficOnly: true
    allowBlobPublicAccess: true
    minimumTlsVersion: 'TLS1_2'
    defaultToOAuthAuthentication: true
    encryption: {
      keySource: 'Microsoft.Storage'
      services: {
        blob: {
          enabled: true
          keyType: 'Account'
        }
        file: {
          enabled: true
          keyType: 'Account'
        }
      }
    }
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Log Analytics Workspace
resource logAnalytics 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: logAnalyticsName
  location: location
  properties: {
    sku: {
      name: 'pergb2018'
    }
    retentionInDays: 30
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Application Insights
resource applicationInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: resourceName
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logAnalytics.id
    IngestionMode: 'LogAnalytics'
    RetentionInDays: 90
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// App Service Plan (Consumption)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-12-01' = {
  name: appServicePlanName
  location: location
  kind: 'functionapp'
  properties: {
    reserved: true // Linux
  }
  sku: {
    name: 'Y1'
    tier: 'Dynamic'
  }
}

// Function App
resource functionApp 'Microsoft.Web/sites@2023-12-01' = {
  name: resourceName
  location: location
  kind: 'functionapp,linux'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    reserved: true
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'DOTNET-ISOLATED|9.0'
      appSettings: [
        {
          name: 'AzureWebJobsStorage'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'WEBSITE_CONTENTAZUREFILECONNECTIONSTRING'
          value: 'DefaultEndpointsProtocol=https;AccountName=${storageAccount.name};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net'
        }
        {
          name: 'WEBSITE_CONTENTSHARE'
          value: toLower(resourceName)
        }
        {
          name: 'FUNCTIONS_EXTENSION_VERSION'
          value: '~4'
        }
        {
          name: 'FUNCTIONS_WORKER_RUNTIME'
          value: 'dotnet-isolated'
        }
        {
          name: 'APPINSIGHTS_INSTRUMENTATIONKEY'
          value: applicationInsights.properties.InstrumentationKey
        }
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: applicationInsights.properties.ConnectionString
        }
      ]
      alwaysOn: false
      ftpsState: 'Disabled'
      minTlsVersion: '1.2'
      http20Enabled: false
    }  }
  tags: {
    'hidden-link: /app-insights-resource-id': applicationInsights.id
  }
}

// Static Web App
resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: resourceName
  location: location
  sku: {
    name: 'Standard'
    tier: 'Standard'
  }
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    repositoryUrl: repositoryUrl
    branch: repositoryBranch
    provider: 'GitHub'
    allowConfigFileUpdates: true
    enterpriseGradeCdnStatus: 'Enabled'
    stagingEnvironmentPolicy: 'Enabled'
    buildProperties: {
      appLocation: '/'
      apiLocation: 'api'
      outputLocation: 'build'
    }
  }
}

// Link Function App to Static Web App
resource staticWebAppLinkedBackend 'Microsoft.Web/staticSites/linkedBackends@2023-12-01' = {
  parent: staticWebApp
  name: 'default'
  properties: {
    backendResourceId: functionApp.id
    region: location
  }
}

// Communication Services
resource communicationServices 'Microsoft.Communication/communicationServices@2023-06-01-preview' = {
  name: resourceName
  location: 'global'
  properties: {
    dataLocation: 'United States'
  }
}

// Email Communication Services
resource emailCommunicationServices 'Microsoft.Communication/emailServices@2023-06-01-preview' = {
  name: resourceName
  location: 'global'
  properties: {
    dataLocation: 'United States'
  }
}

// =============================================================================
// OUTPUTS
// =============================================================================

@description('The hostname of the Static Web App')
output staticWebAppUrl string = staticWebApp.properties.defaultHostname

@description('The hostname of the Function App')
output functionAppUrl string = functionApp.properties.defaultHostName

@description('The Storage Account name')
output storageAccountName string = storageAccount.name

@description('The Application Insights Instrumentation Key')
output applicationInsightsInstrumentationKey string = applicationInsights.properties.InstrumentationKey

@description('The Application Insights Connection String')
output applicationInsightsConnectionString string = applicationInsights.properties.ConnectionString

@description('The Communication Services hostname')
output communicationServicesHostname string = communicationServices.properties.hostName

@description('The resource group location')
output location string = location

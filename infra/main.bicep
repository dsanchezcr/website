// ============================================================================
// Azure Static Web Apps Infrastructure with Managed API
// ============================================================================
// This Bicep template deploys an Azure Static Web App with managed functions,
// Application Insights for monitoring, and handles all necessary configuration.
// ============================================================================

targetScope = 'resourceGroup'

// ============================================================================
// Parameters
// ============================================================================

@description('The name of the Static Web App. Must be globally unique.')
param staticWebAppName string

@description('The location for the Static Web App. Use the location that is closest to your users.')
@allowed([
  'centralus'
  'eastus2'
  'eastasia'
  'westeurope'
  'westus2'
])
param location string = 'eastus2'

@description('The SKU of the Static Web App.')
@allowed([
  'Free'
  'Standard'
])
param sku string = 'Standard'

@description('The name of the Application Insights resource.')
param appInsightsName string = '${staticWebAppName}-insights'

@description('The location for Application Insights. Note: This can be different from SWA location.')
param appInsightsLocation string = 'eastus'

@description('The GitHub repository URL for the Static Web App.')
param repositoryUrl string = ''

@description('The branch to use for deployment.')
param branch string = 'main'

@description('The location of the app source code within the repository.')
param appLocation string = '/'

@description('The location of the API source code within the repository.')
param apiLocation string = 'api'

@description('The location of the app build output.')
param outputLocation string = 'build'

@description('Tags to apply to all resources.')
param tags object = {
  environment: 'production'
  application: 'dsanchezcr-website'
  managedBy: 'bicep'
}

// ============================================================================
// API Configuration - Environment Variables
// ============================================================================
// These are stored as app settings in the Static Web App
// and are available to the managed API functions.

@description('Azure Communication Services connection string for sending emails.')
@secure()
param azureCommunicationServicesConnectionString string = ''

@description('Google reCAPTCHA v3 secret key for spam protection.')
@secure()
param recaptchaSecretKey string = ''

@description('Azure OpenAI endpoint URL.')
param azureOpenAIEndpoint string = ''

@description('Azure OpenAI API key.')
@secure()
param azureOpenAIKey string = ''

@description('Azure OpenAI deployment name.')
param azureOpenAIDeployment string = 'gpt-4'

@description('Google Analytics Property ID for the online users widget.')
param googleAnalyticsPropertyId string = ''

@description('Google Analytics credentials JSON string.')
@secure()
param googleAnalyticsCredentialsJson string = ''

@description('The public facing website URL.')
param websiteUrl string = 'https://dsanchezcr.com'

// ============================================================================
// Resources
// ============================================================================

// Log Analytics Workspace (required for Application Insights)
resource logAnalyticsWorkspace 'Microsoft.OperationalInsights/workspaces@2023-09-01' = {
  name: '${staticWebAppName}-logs'
  location: appInsightsLocation
  tags: tags
  properties: {
    sku: {
      name: 'PerGB2018'
    }
    retentionInDays: 30
    features: {
      enableLogAccessUsingOnlyResourcePermissions: true
    }
  }
}

// Application Insights for monitoring
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: appInsightsName
  location: appInsightsLocation
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    Flow_Type: 'Bluefield'
    Request_Source: 'rest'
    WorkspaceResourceId: logAnalyticsWorkspace.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// Static Web App with managed API
resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: staticWebAppName
  location: location
  tags: tags
  sku: {
    name: sku
    tier: sku
  }
  properties: {
    repositoryUrl: empty(repositoryUrl) ? null : repositoryUrl
    branch: empty(repositoryUrl) ? null : branch
    stagingEnvironmentPolicy: 'Enabled'
    allowConfigFileUpdates: true
    provider: 'GitHub'
    enterpriseGradeCdnStatus: sku == 'Standard' ? 'Enabled' : 'Disabled'
    buildProperties: {
      appLocation: appLocation
      apiLocation: apiLocation
      outputLocation: outputLocation
      appBuildCommand: 'npm run build'
      apiBuildCommand: 'dotnet build'
    }
  }
}

// Static Web App Application Settings (API Environment Variables)
resource staticWebAppSettings 'Microsoft.Web/staticSites/config@2023-12-01' = {
  parent: staticWebApp
  name: 'appsettings'
  properties: {
    // Azure Communication Services for email
    AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING: azureCommunicationServicesConnectionString
    
    // Google reCAPTCHA v3
    RECAPTCHA_SECRET_KEY: recaptchaSecretKey
    
    // Azure OpenAI configuration
    AZURE_OPENAI_ENDPOINT: azureOpenAIEndpoint
    AZURE_OPENAI_KEY: azureOpenAIKey
    AZURE_OPENAI_DEPLOYMENT: azureOpenAIDeployment
    
    // Google Analytics
    GOOGLE_ANALYTICS_PROPERTY_ID: googleAnalyticsPropertyId
    GOOGLE_ANALYTICS_CREDENTIALS_JSON: googleAnalyticsCredentialsJson
    
    // Website configuration
    WEBSITE_URL: websiteUrl
    API_URL: websiteUrl
    
    // Application Insights
    APPLICATIONINSIGHTS_CONNECTION_STRING: appInsights.properties.ConnectionString
    APPINSIGHTS_INSTRUMENTATIONKEY: appInsights.properties.InstrumentationKey
  }
}

// ============================================================================
// Custom Domain Configuration (optional - manual DNS configuration required)
// ============================================================================
// Uncomment and configure if you have a custom domain

// @description('Custom domain name for the Static Web App.')
// param customDomain string = 'dsanchezcr.com'

// resource customDomainConfig 'Microsoft.Web/staticSites/customDomains@2023-12-01' = {
//   parent: staticWebApp
//   name: customDomain
//   properties: {
//     validationMethod: 'cname-delegation'
//   }
// }

// ============================================================================
// Outputs
// ============================================================================

@description('The resource ID of the Static Web App.')
output staticWebAppId string = staticWebApp.id

@description('The default hostname of the Static Web App.')
output defaultHostname string = staticWebApp.properties.defaultHostname

// NOTE: Deployment token should be retrieved via: az staticwebapp secrets list --name <app-name>
// Do not output secrets in Bicep as they are visible in deployment history.

@description('The Application Insights connection string.')
output appInsightsConnectionString string = appInsights.properties.ConnectionString

@description('The Application Insights instrumentation key.')
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey

@description('The Log Analytics Workspace ID.')
output logAnalyticsWorkspaceId string = logAnalyticsWorkspace.id

@description('API endpoints available after deployment.')
output apiEndpoints object = {
  contact: 'https://${staticWebApp.properties.defaultHostname}/api/contact'
  verify: 'https://${staticWebApp.properties.defaultHostname}/api/verify'
  weather: 'https://${staticWebApp.properties.defaultHostname}/api/weather'
  onlineUsers: 'https://${staticWebApp.properties.defaultHostname}/api/online-users'
  chat: 'https://${staticWebApp.properties.defaultHostname}/api/nlweb/ask'
}

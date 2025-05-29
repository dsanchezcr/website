# Google Analytics Real-Time API Configuration

This guide will help you configure the Azure Function to read real-time active user data from Google Analytics.

## Prerequisites

1. A Google Analytics account with a configured property for your website
2. Access to Google Cloud Console
3. Access to Azure Portal for your Function App

## Step 1: Enable Google Analytics Reporting API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Navigate to **APIs & Services** → **Library**
4. Search for "Analytics Reporting API"
5. Click on it and press **Enable**

## Step 2: Create a Service Account

1. In Google Cloud Console, go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **Service Account**
3. Fill in the service account details:
   - **Name**: `analytics-reader` (or your preferred name)
   - **Description**: `Service account for reading Google Analytics data`
4. Click **Create and Continue**
5. For the role, select **Viewer** (or create a custom role with Analytics read permissions)
6. Click **Continue** and **Done**

## Step 3: Generate Service Account Key

1. In the **Credentials** page, find your newly created service account
2. Click on the service account email
3. Go to the **Keys** tab
4. Click **Add Key** → **Create new key**
5. Select **JSON** format and click **Create**
6. Save the downloaded JSON file securely - you'll need its contents for the Azure Function configuration

## Step 4: Link Service Account to Google Analytics

1. Go to [Google Analytics](https://analytics.google.com/)
2. Navigate to **Admin** (gear icon at the bottom left)
3. In the **Property** column, click **Property User Management**
4. Click the **+** button and select **Add users**
5. Enter the service account email address (from the JSON file, the `client_email` field)
6. Set permissions to **Viewer**
7. Uncheck **Notify new users by email**
8. Click **Add**

## Step 5: Get Your View ID

1. In Google Analytics, go to **Admin**
2. In the **View** column, click **View Settings**
3. Copy the **View ID** number - you'll need this for the Azure Function configuration

## Step 6: Configure Azure Function Environment Variables

1. Go to [Azure Portal](https://portal.azure.com/)
2. Navigate to your Function App
3. Go to **Configuration** → **Application settings**
4. Add the following environment variables:

### GOOGLE_ANALYTICS_VIEW_ID
- **Name**: `GOOGLE_ANALYTICS_VIEW_ID`
- **Value**: The View ID you copied from Step 5

### GOOGLE_ANALYTICS_CREDENTIALS_JSON
- **Name**: `GOOGLE_ANALYTICS_CREDENTIALS_JSON`
- **Value**: The entire contents of the JSON file downloaded in Step 3
- **Important**: Copy the entire JSON content as a single line string

Example JSON content format:
```json
{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"analytics-reader@your-project.iam.gserviceaccount.com","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}
```

4. Click **Save** to apply the configuration
5. Restart the Function App to ensure the new environment variables are loaded

## Step 7: Test the Configuration

1. Navigate to your website to generate some analytics traffic
2. Call the Azure Function endpoint: `https://your-function-app.azurewebsites.net/api/GetOnlineUsersFunction`
3. You should see a response like:
```json
{
  "activeUsers": 1,
  "timestamp": "2024-01-01T12:00:00Z",
  "source": "Google Analytics"
}
```

If the `source` field shows "Fallback", check your environment variables and ensure they are correctly configured.

## Troubleshooting

### Common Issues:

1. **"source": "Fallback"** - Environment variables are not set correctly
2. **403 Forbidden** - Service account doesn't have access to the Analytics property
3. **Invalid credentials** - JSON format is incorrect or missing fields
4. **View ID not found** - Wrong View ID or service account doesn't have access

### Debugging Steps:

1. Check Azure Function logs in the Azure Portal
2. Verify the service account email is added to Google Analytics with proper permissions
3. Ensure the JSON credentials are valid and properly formatted
4. Confirm the View ID exists and is accessible by the service account

## Security Notes

- Keep the service account JSON credentials secure
- Only grant minimum necessary permissions (Viewer role)
- Regularly rotate service account keys if needed
- Consider using Azure Key Vault for storing sensitive credentials in production

## Rate Limits

The Google Analytics Reporting API has the following limits:
- 100 requests per 100 seconds per user
- 10 requests per second per user

The Azure Function implements a 30-second cache to stay well within these limits.
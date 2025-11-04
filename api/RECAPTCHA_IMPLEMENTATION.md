# reCAPTCHA Backend Implementation Guide

## Overview
The contact form now includes Google reCAPTCHA v3 tokens in form submissions. This document outlines the steps needed to complete the backend verification.

## Frontend Changes
The contact form now sends a `recaptchaToken` field in the request payload:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "message": "Hello!",
  "language": "en",
  "recaptchaToken": "03AGdBq24..."
}
```

## Backend Implementation Steps

### 1. Update the ContactRequest Record
Modify `SendEmail.cs` line 65 to include the reCAPTCHA token:

```csharp
private record ContactRequest(
    string Name, 
    string Email, 
    string Message, 
    string Language = "en",
    string? RecaptchaToken = null
);
```

### 2. Add reCAPTCHA Verification Method
Add this method to the `SendEmail` class:

```csharp
private async Task<bool> VerifyRecaptchaAsync(string token, CancellationToken cancellationToken)
{
    if (string.IsNullOrWhiteSpace(token))
    {
        _logger.LogWarning("No reCAPTCHA token provided");
        return false;
    }

    try
    {
        var secretKey = Environment.GetEnvironmentVariable("RECAPTCHA_SECRET_KEY");
        if (string.IsNullOrWhiteSpace(secretKey))
        {
            _logger.LogError("RECAPTCHA_SECRET_KEY environment variable not set");
            return false;
        }

        using var httpClient = new HttpClient();
        var response = await httpClient.PostAsync(
            "https://www.google.com/recaptcha/api/siteverify",
            new FormUrlEncodedContent(new Dictionary<string, string>
            {
                ["secret"] = secretKey,
                ["response"] = token
            }),
            cancellationToken
        );

        var jsonResponse = await response.Content.ReadAsStringAsync(cancellationToken);
        var result = JsonSerializer.Deserialize<RecaptchaResponse>(jsonResponse);

        if (result?.Success == true)
        {
            _logger.LogInformation("reCAPTCHA verification successful. Score: {Score}", result.Score);
            
            // Reject if score is too low (threshold: 0.5)
            // Adjust this threshold based on your needs (0.0 = bot, 1.0 = human)
            if (result.Score < 0.5)
            {
                _logger.LogWarning("reCAPTCHA score too low: {Score}", result.Score);
                return false;
            }
            
            return true;
        }

        _logger.LogWarning("reCAPTCHA verification failed: {ErrorCodes}", 
            string.Join(", ", result?.ErrorCodes ?? Array.Empty<string>()));
        return false;
    }
    catch (Exception ex)
    {
        _logger.LogError(ex, "Error verifying reCAPTCHA token");
        return false;
    }
}

private record RecaptchaResponse(
    bool Success,
    double Score,
    string Action,
    DateTime ChallengeTs,
    string Hostname,
    string[] ErrorCodes
);
```

### 3. Add Verification in the Run Method
In the `Run` method, after parsing the request (around line 88), add:

```csharp
// Verify reCAPTCHA token
if (!await VerifyRecaptchaAsync(contactRequest.RecaptchaToken, cancellationToken))
{
    return await CreateErrorResponseAsync(req, HttpStatusCode.BadRequest, 
        "Failed to verify reCAPTCHA. Please try again.");
}
```

### 4. Set Environment Variables
Add the reCAPTCHA secret key to your Azure Function App settings:

1. Go to Azure Portal → Function App → Configuration
2. Add new application setting:
   - Name: `RECAPTCHA_SECRET_KEY`
   - Value: Your reCAPTCHA v3 secret key from Google

For local development, add to `api/local.settings.json`:
```json
{
  "Values": {
    "RECAPTCHA_SECRET_KEY": "your-secret-key-here"
  }
}
```

## Configuration

### Frontend reCAPTCHA Site Key
Update `src/config/environment.js` line 17 with your production site key:
```javascript
recaptchaSiteKey: 'your-production-site-key-here',
```

### Get reCAPTCHA Keys
1. Go to https://www.google.com/recaptcha/admin
2. Register a new site with reCAPTCHA v3
3. Note down both the site key (for frontend) and secret key (for backend)

## Testing
- Use Google's test keys for development (already configured in frontend)
- Test site key: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- Test secret key: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

**Note:** Test keys always return success with a score of 0.9

## References
- [reCAPTCHA v3 Documentation](https://developers.google.com/recaptcha/docs/v3)
- [Verify API Response](https://developers.google.com/recaptcha/docs/verify)

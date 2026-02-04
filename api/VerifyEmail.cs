using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using Azure.Communication.Email;
using Azure;
using System.Text.Json;

namespace api;

public class VerifyEmail
{
    private readonly ILogger<VerifyEmail> _logger;
    private readonly IMemoryCache _cache;
    private static readonly Lazy<EmailClient> _emailClient = new(() => 
    {
        var connectionString = Environment.GetEnvironmentVariable("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING environment variable is not configured.");
        }
        return new EmailClient(connectionString);
    });

    // Rate limiting for verification attempts
    private const int MaxVerificationAttemptsPerIpPerHour = 10;

    private record VerificationData(string Name, string Email, string Message, string Language);

    public VerifyEmail(ILogger<VerifyEmail> logger, IMemoryCache cache)
    {
        _logger = logger;
        _cache = cache;
    }
    
    private static string GetClientIp(HttpRequestData req)
    {
        if (req.Headers.TryGetValues("X-Forwarded-For", out var forwardedFor))
        {
            return forwardedFor.First().Split(',')[0].Trim();
        }
        
        if (req.Headers.TryGetValues("X-Real-IP", out var realIp))
        {
            return realIp.First();
        }
        
        return "unknown";
    }

    [Function("VerifyEmail")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "verify")] HttpRequestData req,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("VerifyEmail Function Triggered");

        try
        {
            // Rate limit verification attempts to prevent token brute forcing
            var clientIp = GetClientIp(req);
            var rateLimitKey = $"verify:ratelimit:{clientIp}";
            if (!_cache.TryGetValue<int>(rateLimitKey, out var attempts))
            {
                attempts = 0;
            }
            
            // Check limit first before incrementing to ensure accurate counting
            if (attempts >= MaxVerificationAttemptsPerIpPerHour)
            {
                _logger.LogWarning("Rate limit exceeded for verification from IP: {ClientIp}", clientIp);
                return await CreateHtmlResponseAsync(req, HttpStatusCode.TooManyRequests, 
                    "Too many verification attempts. Please try again later.", "en");
            }
            
            // Only increment the counter after confirming the request will be processed
            _cache.Set(rateLimitKey, attempts + 1, TimeSpan.FromHours(1));

            // Get token from query string
            var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
            var token = query["token"];

            if (string.IsNullOrWhiteSpace(token))
            {
                return await CreateHtmlResponseAsync(req, HttpStatusCode.BadRequest, 
                    "Invalid verification link.", "en");
            }

            // Retrieve cached data
            var cacheKey = $"verification:{token}";
            if (!_cache.TryGetValue<VerificationData>(cacheKey, out var verificationData) || verificationData == null)
            {
                _logger.LogWarning("Verification token not found or expired: {Token}", token);
                return await CreateHtmlResponseAsync(req, HttpStatusCode.BadRequest, 
                    LocalizationHelper.GetText("en", "verificationError"), "en");
            }

            // Remove from cache to prevent reuse
            _cache.Remove(cacheKey);

            // Send both emails now that verification is complete
            var tasks = new[]
            {
                SendNotificationEmailAsync(verificationData, cancellationToken),
                SendConfirmationEmailAsync(verificationData, cancellationToken)
            };
            
            var results = await Task.WhenAll(tasks);
            
            if (results.All(r => r.HasCompleted))
            {
                _logger.LogInformation("Contact form verified and emails sent for {Email}", verificationData.Email);
                return await CreateHtmlResponseAsync(req, HttpStatusCode.OK, 
                    LocalizationHelper.GetText(verificationData.Language, "verificationSuccess"), 
                    verificationData.Language);
            }
            else
            {
                _logger.LogWarning("Some emails failed to send after verification for {Email}", verificationData.Email);
                return await CreateHtmlResponseAsync(req, HttpStatusCode.PartialContent, 
                    "Verification successful, but there was an issue sending notifications.", 
                    verificationData.Language);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in VerifyEmail function");
            return await CreateHtmlResponseAsync(req, HttpStatusCode.InternalServerError, 
                "An unexpected error occurred.", "en");
        }
    }

    private async Task<EmailSendOperation> SendNotificationEmailAsync(VerificationData contact, CancellationToken cancellationToken)
    {
        try
        {
            var fieldLabels = LocalizationHelper.GetText(contact.Language, "fieldLabels").Split('|');
            // Ensure we have all required field labels
            if (fieldLabels.Length < 3)
            {
                fieldLabels = new[] { "Name:", "Email:", "Message:" };
            }
            var subject = LocalizationHelper.GetText(contact.Language, "notificationSubject", contact.Name);
            var title = LocalizationHelper.GetText(contact.Language, "notificationTitle");

            var operation = await _emailClient.Value.SendAsync(
                wait: WaitUntil.Completed,
                senderAddress: "DoNotReply@dsanchezcr.com",
                recipientAddress: "david@dsanchezcr.com",
                subject: subject,
                htmlContent: $"""
                    <html>
                        <body style="font-family: Arial, sans-serif;">
                            <h2>{title}</h2>
                            <p><strong>{fieldLabels[0]}</strong> {System.Net.WebUtility.HtmlEncode(contact.Name)}</p>
                            <p><strong>{fieldLabels[1]}</strong> {System.Net.WebUtility.HtmlEncode(contact.Email)}</p>
                            <p><strong>{fieldLabels[2]}</strong></p>
                            <div style="background-color: #f5f5f5; padding: 10px; border-left: 4px solid #007acc;">
                                {System.Net.WebUtility.HtmlEncode(contact.Message)}
                            </div>
                            <p><em>Language: {contact.Language}</em></p>
                            <p style="color: green;"><strong>✓ Email Verified</strong></p>
                        </body>
                    </html>
                    """,
                cancellationToken: cancellationToken);

            _logger.LogInformation("Notification email sent with ID: {MessageId}", operation.Id);
            return operation;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send notification email");
            throw;
        }
    }

    private async Task<EmailSendOperation> SendConfirmationEmailAsync(VerificationData contact, CancellationToken cancellationToken)
    {
        try
        {
            var subject = LocalizationHelper.GetText(contact.Language, "confirmationSubject");
            var greeting = LocalizationHelper.GetText(contact.Language, "confirmationGreeting", contact.Name);
            var message = LocalizationHelper.GetText(contact.Language, "confirmationMessage");
            var signature = LocalizationHelper.GetText(contact.Language, "confirmationSignature");
            var title = LocalizationHelper.GetText(contact.Language, "confirmationTitle");

            var operation = await _emailClient.Value.SendAsync(
                wait: WaitUntil.Completed,
                senderAddress: "DoNotReply@dsanchezcr.com",
                recipientAddress: contact.Email,
                subject: subject,
                htmlContent: $"""
                    <html>
                        <body style="font-family: Arial, sans-serif;">
                            <h2>{title}</h2>
                            <p>{greeting}</p>
                            <p>{message}</p>
                            <p>{signature}</p>
                        </body>
                    </html>
                    """,
                cancellationToken: cancellationToken);

            _logger.LogInformation("Confirmation email sent with ID: {MessageId}", operation.Id);
            return operation;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send confirmation email to {Email}", contact.Email);
            throw;
        }
    }

    private static async Task<HttpResponseData> CreateHtmlResponseAsync(HttpRequestData req, HttpStatusCode statusCode, string message, string language)
    {
        var response = req.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "text/html; charset=utf-8");
        
        var isSuccess = statusCode == HttpStatusCode.OK;
        var title = LocalizationHelper.GetVerificationPageTitle(language, isSuccess);
        
        var html = $$"""
            <!DOCTYPE html>
            <html lang="{{language}}">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>{{title}}</title>
                <style>
                    body {
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    .container {
                        background: white;
                        padding: 40px;
                        border-radius: 10px;
                        box-shadow: 0 10px 40px rgba(0,0,0,0.1);
                        max-width: 500px;
                        text-align: center;
                    }
                    .icon {
                        font-size: 60px;
                        margin-bottom: 20px;
                    }
                    h1 {
                        color: #333;
                        margin-bottom: 20px;
                    }
                    p {
                        color: #666;
                        line-height: 1.6;
                    }
                    .success { color: #10b981; }
                    .error { color: #ef4444; }
                    .home-link {
                        display: inline-block;
                        margin-top: 20px;
                        padding: 12px 30px;
                        background: #667eea;
                        color: white;
                        text-decoration: none;
                        border-radius: 5px;
                        transition: background 0.3s;
                    }
                    .home-link:hover {
                        background: #5568d3;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="icon {{(isSuccess ? "success" : "error")}}">
                        {{(isSuccess ? "✓" : "✗")}}
                    </div>
                    <h1>{{title}}</h1>
                    <p>{{message}}</p>
                    <a href="{{LocalizationHelper.GetHomeUrl(language)}}" class="home-link">
                        {{LocalizationHelper.GetReturnHomeText(language)}}
                    </a>
                </div>
            </body>
            </html>
            """;
        
        await response.WriteStringAsync(html);
        return response;
    }
}

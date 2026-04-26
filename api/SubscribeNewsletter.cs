using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Azure.Communication.Email;
using Azure;
using api.Models.Newsletter;
using api.Services;

namespace api;

public partial class SubscribeNewsletter
{
    private readonly ILogger<SubscribeNewsletter> _logger;
    private readonly INewsletterService _newsletterService;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IRateLimitService _rateLimitService;
    private const int MaxSubscriptionsPerIpPerHour = 3;
    private const int MaxSubscriptionsPerEmailPerDay = 2;
    private const double MinRecaptchaScore = 0.5;

    private static readonly Lazy<EmailClient> _emailClient = new(() =>
    {
        var connectionString = Environment.GetEnvironmentVariable("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING not configured.");
        return new EmailClient(connectionString);
    });

    [GeneratedRegex(@"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")]
    private static partial Regex EmailRegex();

    public SubscribeNewsletter(ILogger<SubscribeNewsletter> logger, INewsletterService newsletterService, IHttpClientFactory httpClientFactory, IRateLimitService rateLimitService)
    {
        _logger = logger;
        _newsletterService = newsletterService;
        _httpClientFactory = httpClientFactory;
        _rateLimitService = rateLimitService;
    }

    [Function("SubscribeNewsletter")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "newsletter/subscribe")] HttpRequestData req,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("SubscribeNewsletter Function Triggered");

        if (!await _newsletterService.IsConfiguredAsync())
        {
            var unavailable = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            await unavailable.WriteAsJsonAsync(new { error = "Newsletter service is not configured." });
            return unavailable;
        }

        SubscribeRequest? request;
        try
        {
            request = await req.ReadFromJsonAsync<SubscribeRequest>(cancellationToken);
        }
        catch (JsonException)
        {
            var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
            await badRequest.WriteAsJsonAsync(new { error = "Invalid request body." });
            return badRequest;
        }
        if (request == null)
        {
            var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
            await badRequest.WriteAsJsonAsync(new { error = "Invalid request body." });
            return badRequest;
        }

        // Rate limiting (applied before honeypot to prevent abuse via honeypot bypass)
        var clientIp = GetClientIp(req);
        var rateLimitKey = $"newsletter:subscribe:{clientIp}";
        if (_rateLimitService.IsRateLimited(rateLimitKey, MaxSubscriptionsPerIpPerHour, TimeSpan.FromHours(1)))
        {
            _logger.LogWarning("Newsletter subscribe rate limit exceeded for IP: {ClientIp}", clientIp);
            var tooMany = req.CreateResponse(HttpStatusCode.TooManyRequests);
            await tooMany.WriteAsJsonAsync(new { error = "Too many subscription attempts. Please try again later." });
            return tooMany;
        }

        // Honeypot check
        if (!string.IsNullOrEmpty(request.Website))
        {
            _logger.LogWarning("Honeypot field filled — likely bot submission");
            var ok = req.CreateResponse(HttpStatusCode.OK);
            await ok.WriteAsJsonAsync(new { message = "Subscription request received." });
            return ok;
        }

        // Normalize and validate email
        request.Email = request.Email?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(request.Email) || !EmailRegex().IsMatch(request.Email) || request.Email.Length > 254)
        {
            var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
            await badRequest.WriteAsJsonAsync(new { error = "Invalid email address." });
            return badRequest;
        }

        // Email-based rate limiting (prevent verification email spam from distributed IPs)
        var emailRateLimitKey = $"newsletter:subscribe:email:{request.Email}";
        if (_rateLimitService.IsRateLimited(emailRateLimitKey, MaxSubscriptionsPerEmailPerDay, TimeSpan.FromDays(1)))
        {
            _logger.LogWarning("Newsletter subscribe email rate limit exceeded");
            var tooMany = req.CreateResponse(HttpStatusCode.TooManyRequests);
            await tooMany.WriteAsJsonAsync(new { error = "Too many subscription attempts for this email. Please try again later." });
            return tooMany;
        }

        // Validate frequency
        if (request.Frequency != "weekly" && request.Frequency != "monthly")
        {
            request.Frequency = "weekly";
        }

        // Validate language
        if (request.Language != "en" && request.Language != "es" && request.Language != "pt")
        {
            request.Language = "en";
        }

        // Validate reCAPTCHA (optional — the newsletter component is mounted via the Footer theme override,
        // so it doesn't use GoogleReCaptchaProvider; honeypot + rate limiting provide protection)
        if (!string.IsNullOrWhiteSpace(request.RecaptchaToken))
        {
            var recaptchaScore = await ValidateRecaptchaAsync(request.RecaptchaToken, cancellationToken);
            if (recaptchaScore < MinRecaptchaScore)
            {
                _logger.LogWarning("Low reCAPTCHA score {Score} for newsletter subscribe", recaptchaScore);
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { error = "Security verification failed." });
                return forbidden;
            }
        }

        try
        {
            // Check if already subscribed
            var existing = await _newsletterService.GetSubscriberAsync(request.Email);
            if (existing != null)
            {
                if (existing.Status == "active")
                {
                    var conflict = req.CreateResponse(HttpStatusCode.Conflict);
                    await conflict.WriteAsJsonAsync(new { error = "This email is already subscribed." });
                    return conflict;
                }

                // Re-activate with new verification for previously unsubscribed or pending users
                existing.Status = "pending";
                existing.Frequency = request.Frequency;
                existing.Language = request.Language;
                existing.VerifiedAt = null;
                existing.LastSentAt = null;
                existing.VerificationToken = GenerateToken();
                existing.UnsubscribeToken = GenerateToken();
                existing.SubscribedAt = DateTime.UtcNow;
                await _newsletterService.UpdateSubscriberAsync(existing);
                await SendVerificationEmailAsync(existing, cancellationToken);
            }
            else
            {
                var subscriber = new NewsletterSubscriber
                {
                    Id = request.Email.ToLowerInvariant(),
                    Email = request.Email.ToLowerInvariant(),
                    Frequency = request.Frequency,
                    Language = request.Language,
                    Status = "pending",
                    SubscribedAt = DateTime.UtcNow,
                    VerificationToken = GenerateToken(),
                    UnsubscribeToken = GenerateToken()
                };
                await _newsletterService.CreateSubscriberAsync(subscriber);
                await SendVerificationEmailAsync(subscriber, cancellationToken);
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new { message = "Please check your email to confirm your subscription." });
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing newsletter subscription");
            var error = req.CreateResponse(HttpStatusCode.InternalServerError);
            await error.WriteAsJsonAsync(new { error = "An error occurred. Please try again later." });
            return error;
        }
    }

    private async Task SendVerificationEmailAsync(NewsletterSubscriber subscriber, CancellationToken cancellationToken)
    {
        var apiUrl = Environment.GetEnvironmentVariable("API_URL")
            ?? Environment.GetEnvironmentVariable("WEBSITE_URL")
            ?? "https://dsanchezcr.com";
        var verificationUrl = $"{apiUrl}/api/newsletter/verify?token={subscriber.VerificationToken}";

        var subject = LocalizationHelper.GetText(subscriber.Language, "newsletterVerificationSubject");
        var message = LocalizationHelper.GetText(subscriber.Language, "newsletterVerificationMessage", System.Net.WebUtility.HtmlEncode(verificationUrl));

        await _emailClient.Value.SendAsync(
            wait: WaitUntil.Completed,
            senderAddress: "DoNotReply@dsanchezcr.com",
            recipientAddress: subscriber.Email,
            subject: subject,
            htmlContent: $"""
                <html>
                    <body style="font-family: Arial, sans-serif;">
                        <h2>{subject}</h2>
                        <p>{message}</p>
                        <p style="color: #666; font-size: 12px;">{LocalizationHelper.GetText(subscriber.Language, "newsletterVerificationDisclaimer")}</p>
                    </body>
                </html>
                """,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Newsletter verification email sent");
    }

    private static string GenerateToken()
    {
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
    }

    private static string GetClientIp(HttpRequestData req)
    {
        if (req.Headers.TryGetValues("X-Forwarded-For", out var forwardedFor))
            return forwardedFor.First().Split(',')[0].Trim();
        if (req.Headers.TryGetValues("X-Real-IP", out var realIp))
            return realIp.First();
        return "unknown";
    }

    private async Task<double> ValidateRecaptchaAsync(string token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token)) return 0.0;

        var secretKey = Environment.GetEnvironmentVariable("RECAPTCHA_SECRET_KEY");
        if (string.IsNullOrWhiteSpace(secretKey)) return 0.0;

        try
        {
            var httpClient = _httpClientFactory.CreateClient();
            var content = new FormUrlEncodedContent(new[]
            {
                new KeyValuePair<string, string>("secret", secretKey),
                new KeyValuePair<string, string>("response", token)
            });
            var response = await httpClient.PostAsync("https://www.google.com/recaptcha/api/siteverify", content, cancellationToken);
            var result = await response.Content.ReadFromJsonAsync<RecaptchaResponse>(cancellationToken);
            return result?.Success == true ? result.Score : 0.0;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating reCAPTCHA for newsletter");
            return 0.0;
        }
    }

    private class RecaptchaResponse
    {
        [System.Text.Json.Serialization.JsonPropertyName("success")]
        public bool Success { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("score")]
        public double Score { get; set; }
    }
}

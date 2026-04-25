using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Azure.Communication.Email;
using Azure;
using api.Services;

namespace api;

public class VerifySubscription
{
    private readonly ILogger<VerifySubscription> _logger;
    private readonly INewsletterService _newsletterService;

    private static readonly Lazy<EmailClient> _emailClient = new(() =>
    {
        var connectionString = Environment.GetEnvironmentVariable("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING not configured.");
        return new EmailClient(connectionString);
    });

    public VerifySubscription(ILogger<VerifySubscription> logger, INewsletterService newsletterService)
    {
        _logger = logger;
        _newsletterService = newsletterService;
    }

    [Function("VerifySubscription")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "newsletter/verify")] HttpRequestData req,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("VerifySubscription Function Triggered");

        if (!await _newsletterService.IsConfiguredAsync())
        {
            return await CreateHtmlResponseAsync(req, HttpStatusCode.ServiceUnavailable,
                "Newsletter service is not available. Please try again later.", "en");
        }

        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var token = query["token"];

        if (string.IsNullOrWhiteSpace(token))
        {
            return await CreateHtmlResponseAsync(req, HttpStatusCode.BadRequest, "Invalid verification link.", "en");
        }

        try
        {
            var subscriber = await _newsletterService.GetSubscriberByVerificationTokenAsync(token);
            if (subscriber == null)
            {
                return await CreateHtmlResponseAsync(req, HttpStatusCode.BadRequest,
                    "Invalid or expired verification link. Please subscribe again.", "en");
            }

            // Enforce 24-hour TTL on verification tokens
            if (subscriber.Status == "pending" &&
                subscriber.SubscribedAt.AddHours(24) < DateTime.UtcNow)
            {
                subscriber.VerificationToken = null;
                await _newsletterService.UpdateSubscriberAsync(subscriber);
                return await CreateHtmlResponseAsync(req, HttpStatusCode.BadRequest,
                    "This verification link has expired. Please subscribe again.", subscriber.Language);
            }

            subscriber.Status = "active";
            subscriber.VerifiedAt = DateTime.UtcNow;
            subscriber.VerificationToken = null;
            await _newsletterService.UpdateSubscriberAsync(subscriber);

            // Send welcome email (best-effort — verification already succeeded)
            try
            {
                await SendWelcomeEmailAsync(subscriber, cancellationToken);
            }
            catch (Exception emailEx)
            {
                _logger.LogWarning("Newsletter subscription verified, but sending the welcome email failed: {ErrorType}", emailEx.GetType().Name);
            }

            _logger.LogInformation("Newsletter subscription verified");

            var lang = subscriber.Language;
            var successMessage = lang switch
            {
                "es" => "¡Tu suscripción al boletín ha sido confirmada! Recibirás actualizaciones pronto.",
                "pt" => "Sua assinatura do boletim foi confirmada! Você receberá atualizações em breve.",
                _ => "Your newsletter subscription has been confirmed! You'll receive updates soon."
            };

            return await CreateHtmlResponseAsync(req, HttpStatusCode.OK, successMessage, lang);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error verifying newsletter subscription");
            return await CreateHtmlResponseAsync(req, HttpStatusCode.InternalServerError,
                "An error occurred. Please try again later.", "en");
        }
    }

    private async Task SendWelcomeEmailAsync(Models.Newsletter.NewsletterSubscriber subscriber, CancellationToken cancellationToken)
    {
        var subject = LocalizationHelper.GetText(subscriber.Language, "newsletterWelcomeSubject");
        var greeting = LocalizationHelper.GetText(subscriber.Language, "newsletterWelcomeGreeting");
        var frequencyText = LocalizationHelper.GetText(subscriber.Language,
            subscriber.Frequency == "monthly" ? "newsletterFrequencyMonthly" : "newsletterFrequencyWeekly");
        var message = LocalizationHelper.GetText(subscriber.Language, "newsletterWelcomeMessage", frequencyText);
        var signature = LocalizationHelper.GetText(subscriber.Language, "newsletterWelcomeSignature");

        var websiteUrl = Environment.GetEnvironmentVariable("WEBSITE_URL") ?? "https://dsanchezcr.com";
        var unsubscribeUrl = $"{websiteUrl}/api/newsletter/unsubscribe?token={subscriber.UnsubscribeToken}";
        var unsubscribeText = LocalizationHelper.GetText(subscriber.Language, "newsletterUnsubscribe");

        await _emailClient.Value.SendAsync(
            wait: WaitUntil.Completed,
            senderAddress: "DoNotReply@dsanchezcr.com",
            recipientAddress: subscriber.Email,
            subject: subject,
            htmlContent: $"""
                <html>
                    <body style="font-family: Arial, sans-serif;">
                        <h2>{subject}</h2>
                        <p>{greeting}</p>
                        <p>{message}</p>
                        <p>{signature}</p>
                        <hr style="margin: 20px 0;" />
                        <p style="color: #666; font-size: 12px;">
                            <a href="{System.Net.WebUtility.HtmlEncode(unsubscribeUrl)}">{unsubscribeText}</a>
                        </p>
                    </body>
                </html>
                """,
            cancellationToken: cancellationToken);

        _logger.LogInformation("Newsletter welcome email sent");
    }

    private static async Task<HttpResponseData> CreateHtmlResponseAsync(HttpRequestData req, HttpStatusCode statusCode, string message, string language)
    {
        var websiteUrl = Environment.GetEnvironmentVariable("WEBSITE_URL") ?? "https://dsanchezcr.com";
        var homeUrl = language switch
        {
            "es" => $"{websiteUrl}/es/",
            "pt" => $"{websiteUrl}/pt/",
            _ => $"{websiteUrl}/"
        };
        var returnText = language switch
        {
            "es" => "Volver al Inicio",
            "pt" => "Voltar ao Início",
            _ => "Return to Home"
        };
        var title = statusCode == HttpStatusCode.OK
            ? (language switch { "es" => "Suscripción Confirmada", "pt" => "Assinatura Confirmada", _ => "Subscription Confirmed" })
            : (language switch { "es" => "Error", "pt" => "Erro", _ => "Error" });

        var response = req.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "text/html; charset=utf-8");
        await response.WriteStringAsync($$"""
            <!DOCTYPE html>
            <html lang="{{language}}">
            <head>
                <meta charset="UTF-8" />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>{{title}}</title>
                <style>
                    body { font-family: Arial, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0; background-color: #f5f5f5; }
                    .container { text-align: center; padding: 2rem; background: white; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); max-width: 500px; }
                    a { color: #007acc; text-decoration: none; }
                    a:hover { text-decoration: underline; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>{{title}}</h2>
                    <p>{{message}}</p>
                    <p><a href="{{homeUrl}}">{{returnText}}</a></p>
                </div>
            </body>
            </html>
            """);
        return response;
    }
}

using System.Net;
using System.Security.Cryptography;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using api.Services;

namespace api;

public class UnsubscribeNewsletter
{
    private readonly ILogger<UnsubscribeNewsletter> _logger;
    private readonly INewsletterService _newsletterService;

    public UnsubscribeNewsletter(ILogger<UnsubscribeNewsletter> logger, INewsletterService newsletterService)
    {
        _logger = logger;
        _newsletterService = newsletterService;
    }

    [Function("UnsubscribeNewsletter")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", "post", Route = "newsletter/unsubscribe")] HttpRequestData req,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("UnsubscribeNewsletter Function Triggered");

        if (!await _newsletterService.IsConfiguredAsync())
        {
            return await CreateHtmlResponseAsync(req, HttpStatusCode.ServiceUnavailable,
                "Newsletter service is not available. Please try again later.", "en", false);
        }

        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var token = query["token"];
        var email = query["email"];

        if (string.IsNullOrWhiteSpace(token) || string.IsNullOrWhiteSpace(email))
        {
            return await CreateHtmlResponseAsync(req, HttpStatusCode.BadRequest,
                "Invalid unsubscribe link.", "en", false);
        }

        try
        {
            var subscriber = await _newsletterService.GetSubscriberAsync(email);
            if (subscriber == null)
            {
                return await CreateHtmlResponseAsync(req, HttpStatusCode.BadRequest,
                    "This subscription was not found or is already unsubscribed.", "en", false);
            }

            // Verify the unsubscribe token matches (constant-time comparison)
            var expectedTokenBytes = System.Text.Encoding.UTF8.GetBytes(subscriber.UnsubscribeToken);
            var providedTokenBytes = System.Text.Encoding.UTF8.GetBytes(token);
            if (expectedTokenBytes.Length != providedTokenBytes.Length ||
                !CryptographicOperations.FixedTimeEquals(expectedTokenBytes, providedTokenBytes))
            {
                return await CreateHtmlResponseAsync(req, HttpStatusCode.BadRequest,
                    "This subscription was not found or is already unsubscribed.", "en", false);
            }

            // GET shows confirmation page; POST performs the unsubscribe
            if (req.Method.Equals("GET", StringComparison.OrdinalIgnoreCase))
            {
                return await CreateConfirmationPageAsync(req, token, email, subscriber.Language);
            }

            subscriber.Status = "unsubscribed";
            await _newsletterService.UpdateSubscriberAsync(subscriber);

            _logger.LogInformation("Newsletter subscriber unsubscribed");

            var lang = subscriber.Language;
            var successMessage = lang switch
            {
                "es" => "Has sido dado de baja del boletín. Lamentamos verte partir.",
                "pt" => "Você foi desinscrito do boletim. Lamentamos ver você partir.",
                _ => "You have been unsubscribed from the newsletter. We're sorry to see you go."
            };

            return await CreateHtmlResponseAsync(req, HttpStatusCode.OK, successMessage, lang, true);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error processing newsletter unsubscription");
            return await CreateHtmlResponseAsync(req, HttpStatusCode.InternalServerError,
                "An error occurred. Please try again later.", "en", false);
        }
    }

    private static async Task<HttpResponseData> CreateConfirmationPageAsync(HttpRequestData req, string token, string email, string language)
    {
        var title = language switch
        {
            "es" => "Confirmar Cancelación",
            "pt" => "Confirmar Cancelamento",
            _ => "Confirm Unsubscribe"
        };
        var promptMessage = language switch
        {
            "es" => "¿Estás seguro de que deseas cancelar tu suscripción al boletín?",
            "pt" => "Tem certeza de que deseja cancelar sua assinatura do boletim?",
            _ => "Are you sure you want to unsubscribe from the newsletter?"
        };
        var buttonText = language switch
        {
            "es" => "Sí, cancelar suscripción",
            "pt" => "Sim, cancelar assinatura",
            _ => "Yes, unsubscribe"
        };
        var actionUrl = $"/api/newsletter/unsubscribe?token={Uri.EscapeDataString(token)}&email={Uri.EscapeDataString(email)}";

        var response = req.CreateResponse(HttpStatusCode.OK);
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
                    button { background-color: #d32f2f; color: white; border: none; padding: 12px 24px; font-size: 16px; border-radius: 4px; cursor: pointer; margin-top: 1rem; }
                    button:hover { background-color: #b71c1c; }
                </style>
            </head>
            <body>
                <div class="container">
                    <h2>{{title}}</h2>
                    <p>{{promptMessage}}</p>
                    <form method="POST" action="{{actionUrl}}">
                        <button type="submit">{{buttonText}}</button>
                    </form>
                </div>
            </body>
            </html>
            """);
        return response;
    }

    private static async Task<HttpResponseData> CreateHtmlResponseAsync(HttpRequestData req, HttpStatusCode statusCode, string message, string language, bool success)
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
        var title = success
            ? (language switch { "es" => "Suscripción Cancelada", "pt" => "Assinatura Cancelada", _ => "Unsubscribed" })
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

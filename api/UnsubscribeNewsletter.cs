using System.Net;
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

        // Read token from query string; override from JSON body if Content-Type is application/json
        var qs = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        string? token = qs["token"];
        if (req.Method.Equals("POST", StringComparison.OrdinalIgnoreCase) &&
            req.Headers.TryGetValues("Content-Type", out var contentTypeValues) &&
            contentTypeValues.Any(ct => ct.StartsWith("application/json", StringComparison.OrdinalIgnoreCase)))
        {
            try
            {
                var body = await req.ReadFromJsonAsync<UnsubscribeRequest>(cancellationToken);
                if (!string.IsNullOrWhiteSpace(body?.Token))
                    token = body.Token;
            }
            catch (System.Text.Json.JsonException)
            {
                // Ignore malformed JSON — fall through to query string token
            }
        }

        if (string.IsNullOrWhiteSpace(token))
        {
            return await CreateHtmlResponseAsync(req, HttpStatusCode.BadRequest,
                "Invalid unsubscribe link.", "en", false);
        }

        try
        {
            var subscriber = await _newsletterService.GetSubscriberByUnsubscribeTokenAsync(token);
            if (subscriber == null)
            {
                return await CreateHtmlResponseAsync(req, HttpStatusCode.BadRequest,
                    "This subscription was not found.", "en", false);
            }

            // Already unsubscribed — show success page without re-writing to DB
            if (subscriber.Status == "unsubscribed")
            {
                var alreadyMessage = subscriber.Language switch
                {
                    "es" => "Ya has sido dado de baja del boletín.",
                    "pt" => "Você já foi desinscrito do boletim.",
                    _ => "You are already unsubscribed from the newsletter."
                };
                return await CreateHtmlResponseAsync(req, HttpStatusCode.OK, alreadyMessage, subscriber.Language, true);
            }

            // GET shows confirmation page; POST performs the unsubscribe
            if (req.Method.Equals("GET", StringComparison.OrdinalIgnoreCase))
            {
                return await CreateConfirmationPageAsync(req, token, subscriber.Language);
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

    private static async Task<HttpResponseData> CreateConfirmationPageAsync(HttpRequestData req, string token, string language)
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
        var actionUrl = System.Net.WebUtility.HtmlEncode($"/api/newsletter/unsubscribe?token={Uri.EscapeDataString(token)}");

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

    private record UnsubscribeRequest(string? Token);
}

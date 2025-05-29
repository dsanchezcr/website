using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Azure.Communication.Email;
using Azure;
using System.Text.Json;

namespace api;

public class SendEmail
{
    private readonly ILogger<SendEmail> _logger;
    private static readonly EmailClient _emailClient = new(Environment.GetEnvironmentVariable("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING"));

    // Localization dictionaries
    private static readonly Dictionary<string, Dictionary<string, string>> Localizations = new()
    {
        ["en"] = new()
        {
            ["notificationSubject"] = "New website message from {0}",
            ["notificationTitle"] = "New Contact Form Submission",
            ["confirmationSubject"] = "Thank you for contacting David Sanchez",
            ["confirmationGreeting"] = "Hello {0},",
            ["confirmationMessage"] = "Thank you very much for your message. I will try to get back to you as soon as possible.",
            ["confirmationSignature"] = "Best regards,<br/>David Sanchez",
            ["successMessage"] = "Emails sent successfully.",
            ["partialErrorMessage"] = "Some emails could not be sent. Please try again.",
            ["fieldLabels"] = "Name:|Email:|Message:"
        },
        ["es"] = new()
        {
            ["notificationSubject"] = "Nuevo mensaje del sitio web de {0}",
            ["notificationTitle"] = "Nueva Consulta del Formulario de Contacto",
            ["confirmationSubject"] = "Gracias por contactar a David Sanchez",
            ["confirmationGreeting"] = "Hola {0},",
            ["confirmationMessage"] = "Muchas gracias por tu mensaje. Trataré de responderte lo antes posible.",
            ["confirmationSignature"] = "Saludos cordiales,<br/>David Sanchez",
            ["successMessage"] = "Correos enviados exitosamente.",
            ["partialErrorMessage"] = "Algunos correos no pudieron ser enviados. Por favor intenta de nuevo.",
            ["fieldLabels"] = "Nombre:|Correo:|Mensaje:"
        },
        ["pt"] = new()
        {
            ["notificationSubject"] = "Nova mensagem do site de {0}",
            ["notificationTitle"] = "Nova Submissão do Formulário de Contato",
            ["confirmationSubject"] = "Obrigado por entrar em contato com David Sanchez",
            ["confirmationGreeting"] = "Olá {0},",
            ["confirmationMessage"] = "Muito obrigado pela sua mensagem. Tentarei responder o mais breve possível.",
            ["confirmationSignature"] = "Atenciosamente,<br/>David Sanchez",
            ["successMessage"] = "E-mails enviados com sucesso.",
            ["partialErrorMessage"] = "Alguns e-mails não puderam ser enviados. Por favor, tente novamente.",
            ["fieldLabels"] = "Nome:|E-mail:|Mensagem:"
        }
    };

    private static string GetLocalizedText(string language, string key, params object[] args)
    {
        var lang = Localizations.ContainsKey(language) ? language : "en";
        var text = Localizations[lang].GetValueOrDefault(key, Localizations["en"][key]);
        return args.Length > 0 ? string.Format(text, args) : text;
    }

    // Input model for request validation
    private record ContactRequest(string Name, string Email, string Message, string Language = "en");

    public SendEmail(ILogger<SendEmail> logger)
    {
        _logger = logger;
    }

    [Function("SendEmail")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "contact")] HttpRequestData req,
        CancellationToken cancellationToken = default)
    {
        using var activity = _logger.BeginScope("SendEmail Function");
        _logger.LogInformation("SendEmail Function Triggered");

        try
        {
            // Parse request body
            var contactRequest = await ParseRequestAsync(req, cancellationToken);
            if (contactRequest == null)
            {
                return await CreateErrorResponseAsync(req, HttpStatusCode.BadRequest, 
                    "Invalid request. Please provide name, email, and message in JSON format.");
            }

            // Validate email format
            if (!IsValidEmail(contactRequest.Email))
            {
                return await CreateErrorResponseAsync(req, HttpStatusCode.BadRequest, 
                    "Invalid email format.");
            }

            // Send emails concurrently for better performance
            var tasks = new[]
            {
                SendNotificationEmailAsync(contactRequest, cancellationToken),
                SendConfirmationEmailAsync(contactRequest, cancellationToken)
            };            var results = await Task.WhenAll(tasks);
            
            if (results.All(r => r.HasCompleted))
            {
                _logger.LogInformation("Both emails sent successfully for {Email}", contactRequest.Email);
                var successMessage = GetLocalizedText(contactRequest.Language, "successMessage");
                return await CreateSuccessResponseAsync(req, successMessage);
            }
            else
            {
                _logger.LogWarning("Some emails failed to send for {Email}", contactRequest.Email);
                var errorMessage = GetLocalizedText(contactRequest.Language, "partialErrorMessage");
                return await CreateErrorResponseAsync(req, HttpStatusCode.PartialContent, errorMessage);
            }
        }
        catch (OperationCanceledException)
        {
            _logger.LogWarning("SendEmail operation was cancelled");
            return await CreateErrorResponseAsync(req, HttpStatusCode.RequestTimeout, 
                "Request timeout. Please try again.");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error in SendEmail function");
            return await CreateErrorResponseAsync(req, HttpStatusCode.InternalServerError, 
                "An unexpected error occurred. Please try again later.");
        }
    }

    private async Task<ContactRequest?> ParseRequestAsync(HttpRequestData req, CancellationToken cancellationToken)
    {
        try
        {
            var requestBody = await new StreamReader(req.Body).ReadToEndAsync(cancellationToken);
            
            if (string.IsNullOrWhiteSpace(requestBody))
                return null;

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            var data = JsonSerializer.Deserialize<ContactRequest>(requestBody, options);
            
            // Validate required fields
            if (string.IsNullOrWhiteSpace(data?.Name) || 
                string.IsNullOrWhiteSpace(data?.Email) || 
                string.IsNullOrWhiteSpace(data?.Message))
            {
                return null;
            }

            return data;
        }
        catch (JsonException ex)
        {
            _logger.LogWarning(ex, "Failed to parse JSON request body");
            return null;        }
    }

    private static bool IsValidEmail(string email)
    {
        try
        {
            var addr = new System.Net.Mail.MailAddress(email);
            return addr.Address == email;
        }
        catch
        {
            return false;        }
    }

    private async Task<EmailSendOperation> SendNotificationEmailAsync(ContactRequest contact, CancellationToken cancellationToken)
    {
        try
        {
            var fieldLabels = GetLocalizedText(contact.Language, "fieldLabels").Split('|');
            var subject = GetLocalizedText(contact.Language, "notificationSubject", contact.Name);
            var title = GetLocalizedText(contact.Language, "notificationTitle");

            var operation = await _emailClient.SendAsync(
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
                        </body>
                    </html>
                    """,
                cancellationToken: cancellationToken);

            _logger.LogInformation("Notification email sent with ID: {MessageId}, Status: {Status}", 
                operation.Id, operation.Value.Status);
            
            return operation;
        }
        catch (RequestFailedException ex)
        {
            _logger.LogError(ex, "Failed to send notification email. Error: {ErrorCode}", ex.ErrorCode);
            throw;        }
    }

    private async Task<EmailSendOperation> SendConfirmationEmailAsync(ContactRequest contact, CancellationToken cancellationToken)
    {
        try
        {
            var subject = GetLocalizedText(contact.Language, "confirmationSubject");
            var greeting = GetLocalizedText(contact.Language, "confirmationGreeting", contact.Name);
            var message = GetLocalizedText(contact.Language, "confirmationMessage");
            var signature = GetLocalizedText(contact.Language, "confirmationSignature");

            var operation = await _emailClient.SendAsync(
                wait: WaitUntil.Completed,
                senderAddress: "DoNotReply@dsanchezcr.com",
                recipientAddress: contact.Email,
                subject: subject,
                htmlContent: $"""
                    <html>
                        <body style="font-family: Arial, sans-serif;">
                            <h2>{(contact.Language == "es" ? "¡Gracias por comunicarte!" : 
                                  contact.Language == "pt" ? "Obrigado por entrar em contato!" : 
                                  "Thank you for reaching out!")}</h2>
                            <p>{greeting}</p>
                            <p>{message}</p>
                            <p>{signature}</p>
                        </body>
                    </html>
                    """,
                cancellationToken: cancellationToken);

            _logger.LogInformation("Confirmation email sent with ID: {MessageId}, Status: {Status}", 
                operation.Id, operation.Value.Status);
            
            return operation;
        }
        catch (RequestFailedException ex)
        {
            _logger.LogError(ex, "Failed to send confirmation email to {Email}. Error: {ErrorCode}", 
                contact.Email, ex.ErrorCode);
            throw;
        }
    }

    private static async Task<HttpResponseData> CreateSuccessResponseAsync(HttpRequestData req, string message)
    {
        var response = req.CreateResponse(HttpStatusCode.OK);
        response.Headers.Add("Content-Type", "application/json");
        await response.WriteStringAsync(JsonSerializer.Serialize(new { success = true, message }));
        return response;
    }

    private static async Task<HttpResponseData> CreateErrorResponseAsync(HttpRequestData req, HttpStatusCode statusCode, string message)
    {
        var response = req.CreateResponse(statusCode);
        response.Headers.Add("Content-Type", "application/json");
        await response.WriteStringAsync(JsonSerializer.Serialize(new { success = false, error = message }));
        return response;
    }
}
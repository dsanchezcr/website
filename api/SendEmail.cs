using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using Azure.Communication.Email;
using Azure;
using System.Text.Json;

namespace api;

public partial class SendEmail
{
    private readonly ILogger<SendEmail> _logger;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly IMemoryCache _cache;
    private static readonly EmailClient _emailClient = new(Environment.GetEnvironmentVariable("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING"));
    
    // Rate limiting configuration
    private const int MaxSubmissionsPerIpPerHour = 3;
    private const int MaxSubmissionsPerEmailPerDay = 2;
    private const double MinRecaptchaScore = 0.5;
    
    // Spam detection patterns
    [GeneratedRegex(@"(https?://|www\.)", RegexOptions.IgnoreCase)]
    private static partial Regex UrlPattern();
    
    [GeneratedRegex(@"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", RegexOptions.IgnoreCase)]
    private static partial Regex EmailPattern();
    
    [GeneratedRegex(@"(viagra|cialis|crypto|lottery|winner|prize|bitcoin|forex|casino|poker)", RegexOptions.IgnoreCase)]
    private static partial Regex SpamKeywords();

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
            ["verificationSent"] = "Please check your email to verify your contact request.",
            ["verificationSubject"] = "Verify your contact request",
            ["verificationMessage"] = "Please click the link below to verify your contact request:<br/><br/><a href=\"{0}\">Verify Email</a><br/><br/>This link will expire in 24 hours.",
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
            ["verificationSent"] = "Por favor revisa tu correo para verificar tu solicitud de contacto.",
            ["verificationSubject"] = "Verifica tu solicitud de contacto",
            ["verificationMessage"] = "Por favor haz clic en el enlace a continuación para verificar tu solicitud de contacto:<br/><br/><a href=\"{0}\">Verificar Correo</a><br/><br/>Este enlace expirará en 24 horas.",
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
            ["verificationSent"] = "Por favor, verifique seu e-mail para confirmar sua solicitação de contato.",
            ["verificationSubject"] = "Verifique sua solicitação de contato",
            ["verificationMessage"] = "Por favor, clique no link abaixo para verificar sua solicitação de contato:<br/><br/><a href=\"{0}\">Verificar E-mail</a><br/><br/>Este link expirará em 24 horas.",
            ["fieldLabels"] = "Nome:|E-mail:|Mensagem:"
        }
    };

    private static string GetLocalizedText(string language, string key, params object[] args)
    {
        var lang = Localizations.ContainsKey(language) ? language : "en";
        var text = Localizations[lang].GetValueOrDefault(key, Localizations["en"][key]);
        return args.Length > 0 ? string.Format(text, args) : text;
    }

    // Data models
    private record ContactRequest(string Name, string Email, string Message, string Language = "en", string RecaptchaToken = "", string Website = "");
    private record VerificationData(string Name, string Email, string Message, string Language);
    private record SpamCheckResult(bool IsValid, string Reason);
    private record RecaptchaResponse(bool Success, double Score, string Action, DateTime ChallengeTs, string Hostname, string[] ErrorCodes);

    // Helper methods
    private static string GetClientIp(HttpRequestData req)
    {
        // Check for forwarded IP first (common in Azure)
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

    private async Task<double> ValidateRecaptchaAsync(string token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            _logger.LogWarning("No reCAPTCHA token provided");
            return 0.0;
        }

        try
        {
            var secretKey = Environment.GetEnvironmentVariable("RECAPTCHA_SECRET_KEY");
            if (string.IsNullOrWhiteSpace(secretKey))
            {
                _logger.LogError("RECAPTCHA_SECRET_KEY not configured");
                return 0.0;
            }

            var httpClient = _httpClientFactory.CreateClient();
            var response = await httpClient.PostAsync(
                $"https://www.google.com/recaptcha/api/siteverify?secret={secretKey}&response={token}",
                null,
                cancellationToken);

            var result = await response.Content.ReadFromJsonAsync<RecaptchaResponse>(cancellationToken);
            
            if (result == null || !result.Success)
            {
                _logger.LogWarning("reCAPTCHA validation failed: {Errors}", 
                    result?.ErrorCodes != null ? string.Join(", ", result.ErrorCodes) : "Unknown error");
                return 0.0;
            }

            _logger.LogInformation("reCAPTCHA validation successful. Score: {Score}", result.Score);
            return result.Score;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error validating reCAPTCHA");
            return 0.0;
        }
    }

    private bool CheckRateLimit(string clientIp, string email)
    {
        // Check IP-based rate limit
        var ipKey = $"ratelimit:ip:{clientIp}";
        if (!_cache.TryGetValue<int>(ipKey, out var ipCount))
        {
            ipCount = 0;
        }
        
        if (ipCount >= MaxSubmissionsPerIpPerHour)
        {
            return false;
        }
        
        _cache.Set(ipKey, ipCount + 1, TimeSpan.FromHours(1));

        // Check email-based rate limit
        var emailKey = $"ratelimit:email:{email.ToLowerInvariant()}";
        if (!_cache.TryGetValue<int>(emailKey, out var emailCount))
        {
            emailCount = 0;
        }
        
        if (emailCount >= MaxSubmissionsPerEmailPerDay)
        {
            return false;
        }
        
        _cache.Set(emailKey, emailCount + 1, TimeSpan.FromDays(1));
        
        return true;
    }

    private static SpamCheckResult CheckForSpam(ContactRequest contact)
    {
        // Check for excessive URLs
        var urlMatches = UrlPattern().Matches(contact.Message);
        if (urlMatches.Count > 2)
        {
            return new SpamCheckResult(false, "Too many URLs in message");
        }

        // Check for multiple email addresses (common in spam)
        var emailMatches = EmailPattern().Matches(contact.Message);
        if (emailMatches.Count > 1)
        {
            return new SpamCheckResult(false, "Multiple email addresses detected");
        }

        // Check for spam keywords
        if (SpamKeywords().IsMatch(contact.Message))
        {
            return new SpamCheckResult(false, "Spam keywords detected");
        }

        // Check message length (too short or too long can be suspicious)
        if (contact.Message.Length < 10)
        {
            return new SpamCheckResult(false, "Message too short");
        }

        if (contact.Message.Length > 5000)
        {
            return new SpamCheckResult(false, "Message too long");
        }

        // Check for repetitive characters (common in spam)
        if (Regex.IsMatch(contact.Message, @"(.)\1{10,}"))
        {
            return new SpamCheckResult(false, "Repetitive characters detected");
        }

        // Check name format (should not contain numbers or special characters)
        if (Regex.IsMatch(contact.Name, @"[0-9@#$%^&*()+=\[\]{};:""\\|<>?/]"))
        {
            return new SpamCheckResult(false, "Invalid name format");
        }

        return new SpamCheckResult(true, string.Empty);
    }

    private static string GenerateVerificationToken()
    {
        var bytes = new byte[32];
        RandomNumberGenerator.Fill(bytes);
        return Convert.ToBase64String(bytes).Replace("+", "-").Replace("/", "_").Replace("=", "");
    }

    private async Task SendVerificationEmailAsync(ContactRequest contact, string token, CancellationToken cancellationToken)
    {
        try
        {
            var baseUrl = Environment.GetEnvironmentVariable("WEBSITE_URL") ?? "https://dsanchezcr.com";
            var verificationUrl = $"{baseUrl}/api/verify?token={token}";
            
            var subject = GetLocalizedText(contact.Language, "verificationSubject");
            var message = GetLocalizedText(contact.Language, "verificationMessage", verificationUrl);

            var operation = await _emailClient.SendAsync(
                wait: WaitUntil.Completed,
                senderAddress: "DoNotReply@dsanchezcr.com",
                recipientAddress: contact.Email,
                subject: subject,
                htmlContent: $"""
                    <html>
                        <body style="font-family: Arial, sans-serif;">
                            <h2>{subject}</h2>
                            <p>{message}</p>
                            <p style="color: #666; font-size: 12px;">If you did not request this, please ignore this email.</p>
                        </body>
                    </html>
                    """,
                cancellationToken: cancellationToken);

            _logger.LogInformation("Verification email sent with ID: {MessageId}", operation.Id);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to send verification email to {Email}", contact.Email);
            throw;
        }
    }

    public SendEmail(ILogger<SendEmail> logger, IHttpClientFactory httpClientFactory, IMemoryCache cache)
    {
        _logger = logger;
        _httpClientFactory = httpClientFactory;
        _cache = cache;
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
            // Get client IP for rate limiting
            var clientIp = GetClientIp(req);
            
            // Parse request body
            var contactRequest = await ParseRequestAsync(req, cancellationToken);
            if (contactRequest == null)
            {
                return await CreateErrorResponseAsync(req, HttpStatusCode.BadRequest, 
                    "Invalid request. Please provide name, email, and message in JSON format.");
            }

            // Check honeypot field (should be empty for legitimate users)
            if (!string.IsNullOrWhiteSpace(contactRequest.Website))
            {
                _logger.LogWarning("Honeypot triggered from IP: {ClientIp}", clientIp);
                await Task.Delay(2000, cancellationToken); // Delay to waste bot time
                return await CreateSuccessResponseAsync(req, GetLocalizedText(contactRequest.Language, "successMessage"));
            }

            // Validate reCAPTCHA token
            var recaptchaScore = await ValidateRecaptchaAsync(contactRequest.RecaptchaToken, cancellationToken);
            if (recaptchaScore < MinRecaptchaScore)
            {
                _logger.LogWarning("Low reCAPTCHA score {Score} from IP: {ClientIp}", recaptchaScore, clientIp);
                return await CreateErrorResponseAsync(req, HttpStatusCode.BadRequest, 
                    "Security validation failed. Please try again.");
            }

            // Check rate limits
            if (!CheckRateLimit(clientIp, contactRequest.Email))
            {
                _logger.LogWarning("Rate limit exceeded from IP: {ClientIp}, Email: {Email}", clientIp, contactRequest.Email);
                return await CreateErrorResponseAsync(req, HttpStatusCode.TooManyRequests, 
                    "Too many requests. Please try again later.");
            }

            // Validate email format
            if (!IsValidEmail(contactRequest.Email))
            {
                return await CreateErrorResponseAsync(req, HttpStatusCode.BadRequest, 
                    "Invalid email format.");
            }
            
            // Spam detection
            var spamCheckResult = CheckForSpam(contactRequest);
            if (!spamCheckResult.IsValid)
            {
                _logger.LogWarning("Spam detected from {Email}: {Reason}", contactRequest.Email, spamCheckResult.Reason);
                return await CreateErrorResponseAsync(req, HttpStatusCode.BadRequest, 
                    "Your message appears to contain spam. Please remove any links or promotional content.");
            }

            // Generate verification token and store request data
            var verificationToken = GenerateVerificationToken();
            var cacheKey = $"verification:{verificationToken}";
            var cacheData = new VerificationData(contactRequest.Name, contactRequest.Email, contactRequest.Message, contactRequest.Language);
            _cache.Set(cacheKey, cacheData, TimeSpan.FromHours(24));

            // Send verification email to the user
            await SendVerificationEmailAsync(contactRequest, verificationToken, cancellationToken);
            
            _logger.LogInformation("Verification email sent to {Email} with token {Token}", contactRequest.Email, verificationToken);
            
            var successMessage = GetLocalizedText(contactRequest.Language, "verificationSent");
            return await CreateSuccessResponseAsync(req, successMessage);
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
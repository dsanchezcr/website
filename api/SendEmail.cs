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
    
    // Disposable email domains to block
    // This is a comprehensive list of ~150 well-known disposable email services.
    // For production systems with higher security needs, consider integrating with
    // a dedicated API service (e.g., Kickbox, ZeroBounce, or similar).
    private static readonly HashSet<string> DisposableEmailDomains = new(StringComparer.OrdinalIgnoreCase)
    {
        // Popular temporary email services
        "10minutemail.com", "10minutemail.net", "10minutemail.org", "10minmail.com",
        "20minutemail.com", "33mail.com", "temp-mail.org", "tempmail.com", "tempmail.net",
        "tempmail.de", "tempmail.it", "temp-mail.io", "temp-mail.ru", "tmpmail.org",
        "tmpmail.net", "tempr.email", "tempinbox.com", "tempinbox.co.uk",
        
        // Guerrilla Mail variants
        "guerrillamail.com", "guerrillamail.net", "guerrillamail.org", "guerrillamail.biz",
        "guerrillamail.de", "guerrillamail.info", "guerrillamailblock.com", "grr.la",
        "sharklasers.com", "spam4.me", "pokemail.net",
        
        // Mailinator variants
        "mailinator.com", "mailinator.net", "mailinator.org", "mailinator2.com",
        "mailinater.com", "tradermail.info", "reallymymail.com", "reconmail.com",
        "safetymail.info", "sendspamhere.com", "sogetthis.com", "spamherelots.com",
        "thisisnotmyrealemail.com", "veryrealemail.com", "binkmail.com", "bobmail.info",
        
        // Other popular disposable services
        "throwaway.email", "throwawaymail.com", "fakeinbox.com", "fakemailgenerator.com",
        "trashmail.com", "trashmail.net", "trashmail.org", "trashmail.de", "trashmail.ws",
        "mailnesia.com", "maildrop.cc", "dispostable.com", "disposableemailaddresses.com",
        "getnada.com", "nada.email", "anonbox.net", "anonymbox.com",
        
        // YOPmail variants
        "yopmail.com", "yopmail.fr", "yopmail.net", "cool.fr.nf", "jetable.fr.nf",
        "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf",
        "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf",
        
        // Spamgourmet variants
        "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
        
        // MailDrop variants
        "maildrop.cc", "mailsac.com", "inboxkitten.com",
        
        // Other common services
        "emailondeck.com", "mohmal.com", "mohmal.tech", "discard.email", "discardmail.com",
        "mintemail.com", "mytemp.email", "mytrashmail.com", "mt2009.com", "mt2014.com",
        "mailcatch.com", "getairmail.com", "wegwerfmail.de", "wegwerfmail.net",
        "wegwerfmail.org", "boun.cr", "mailnull.com", "e4ward.com", "spambox.us",
        "spamfree24.org", "spamfree24.de", "spamfree24.eu", "spamfree24.info",
        "spamfree24.net", "spamcero.com", "kasmail.com", "incognitomail.com",
        "incognitomail.net", "incognitomail.org", "mailforspam.com", "spam.la",
        "tempomail.fr", "tempemail.com", "tempemail.net", "tempsky.com", "emailtemporario.com.br",
        "crazymailing.com", "fakemailgenerator.net", "emailfake.com", "armyspy.com",
        "cuvox.de", "dayrep.com", "einrot.com", "fleckens.hu", "gustr.com",
        "jourrapide.com", "rhyta.com", "superrito.com", "teleworm.us",
        
        // Burner mail services
        "burnermail.io", "burner.kiwi", "burnermailbox.com",
        
        // 5-minute mail variants
        "5minutemail.com", "5minutemail.net",
        
        // Additional well-known services
        "mailexpire.com", "mailmoat.com", "mailnator.com", "mailscrap.com",
        "mailzilla.com", "mailzilla.org", "nomail.net", "nowmymail.com",
        "objectmail.com", "obobbo.com", "onewaymail.com", "oopi.org",
        "owlpic.com", "proxymail.eu", "punkass.com", "putthisinyourspamdatabase.com",
        "quickinbox.com", "rcpt.at", "rklips.com", "rmqkr.net",
        "rppkn.com", "rtrtr.com", "s0ny.net", "safe-mail.net",
        "safersignup.de", "safetypost.de", "sandelf.de", "saynotospams.com",
        "selfdestructingmail.com", "shiftmail.com", "sinnlos-mail.de", "slaskpost.se",
        "slopsbox.com", "smellfear.com", "snakemail.com", "sneakemail.com",
        "sofimail.com", "sofort-mail.de", "sogetthis.com", "soodonims.com",
        "spam.su", "spamavert.com", "spambob.com", "spambob.net",
        "spambob.org", "spambog.com", "spambog.de", "spambog.net",
        "spambog.ru", "spambox.info", "spambox.irishspringrealty.com",
        "spambox.us", "spamcannon.com", "spamcannon.net", "spamcero.com",
        "spamcon.org", "spamcorptastic.com", "spamcowboy.com", "spamcowboy.net",
        "spamcowboy.org", "spamday.com", "spamex.com", "spamfree.eu",
        "spamfree24.com", "spamfree24.de", "spamfree24.eu", "spamfree24.info",
        "spamfree24.net", "spamfree24.org", "spamgoes.in", "spamherelots.com",
        "spamhole.com", "spamify.com", "spaminator.de", "spamkill.info"
    };
    
    // Spam detection patterns
    [GeneratedRegex(@"(https?://|www\.)", RegexOptions.IgnoreCase)]
    private static partial Regex UrlPattern();
    
    [GeneratedRegex(@"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", RegexOptions.IgnoreCase)]
    private static partial Regex EmailPattern();
    
    [GeneratedRegex(@"(viagra|cialis|crypto|lottery|winner|prize|bitcoin|forex|casino|poker)", RegexOptions.IgnoreCase)]
    private static partial Regex SpamKeywords();

    // Data models
    private class ContactRequest
    {
        public string Name { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public string Message { get; set; } = string.Empty;
        public string Language { get; set; } = "en";
        public string RecaptchaToken { get; set; } = string.Empty;
        public string Website { get; set; } = string.Empty;
    }
    
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
            // Prefer API_URL for the Functions endpoint; fall back to WEBSITE_URL, then to the production default
            var apiUrl = Environment.GetEnvironmentVariable("API_URL")
                ?? Environment.GetEnvironmentVariable("WEBSITE_URL")
                ?? "https://dsanchezcr.azurewebsites.net";
            var verificationUrl = $"{apiUrl}/api/verify?token={token}";
            
            var subject = LocalizationHelper.GetText(contact.Language, "verificationSubject");
            var message = LocalizationHelper.GetText(contact.Language, "verificationMessage", verificationUrl);

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
        // Note: CORS is handled at the Azure Function App platform level.
        // OPTIONS preflight requests are automatically handled by Azure.

        using var activity = _logger.BeginScope("SendEmail Function");
        _logger.LogInformation("SendEmail Function Triggered from IP: {ClientIp}", GetClientIp(req));

        try
        {
            // Get client IP for rate limiting
            var clientIp = GetClientIp(req);
            
            // Parse request body
            var contactRequest = await ParseRequestAsync(req, cancellationToken);
            if (contactRequest == null)
            {
                _logger.LogWarning("Failed to parse contact request, returning 400");
                return await CreateErrorResponseAsync(req, HttpStatusCode.BadRequest, 
                    "Invalid request. Please provide name, email, and message in JSON format.");
            }

            // Check honeypot field (should be empty for legitimate users)
            if (!string.IsNullOrWhiteSpace(contactRequest.Website))
            {
                _logger.LogWarning("Honeypot triggered from IP: {ClientIp}", clientIp);
                await Task.Delay(2000, cancellationToken); // Delay to waste bot time
                return await CreateSuccessResponseAsync(req, LocalizationHelper.GetText(contactRequest.Language, "successMessage"));
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
            
            // Check for disposable email addresses
            if (IsDisposableEmail(contactRequest.Email))
            {
                _logger.LogWarning("Disposable email detected: {EmailDomain}", contactRequest.Email.Split('@').LastOrDefault());
                return await CreateErrorResponseAsync(req, HttpStatusCode.BadRequest, 
                    "Please use a valid email address. Temporary/disposable emails are not accepted.");
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
            
            var successMessage = LocalizationHelper.GetText(contactRequest.Language, "verificationSent");
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
            {
                _logger.LogWarning("Request body is empty");
                return null;
            }

            var options = new JsonSerializerOptions
            {
                PropertyNameCaseInsensitive = true,
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            };

            var data = JsonSerializer.Deserialize<ContactRequest>(requestBody, options);
            
            if (data == null)
            {
                _logger.LogWarning("Deserialization returned null");
                return null;
            }
            
            // Sanitize inputs - trim whitespace
            data.Name = data.Name?.Trim() ?? string.Empty;
            data.Email = data.Email?.Trim().ToLowerInvariant() ?? string.Empty;
            data.Message = data.Message?.Trim() ?? string.Empty;
            var rawLanguage = data.Language?.Trim().ToLowerInvariant();
            
            // Validate and normalize language - supported: en, es, pt
            if (string.IsNullOrWhiteSpace(rawLanguage) ||
                (rawLanguage != "en" && rawLanguage != "es" && rawLanguage != "pt"))
            {
                _logger.LogWarning("Unsupported or missing language '{OriginalLanguage}'. Falling back to default language 'en'.",
                    rawLanguage);
                data.Language = "en";
            }
            else
            {
                data.Language = rawLanguage;
            }
            
            _logger.LogInformation("Contact request received - HasName: {HasName}, HasEmail: {HasEmail}, HasMessage: {HasMessage}, Language: {Language}", 
                !string.IsNullOrWhiteSpace(data.Name), 
                !string.IsNullOrWhiteSpace(data.Email), 
                !string.IsNullOrWhiteSpace(data.Message), 
                data.Language);
            
            // Validate required fields
            if (string.IsNullOrWhiteSpace(data.Name))
            {
                _logger.LogWarning("Name is missing");
                return null;
            }
            
            // Validate name length
            if (data.Name.Length < 2 || data.Name.Length > 100)
            {
                _logger.LogWarning("Name length invalid: {Length}", data.Name.Length);
                return null;
            }
            
            if (string.IsNullOrWhiteSpace(data.Email))
            {
                _logger.LogWarning("Email is missing");
                return null;
            }
            
            if (string.IsNullOrWhiteSpace(data.Message))
            {
                _logger.LogWarning("Message is missing");
                return null;
            }

            return data;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Failed to parse JSON request body");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Unexpected error parsing request");
            return null;
        }
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
            return false;
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
    
    // Note: CORS is handled at the Azure Function App platform level.
    // The AddCorsHeaders method has been removed as it's no longer needed.
    
    private static bool IsDisposableEmail(string email)
    {
        // Defensive checks in case this is called without prior IsValidEmail().
        if (string.IsNullOrWhiteSpace(email) || !email.Contains('@'))
        {
            return false;
        }
        
        var parts = email.Split('@');
        if (parts.Length < 2)
        {
            return false;
        }
        
        var domain = parts[parts.Length - 1].ToLowerInvariant();
        return DisposableEmailDomains.Contains(domain);
    }
}
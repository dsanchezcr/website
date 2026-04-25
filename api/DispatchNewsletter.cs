using System.Net;
using System.Security.Cryptography;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using Azure.Communication.Email;
using Azure;
using api.Services;

namespace api;

public class DispatchNewsletter
{
    private readonly ILogger<DispatchNewsletter> _logger;
    private readonly INewsletterService _newsletterService;

    private static readonly Lazy<EmailClient> _emailClient = new(() =>
    {
        var connectionString = Environment.GetEnvironmentVariable("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING");
        if (string.IsNullOrWhiteSpace(connectionString))
            throw new InvalidOperationException("AZURE_COMMUNICATION_SERVICES_CONNECTION_STRING not configured.");
        return new EmailClient(connectionString);
    });

    public DispatchNewsletter(ILogger<DispatchNewsletter> logger, INewsletterService newsletterService)
    {
        _logger = logger;
        _newsletterService = newsletterService;
    }

    [Function("DispatchNewsletter")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "newsletter/dispatch")] HttpRequestData req,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("DispatchNewsletter Function Triggered");

        // Authenticate with secret key (called by GitHub Actions)
        var dispatchKey = Environment.GetEnvironmentVariable("NEWSLETTER_DISPATCH_KEY");
        if (string.IsNullOrWhiteSpace(dispatchKey))
        {
            var unavailable = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            await unavailable.WriteAsJsonAsync(new { error = "Newsletter dispatch is not configured." });
            return unavailable;
        }

        if (!req.Headers.TryGetValues("X-Newsletter-Key", out var keyValues))
        {
            var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
            await unauthorized.WriteAsJsonAsync(new { error = "Invalid dispatch key." });
            return unauthorized;
        }

        var providedKeyBytes = System.Text.Encoding.UTF8.GetBytes(keyValues.First());
        var expectedKeyBytes = System.Text.Encoding.UTF8.GetBytes(dispatchKey);
        if (providedKeyBytes.Length != expectedKeyBytes.Length ||
            !CryptographicOperations.FixedTimeEquals(providedKeyBytes, expectedKeyBytes))
        {
            var unauthorized = req.CreateResponse(HttpStatusCode.Unauthorized);
            await unauthorized.WriteAsJsonAsync(new { error = "Invalid dispatch key." });
            return unauthorized;
        }

        if (!await _newsletterService.IsConfiguredAsync())
        {
            var unavailable = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            await unavailable.WriteAsJsonAsync(new { error = "Newsletter service is not configured." });
            return unavailable;
        }

        // Parse request body for content and frequency
        var body = await req.ReadFromJsonAsync<DispatchRequest>(cancellationToken);
        var frequency = body?.Frequency?.Trim();
        if (body == null || string.IsNullOrWhiteSpace(frequency) ||
            (!string.Equals(frequency, "weekly", StringComparison.OrdinalIgnoreCase) &&
             !string.Equals(frequency, "monthly", StringComparison.OrdinalIgnoreCase)))
        {
            var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
            await badRequest.WriteAsJsonAsync(new { error = "Frequency is required and must be either 'weekly' or 'monthly'." });
            return badRequest;
        }

        frequency = frequency.ToLowerInvariant();

        // Skip sending when there's no content
        var hasBlogPosts = body!.BlogPosts != null && body.BlogPosts.Count > 0;
        var hasCustomMessage = !string.IsNullOrWhiteSpace(body.CustomMessage);
        if (!hasBlogPosts && !hasCustomMessage)
        {
            var noContent = req.CreateResponse(HttpStatusCode.OK);
            await noContent.WriteAsJsonAsync(new { message = "No content to send. Dispatch skipped.", sent = 0 });
            return noContent;
        }

        try
        {
            var subscribers = await _newsletterService.GetActiveSubscribersByFrequencyAsync(frequency);

            // Filter by language if specified (workflow dispatches per-language)
            var language = body?.Language?.Trim()?.ToLowerInvariant();
            if (!string.IsNullOrEmpty(language))
            {
                subscribers = subscribers.Where(s => string.Equals(s.Language, language, StringComparison.OrdinalIgnoreCase)).ToList();
            }

            if (subscribers.Count == 0)
            {
                var noSubscribers = req.CreateResponse(HttpStatusCode.OK);
                await noSubscribers.WriteAsJsonAsync(new { message = "No active subscribers for this frequency.", sent = 0 });
                return noSubscribers;
            }

            var sent = 0;
            var failed = 0;
            var semaphore = new SemaphoreSlim(5); // Bounded concurrency

            var tasks = subscribers.Select(async subscriber =>
            {
                await semaphore.WaitAsync(cancellationToken);
                try
                {
                    // Skip subscribers already sent within current frequency window (idempotency)
                    if (subscriber.LastSentAt.HasValue)
                    {
                        var window = TimeSpan.FromDays(frequency == "weekly" ? 7 : 30);
                        if (subscriber.LastSentAt.Value.Add(window) > DateTime.UtcNow)
                        {
                            _logger.LogInformation("Skipping subscriber — already sent within {Frequency} window", frequency);
                            return;
                        }
                    }

                    await SendNewsletterEmailAsync(subscriber, body!, cancellationToken);
                    subscriber.LastSentAt = DateTime.UtcNow;
                    await _newsletterService.UpdateSubscriberAsync(subscriber);
                    Interlocked.Increment(ref sent);
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Failed to send newsletter to {Email}", subscriber.Email);
                    Interlocked.Increment(ref failed);
                }
                finally
                {
                    semaphore.Release();
                }
            });

            await Task.WhenAll(tasks);

            _logger.LogInformation("Newsletter dispatch completed: {Sent} sent, {Failed} failed", sent, failed);

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new { message = "Newsletter dispatch completed.", sent, failed, total = subscribers.Count });
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error dispatching newsletter");
            var error = req.CreateResponse(HttpStatusCode.InternalServerError);
            await error.WriteAsJsonAsync(new { error = "An error occurred during dispatch." });
            return error;
        }
    }

    private async Task SendNewsletterEmailAsync(Models.Newsletter.NewsletterSubscriber subscriber, DispatchRequest content, CancellationToken cancellationToken)
    {
        var lang = subscriber.Language;
        var subject = LocalizationHelper.GetText(lang, "newsletterSubject");
        var greeting = LocalizationHelper.GetText(lang, "newsletterGreeting");
        var footer = LocalizationHelper.GetText(lang, "newsletterFooter");
        var unsubscribeText = LocalizationHelper.GetText(lang, "newsletterUnsubscribe");
        var manageText = LocalizationHelper.GetText(lang, "newsletterManagePreferences");
        var newPostsTitle = LocalizationHelper.GetText(lang, "newsletterNewBlogPosts");
        var noContent = LocalizationHelper.GetText(lang, "newsletterNoContent");

        var websiteUrl = Environment.GetEnvironmentVariable("WEBSITE_URL") ?? "https://dsanchezcr.com";
        var langPrefix = lang == "en" ? "" : $"/{lang}";
        var unsubscribeUrl = $"{websiteUrl}/api/newsletter/unsubscribe?token={subscriber.UnsubscribeToken}&email={Uri.EscapeDataString(subscriber.Email)}";
        var preferencesUrl = $"{websiteUrl}{langPrefix}/newsletter?token={subscriber.UnsubscribeToken}&email={Uri.EscapeDataString(subscriber.Email)}";

        // Build content sections
        var contentHtml = "";
        if (content.BlogPosts != null && content.BlogPosts.Count > 0)
        {
            contentHtml += $"<h3>{newPostsTitle}</h3><ul>";
            foreach (var post in content.BlogPosts)
            {
                var escapedSlug = Uri.EscapeDataString(post.Slug);
                contentHtml += $"<li><a href=\"{websiteUrl}{langPrefix}/blog/{escapedSlug}\">{System.Net.WebUtility.HtmlEncode(post.Title)}</a> — {System.Net.WebUtility.HtmlEncode(post.Description)}</li>";
            }
            contentHtml += "</ul>";
        }

        if (string.IsNullOrEmpty(contentHtml))
        {
            contentHtml = $"<p>{noContent}</p>";
        }

        if (!string.IsNullOrEmpty(content.CustomMessage))
        {
            contentHtml += $"<p>{System.Net.WebUtility.HtmlEncode(content.CustomMessage)}</p>";
        }

        await _emailClient.Value.SendAsync(
            wait: WaitUntil.Completed,
            senderAddress: "DoNotReply@dsanchezcr.com",
            recipientAddress: subscriber.Email,
            subject: subject,
            htmlContent: $"""
                <html>
                    <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2 style="color: #007acc;">{subject}</h2>
                        <p>{greeting}</p>
                        {contentHtml}
                        <hr style="margin: 30px 0; border: none; border-top: 1px solid #e5e5e5;" />
                        <p style="color: #666; font-size: 12px;">
                            {footer}<br/>
                            <a href="{preferencesUrl}">{manageText}</a> · <a href="{unsubscribeUrl}">{unsubscribeText}</a>
                        </p>
                    </body>
                </html>
                """,
            cancellationToken: cancellationToken);
    }

    public class DispatchRequest
    {
        [System.Text.Json.Serialization.JsonPropertyName("frequency")]
        public string Frequency { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("blogPosts")]
        public List<BlogPostEntry>? BlogPosts { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("customMessage")]
        public string? CustomMessage { get; set; }

        [System.Text.Json.Serialization.JsonPropertyName("language")]
        public string? Language { get; set; }
    }

    public class BlogPostEntry
    {
        [System.Text.Json.Serialization.JsonPropertyName("slug")]
        public string Slug { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("title")]
        public string Title { get; set; } = string.Empty;

        [System.Text.Json.Serialization.JsonPropertyName("description")]
        public string Description { get; set; } = string.Empty;
    }
}

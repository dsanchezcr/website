using System.Net;
using System.Security.Cryptography;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using api.Models.Newsletter;
using api.Services;

namespace api;

public class UpdatePreferences
{
    private readonly ILogger<UpdatePreferences> _logger;
    private readonly INewsletterService _newsletterService;

    public UpdatePreferences(ILogger<UpdatePreferences> logger, INewsletterService newsletterService)
    {
        _logger = logger;
        _newsletterService = newsletterService;
    }

    [Function("UpdatePreferences")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "newsletter/preferences")] HttpRequestData req,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("UpdatePreferences Function Triggered");

        if (!await _newsletterService.IsConfiguredAsync())
        {
            var unavailable = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            await unavailable.WriteAsJsonAsync(new { error = "Newsletter service is not configured." });
            return unavailable;
        }

        var request = await req.ReadFromJsonAsync<UpdatePreferencesRequest>(cancellationToken);
        if (request == null || string.IsNullOrWhiteSpace(request.Email) || string.IsNullOrWhiteSpace(request.Token))
        {
            var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
            await badRequest.WriteAsJsonAsync(new { error = "Email and token are required." });
            return badRequest;
        }

        // Validate frequency
        if (request.Frequency != "weekly" && request.Frequency != "monthly")
        {
            var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
            await badRequest.WriteAsJsonAsync(new { error = "Frequency must be 'weekly' or 'monthly'." });
            return badRequest;
        }

        try
        {
            var subscriber = await _newsletterService.GetSubscriberAsync(request.Email);
            if (subscriber == null || subscriber.Status != "active")
            {
                var notFound = req.CreateResponse(HttpStatusCode.NotFound);
                await notFound.WriteAsJsonAsync(new { error = "Subscription not found." });
                return notFound;
            }

            // Verify the unsubscribe token matches (proves ownership)
            var expectedTokenBytes = System.Text.Encoding.UTF8.GetBytes(subscriber.UnsubscribeToken);
            var providedTokenBytes = System.Text.Encoding.UTF8.GetBytes(request.Token);
            if (expectedTokenBytes.Length != providedTokenBytes.Length ||
                !CryptographicOperations.FixedTimeEquals(expectedTokenBytes, providedTokenBytes))
            {
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { error = "Invalid token." });
                return forbidden;
            }

            subscriber.Frequency = request.Frequency;
            await _newsletterService.UpdateSubscriberAsync(subscriber);

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new { message = "Preferences updated successfully.", frequency = subscriber.Frequency });
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error updating newsletter preferences");
            var error = req.CreateResponse(HttpStatusCode.InternalServerError);
            await error.WriteAsJsonAsync(new { error = "An error occurred." });
            return error;
        }
    }
}

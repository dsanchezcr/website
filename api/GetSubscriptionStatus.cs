using System.Net;
using System.Security.Cryptography;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using api.Services;

namespace api;

public class GetSubscriptionStatus
{
    private readonly ILogger<GetSubscriptionStatus> _logger;
    private readonly INewsletterService _newsletterService;

    public GetSubscriptionStatus(ILogger<GetSubscriptionStatus> logger, INewsletterService newsletterService)
    {
        _logger = logger;
        _newsletterService = newsletterService;
    }

    [Function("GetSubscriptionStatus")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "newsletter/status")] HttpRequestData req,
        CancellationToken cancellationToken = default)
    {
        _logger.LogInformation("GetSubscriptionStatus Function Triggered");

        if (!await _newsletterService.IsConfiguredAsync())
        {
            var unavailable = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            await unavailable.WriteAsJsonAsync(new { error = "Newsletter service is not configured." });
            return unavailable;
        }

        var query = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var email = query["email"];
        var token = query["token"];

        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(token))
        {
            var badRequest = req.CreateResponse(HttpStatusCode.BadRequest);
            await badRequest.WriteAsJsonAsync(new { error = "Email and token are required." });
            return badRequest;
        }

        try
        {
            var subscriber = await _newsletterService.GetSubscriberAsync(email);
            if (subscriber == null)
            {
                var notFound = req.CreateResponse(HttpStatusCode.NotFound);
                await notFound.WriteAsJsonAsync(new { error = "Subscription not found." });
                return notFound;
            }

            // Verify token (proves ownership)
            if (!CryptographicOperations.FixedTimeEquals(
                System.Text.Encoding.UTF8.GetBytes(subscriber.UnsubscribeToken),
                System.Text.Encoding.UTF8.GetBytes(token)))
            {
                var forbidden = req.CreateResponse(HttpStatusCode.Forbidden);
                await forbidden.WriteAsJsonAsync(new { error = "Invalid token." });
                return forbidden;
            }

            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(new
            {
                email = subscriber.Email,
                frequency = subscriber.Frequency,
                status = subscriber.Status,
                language = subscriber.Language,
                subscribedAt = subscriber.SubscribedAt
            });
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error getting newsletter subscription status");
            var error = req.CreateResponse(HttpStatusCode.InternalServerError);
            await error.WriteAsJsonAsync(new { error = "An error occurred." });
            return error;
        }
    }
}

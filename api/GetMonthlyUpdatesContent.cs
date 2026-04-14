using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using api.Services;

namespace api;

public class GetMonthlyUpdatesContent
{
    private readonly ILogger<GetMonthlyUpdatesContent> _logger;
    private readonly ICosmosContentService _contentService;

    public GetMonthlyUpdatesContent(ILogger<GetMonthlyUpdatesContent> logger, ICosmosContentService contentService)
    {
        _logger = logger;
        _contentService = contentService;
    }

    [Function("GetMonthlyUpdatesContent")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "content/monthly-updates")] HttpRequestData req)
    {
        if (!await _contentService.IsConfiguredAsync())
        {
            var unavailable = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            await unavailable.WriteAsJsonAsync(new { error = "Content service is not configured." });
            return unavailable;
        }

        var month = QueryHelpers.GetQueryParam(req.Url.Query, "month");

        try
        {
            if (string.IsNullOrWhiteSpace(month))
            {
                // No month param — return list of available months (newest first)
                var months = await _contentService.GetMonthlyUpdateMonthsAsync();
                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Cache-Control", "public, max-age=300");
                await response.WriteAsJsonAsync(months);
                return response;
            }
            else
            {
                var updates = await _contentService.GetMonthlyUpdatesAsync(month);
                var response = req.CreateResponse(HttpStatusCode.OK);
                response.Headers.Add("Cache-Control", "public, max-age=300");
                await response.WriteAsJsonAsync(updates);
                return response;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve monthly updates for month {Month}", month ?? "(all)");
            var error = req.CreateResponse(HttpStatusCode.InternalServerError);
            await error.WriteAsJsonAsync(new { error = "Failed to retrieve content." });
            return error;
        }
    }
}

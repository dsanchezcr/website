using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using api.Services;

namespace api;

public class GetGamingContent
{
    private readonly ILogger<GetGamingContent> _logger;
    private readonly ICosmosContentService _contentService;

    public GetGamingContent(ILogger<GetGamingContent> logger, ICosmosContentService contentService)
    {
        _logger = logger;
        _contentService = contentService;
    }

    [Function("GetGamingContent")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "content/gaming")] HttpRequestData req)
    {
        if (!await _contentService.IsConfiguredAsync())
        {
            var unavailable = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            await unavailable.WriteAsJsonAsync(new { error = "Content service is not configured." });
            return unavailable;
        }

        var queryParams = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var platform = queryParams["platform"];

        if (string.IsNullOrWhiteSpace(platform))
        {
            var badReq = req.CreateResponse(HttpStatusCode.BadRequest);
            await badReq.WriteAsJsonAsync(new { error = "Query parameter 'platform' is required." });
            return badReq;
        }

        var section = queryParams["section"];

        try
        {
            var gaming = await _contentService.GetGamingAsync(platform, section);
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(gaming);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve gaming content for platform {Platform}", platform);
            var error = req.CreateResponse(HttpStatusCode.InternalServerError);
            await error.WriteAsJsonAsync(new { error = "Failed to retrieve content." });
            return error;
        }
    }
}

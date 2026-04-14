using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using api.Services;

namespace api;

public class GetParksContent
{
    private readonly ILogger<GetParksContent> _logger;
    private readonly ICosmosContentService _contentService;

    public GetParksContent(ILogger<GetParksContent> logger, ICosmosContentService contentService)
    {
        _logger = logger;
        _contentService = contentService;
    }

    [Function("GetParksContent")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "content/parks")] HttpRequestData req)
    {
        if (!await _contentService.IsConfiguredAsync())
        {
            var unavailable = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            await unavailable.WriteAsJsonAsync(new { error = "Content service is not configured." });
            return unavailable;
        }

        var provider = QueryHelpers.GetQueryParam(req.Url.Query, "provider");

        if (string.IsNullOrWhiteSpace(provider))
        {
            var badReq = req.CreateResponse(HttpStatusCode.BadRequest);
            await badReq.WriteAsJsonAsync(new { error = "Query parameter 'provider' is required." });
            return badReq;
        }

        var parkId = QueryHelpers.GetQueryParam(req.Url.Query, "parkId");

        try
        {
            var parks = await _contentService.GetParksAsync(provider, parkId);
            var response = req.CreateResponse(HttpStatusCode.OK);
            response.Headers.Add("Cache-Control", "public, max-age=300");
            await response.WriteAsJsonAsync(parks);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve parks content for provider {Provider}", provider);
            var error = req.CreateResponse(HttpStatusCode.InternalServerError);
            await error.WriteAsJsonAsync(new { error = "Failed to retrieve content." });
            return error;
        }
    }
}

using System.Net;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;
using api.Services;

namespace api;

public class GetMoviesContent
{
    private readonly ILogger<GetMoviesContent> _logger;
    private readonly ICosmosContentService _contentService;

    public GetMoviesContent(ILogger<GetMoviesContent> logger, ICosmosContentService contentService)
    {
        _logger = logger;
        _contentService = contentService;
    }

    [Function("GetMoviesContent")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "content/movies")] HttpRequestData req)
    {
        if (!await _contentService.IsConfiguredAsync())
        {
            var unavailable = req.CreateResponse(HttpStatusCode.ServiceUnavailable);
            await unavailable.WriteAsJsonAsync(new { error = "Content service is not configured." });
            return unavailable;
        }

        var queryParams = System.Web.HttpUtility.ParseQueryString(req.Url.Query);
        var category = queryParams["category"];

        try
        {
            var movies = await _contentService.GetMoviesAsync(category);
            var response = req.CreateResponse(HttpStatusCode.OK);
            await response.WriteAsJsonAsync(movies);
            return response;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve movies content");
            var error = req.CreateResponse(HttpStatusCode.InternalServerError);
            await error.WriteAsJsonAsync(new { error = "Failed to retrieve content." });
            return error;
        }
    }
}

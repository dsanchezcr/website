using api.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace api;

public class GetPlayStationProfile(GamingProfileReader reader)
{
    [Function("GetPlayStationProfile")]
    public Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "gaming/playstation")] HttpRequestData req,
        CancellationToken ct) => reader.ReadAsync(req, "playstation", ct);
}

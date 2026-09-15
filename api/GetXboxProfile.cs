using api.Services;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;

namespace api;

public class GetXboxProfile(GamingProfileReader reader)
{
    [Function("GetXboxProfile")]
    public Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "get", Route = "gaming/xbox")] HttpRequestData req,
        CancellationToken ct) => reader.ReadAsync(req, "xbox", ct);
}

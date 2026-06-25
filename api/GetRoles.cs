using System.Net;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Azure.Functions.Worker.Http;
using Microsoft.Extensions.Logging;

namespace api;

/// <summary>
/// Azure Static Web Apps <c>rolesSource</c> function (configured in staticwebapp.config.json as
/// <c>/api/auth/roles</c>). The SWA platform calls this function after each successful Entra ID
/// sign-in, passing the user's profile. It returns the custom <c>admin</c> role for accounts on
/// the allow-list (<c>ADMIN_ALLOWED_EMAILS</c>, comma/semicolon separated).
///
/// Once configured as the rolesSource, this function is not reachable by external HTTP requests.
/// </summary>
public class GetRoles
{
    private readonly ILogger<GetRoles> _logger;

    public GetRoles(ILogger<GetRoles> logger)
    {
        _logger = logger;
    }

    private sealed class RolesRequest
    {
        [JsonPropertyName("identityProvider")] public string? IdentityProvider { get; set; }
        [JsonPropertyName("userId")] public string? UserId { get; set; }
        [JsonPropertyName("userDetails")] public string? UserDetails { get; set; }
        [JsonPropertyName("claims")] public List<RolesClaim>? Claims { get; set; }
    }

    private sealed class RolesClaim
    {
        [JsonPropertyName("typ")] public string? Typ { get; set; }
        [JsonPropertyName("val")] public string? Val { get; set; }
    }

    [Function("GetRoles")]
    public async Task<HttpResponseData> Run(
        [HttpTrigger(AuthorizationLevel.Anonymous, "post", Route = "auth/roles")] HttpRequestData req)
    {
        var roles = new List<string>();

        try
        {
            var body = await new StreamReader(req.Body).ReadToEndAsync();
            var request = string.IsNullOrWhiteSpace(body)
                ? null
                : JsonSerializer.Deserialize<RolesRequest>(body, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });

            var allowList = ParseAllowList(Environment.GetEnvironmentVariable("ADMIN_ALLOWED_EMAILS"));

            if (request != null && allowList.Count > 0 &&
                IsAllowListed(request.UserDetails, request.Claims?.Select(c => c.Val), allowList))
            {
                roles.Add("admin");
                _logger.LogInformation("Granted admin role to {User}", request.UserDetails);
            }
            else if (request != null)
            {
                _logger.LogWarning("Admin role denied for {User}", request.UserDetails);
            }
        }
        catch (Exception ex)
        {
            // Never throw from the roles source — return an empty role set on any failure.
            _logger.LogError(ex, "Failed to evaluate roles");
        }

        var response = req.CreateResponse(HttpStatusCode.OK);
        await response.WriteAsJsonAsync(new { roles });
        return response;
    }

    /// <summary>Parse the comma/semicolon-separated allow-list of admin emails (case-insensitive).</summary>
    internal static HashSet<string> ParseAllowList(string? raw) =>
        string.IsNullOrWhiteSpace(raw)
            ? new HashSet<string>(StringComparer.OrdinalIgnoreCase)
            : raw.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
                 .ToHashSet(StringComparer.OrdinalIgnoreCase);

    /// <summary>True when the request's userDetails or any email-like claim is on the allow-list.</summary>
    internal static bool IsAllowListed(string? userDetails, IEnumerable<string?>? claimValues, HashSet<string> allowList)
    {
        if (!string.IsNullOrWhiteSpace(userDetails) && allowList.Contains(userDetails.Trim()))
            return true;

        if (claimValues != null)
        {
            foreach (var val in claimValues)
            {
                if (!string.IsNullOrWhiteSpace(val) && allowList.Contains(val.Trim()))
                    return true;
            }
        }

        return false;
    }
}

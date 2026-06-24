using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.Azure.Functions.Worker.Http;

namespace api;

/// <summary>
/// Represents the authenticated user injected by Azure Static Web Apps via the
/// <c>x-ms-client-principal</c> request header (base64-encoded JSON). Used by the admin
/// endpoints to re-verify the caller's role server-side (defense in depth), independent of
/// the route rules in <c>staticwebapp.config.json</c>.
/// </summary>
public sealed class ClientPrincipal
{
    [JsonPropertyName("identityProvider")]
    public string? IdentityProvider { get; set; }

    [JsonPropertyName("userId")]
    public string? UserId { get; set; }

    [JsonPropertyName("userDetails")]
    public string? UserDetails { get; set; }

    [JsonPropertyName("userRoles")]
    public List<string> UserRoles { get; set; } = new();

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    /// <summary>
    /// Parse the SWA client principal from request headers. Returns <c>null</c> when the header
    /// is absent or cannot be decoded.
    /// </summary>
    public static ClientPrincipal? FromRequest(HttpRequestData req)
    {
        if (!req.Headers.TryGetValues("x-ms-client-principal", out var values))
            return null;

        var encoded = values.FirstOrDefault();
        if (string.IsNullOrWhiteSpace(encoded))
            return null;

        try
        {
            var decoded = Convert.FromBase64String(encoded);
            var json = Encoding.UTF8.GetString(decoded);
            var principal = JsonSerializer.Deserialize<ClientPrincipal>(json, JsonOptions);
            principal?.UserRoles?.RemoveAll(string.IsNullOrWhiteSpace);
            return principal;
        }
        catch
        {
            return null;
        }
    }

    /// <summary>True when the user belongs to the given role (case-insensitive).</summary>
    public bool IsInRole(string role) =>
        UserRoles.Any(r => string.Equals(r, role, StringComparison.OrdinalIgnoreCase));
}

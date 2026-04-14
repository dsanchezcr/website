namespace api;

/// <summary>
/// Shared helpers for parsing HTTP query strings in Azure Functions isolated-worker endpoints.
/// Handles both percent-encoding and application/x-www-form-urlencoded '+'-as-space semantics.
/// </summary>
internal static class QueryHelpers
{
    /// <summary>
    /// Extracts the first value for <paramref name="key"/> from a raw query string
    /// (e.g. "?category=action&amp;page=1" or "category=action&amp;page=1").
    /// Returns <see langword="null"/> when the key is absent or its decoded value is
    /// empty or whitespace (e.g. <c>?category=</c> or <c>?category=%20</c>).
    /// </summary>
    public static string? GetQueryParam(string query, string key)
    {
        var q = query.TrimStart('?');
        foreach (var part in q.Split('&', StringSplitOptions.RemoveEmptyEntries))
        {
            var kv = part.Split('=', 2);
            if (kv.Length == 2 && Decode(kv[0]) == key)
            {
                var value = Decode(kv[1]);
                return string.IsNullOrWhiteSpace(value) ? null : value;
            }
        }
        return null;
    }

    // Handles both percent-encoding (%20) and form-urlencoded '+' as space.
    private static string Decode(string value) =>
        System.Net.WebUtility.UrlDecode(value);
}

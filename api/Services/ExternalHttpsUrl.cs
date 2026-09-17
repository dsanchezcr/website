using System.Net;

namespace api.Services;

internal static class ExternalHttpsUrl
{
    private static readonly char[] UnsafeCharacters = ['<', '>', '"', '\'', '`', '\\'];

    public static bool IsValid(string value)
    {
        return value.Length <= 4096 &&
            !value.Any(char.IsWhiteSpace) &&
            value.IndexOfAny(UnsafeCharacters) < 0 &&
            Uri.TryCreate(value, UriKind.Absolute, out var uri) &&
            uri.Scheme == Uri.UriSchemeHttps &&
            string.IsNullOrEmpty(uri.UserInfo) &&
            uri.HostNameType == UriHostNameType.Dns &&
            !uri.IsLoopback &&
            uri.Host.Contains('.') &&
            !uri.Host.EndsWith(".local", StringComparison.OrdinalIgnoreCase) &&
            !uri.Host.EndsWith(".localhost", StringComparison.OrdinalIgnoreCase);
    }
}

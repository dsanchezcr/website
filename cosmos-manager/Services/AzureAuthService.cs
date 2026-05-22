using Azure.Core;
using Azure.Identity;

namespace CosmosManager.Services;

/// <summary>
/// Handles Microsoft (Entra ID) interactive sign-in with a persistent token cache so
/// the user only has to sign in once per machine. On Windows the cache is protected by DPAPI.
/// </summary>
public class AzureAuthService
{
    private const string TokenCacheName = "dsanchezcr.cosmos-manager";
    private const string AzureManagementScope = "https://management.azure.com/.default";

    private InteractiveBrowserCredential? _credential;
    private AccessToken? _lastArmToken;

    public bool IsSignedIn => _credential != null && _lastArmToken.HasValue
        && _lastArmToken.Value.ExpiresOn > DateTimeOffset.UtcNow.AddMinutes(1);

    public string? Account { get; private set; }

    /// <summary>
    /// The credential used for both ARM discovery and Cosmos data-plane RBAC access.
    /// </summary>
    public TokenCredential Credential =>
        _credential ?? throw new InvalidOperationException("Not signed in.");

    /// <summary>
    /// Try a silent sign-in from the persistent cache. Returns true if a cached account was found.
    /// </summary>
    public async Task<bool> TrySilentSignInAsync(CancellationToken cancellationToken = default)
    {
        try
        {
            var cred = CreateCredential(allowInteractive: false);
            var token = await cred.GetTokenAsync(new TokenRequestContext(new[] { AzureManagementScope }), cancellationToken);
            _credential = cred;
            _lastArmToken = token;
            Account = ExtractUpn(token.Token);
            return true;
        }
        catch (AuthenticationFailedException)
        {
            return false;
        }
    }

    /// <summary>
    /// Interactive sign-in. Opens a browser and prompts the user.
    /// </summary>
    public async Task SignInAsync(CancellationToken cancellationToken = default)
    {
        var cred = CreateCredential(allowInteractive: true);
        await cred.AuthenticateAsync(new TokenRequestContext(new[] { AzureManagementScope }), cancellationToken);
        var token = await cred.GetTokenAsync(new TokenRequestContext(new[] { AzureManagementScope }), cancellationToken);
        _credential = cred;
        _lastArmToken = token;
        Account = ExtractUpn(token.Token);
    }

    public void SignOut()
    {
        _credential = null;
        _lastArmToken = null;
        Account = null;
    }

    private static InteractiveBrowserCredential CreateCredential(bool allowInteractive)
    {
        var options = new InteractiveBrowserCredentialOptions
        {
            TokenCachePersistenceOptions = new TokenCachePersistenceOptions { Name = TokenCacheName },
            DisableAutomaticAuthentication = !allowInteractive
        };
        return new InteractiveBrowserCredential(options);
    }

    private static string? ExtractUpn(string jwt)
    {
        try
        {
            var parts = jwt.Split('.');
            if (parts.Length < 2) return null;
            var payload = parts[1].Replace('-', '+').Replace('_', '/');
            switch (payload.Length % 4) { case 2: payload += "=="; break; case 3: payload += "="; break; }
            var bytes = Convert.FromBase64String(payload);
            using var doc = System.Text.Json.JsonDocument.Parse(bytes);
            if (doc.RootElement.TryGetProperty("upn", out var upn)) return upn.GetString();
            if (doc.RootElement.TryGetProperty("preferred_username", out var pref)) return pref.GetString();
            if (doc.RootElement.TryGetProperty("unique_name", out var un)) return un.GetString();
        }
        catch { }
        return null;
    }
}

using Azure;
using Azure.ResourceManager;
using Azure.ResourceManager.CosmosDB;
using Azure.ResourceManager.Resources;

namespace CosmosManager.Services;

public record AzureSubscriptionInfo(string Id, string DisplayName)
{
    public override string ToString() => DisplayName;
}

public record CosmosAccountInfo(string Name, string Endpoint, string SubscriptionId, string ResourceGroup, CosmosDBAccountResource Resource)
{
    public override string ToString() => Name;
}

/// <summary>
/// Discovers Azure subscriptions, Cosmos DB accounts, and databases for the signed-in user.
/// </summary>
public class CosmosDiscoveryService
{
    private readonly AzureAuthService _auth;
    private ArmClient? _arm;

    public CosmosDiscoveryService(AzureAuthService auth)
    {
        _auth = auth;
    }

    private ArmClient Arm => _arm ??= new ArmClient(_auth.Credential);

    public async Task<List<AzureSubscriptionInfo>> ListSubscriptionsAsync(CancellationToken cancellationToken = default)
    {
        var result = new List<AzureSubscriptionInfo>();
        await foreach (var sub in Arm.GetSubscriptions().GetAllAsync(cancellationToken))
        {
            result.Add(new AzureSubscriptionInfo(
                sub.Data.SubscriptionId ?? string.Empty,
                sub.Data.DisplayName ?? sub.Data.SubscriptionId ?? "(unnamed)"));
        }
        return result.OrderBy(s => s.DisplayName).ToList();
    }

    public async Task<List<CosmosAccountInfo>> ListCosmosAccountsAsync(string subscriptionId, CancellationToken cancellationToken = default)
    {
        var sub = Arm.GetSubscriptionResource(SubscriptionResource.CreateResourceIdentifier(subscriptionId));
        var result = new List<CosmosAccountInfo>();
        await foreach (var account in sub.GetCosmosDBAccountsAsync(cancellationToken))
        {
            var id = account.Id;
            result.Add(new CosmosAccountInfo(
                account.Data.Name,
                account.Data.DocumentEndpoint?.ToString() ?? $"https://{account.Data.Name}.documents.azure.com:443/",
                subscriptionId,
                id.ResourceGroupName ?? string.Empty,
                account));
        }
        return result.OrderBy(a => a.Name).ToList();
    }

    public async Task<List<string>> ListDatabasesAsync(CosmosAccountInfo account, CancellationToken cancellationToken = default)
    {
        var result = new List<string>();
        await foreach (var db in account.Resource.GetCosmosDBSqlDatabases().GetAllAsync(cancellationToken))
        {
            result.Add(db.Data.Name);
        }
        return result.OrderBy(n => n).ToList();
    }

    /// <summary>
    /// Attempt to retrieve a primary master key for the account. Requires control-plane
    /// list-keys permission (Cosmos DB Account Reader or higher) and the account must not
    /// disable key-based auth. Returns null on failure so callers can fall back to RBAC.
    /// </summary>
    public async Task<string?> TryGetPrimaryKeyAsync(CosmosAccountInfo account, CancellationToken cancellationToken = default)
    {
        try
        {
            var keys = await account.Resource.GetKeysAsync(cancellationToken);
            return keys.Value.PrimaryMasterKey;
        }
        catch (RequestFailedException)
        {
            return null;
        }
    }
}

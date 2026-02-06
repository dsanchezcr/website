using Azure;
using Azure.Data.Tables;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Caching.Memory;
using api.Models;

namespace api.Services;

/// <summary>
/// Service for storing email verification tokens in Azure Table Storage.
/// Provides persistent storage that survives function app restarts.
/// </summary>
public interface ITokenStorageService
{
    /// <summary>
    /// Stores a verification token with associated data.
    /// </summary>
    /// <param name="token">The verification token (used as row key)</param>
    /// <param name="data">The verification data to store</param>
    /// <param name="expirationHours">Hours until token expires (default: 24)</param>
    Task StoreTokenAsync(string token, VerificationData data, int expirationHours = 24);
    
    /// <summary>
    /// Retrieves and deletes a verification token (one-time use).
    /// </summary>
    /// <param name="token">The verification token to retrieve</param>
    /// <returns>The verification data if found and not expired, null otherwise</returns>
    Task<VerificationData?> RetrieveAndDeleteTokenAsync(string token);
    
    /// <summary>
    /// Checks if the service is properly configured and operational.
    /// </summary>
    Task<(bool IsHealthy, string Message)> CheckHealthAsync();
}

/// <summary>
/// Azure Table Storage implementation of token storage.
/// </summary>
public class TableStorageTokenService : ITokenStorageService
{
    private readonly TableClient _tableClient;
    private readonly ILogger<TableStorageTokenService> _logger;
    private const string TableName = "EmailVerificationTokens";
    private const string PartitionKey = "verification";

    public TableStorageTokenService(string connectionString, ILogger<TableStorageTokenService> logger)
    {
        _logger = logger;
        
        if (string.IsNullOrEmpty(connectionString))
        {
            throw new ArgumentException("Azure Storage connection string is required", nameof(connectionString));
        }
        
        var serviceClient = new TableServiceClient(connectionString);
        _tableClient = serviceClient.GetTableClient(TableName);
        
        // Ensure table exists (async initialization)
        _tableClient.CreateIfNotExists();
    }

    public async Task StoreTokenAsync(string token, VerificationData data, int expirationHours = 24)
    {
        var entity = new VerificationTokenEntity
        {
            PartitionKey = PartitionKey,
            RowKey = token,
            Name = data.Name,
            Email = data.Email,
            Message = data.Message,
            Language = data.Language,
            ExpiresAt = DateTimeOffset.UtcNow.AddHours(expirationHours),
            CreatedAt = DateTimeOffset.UtcNow
        };

        try
        {
            await _tableClient.UpsertEntityAsync(entity);
            _logger.LogInformation("Stored verification token for email: {Email}", 
                data.Email.Substring(0, Math.Min(3, data.Email.Length)) + "***");
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to store verification token");
            throw;
        }
    }

    public async Task<VerificationData?> RetrieveAndDeleteTokenAsync(string token)
    {
        try
        {
            var response = await _tableClient.GetEntityIfExistsAsync<VerificationTokenEntity>(PartitionKey, token);
            
            if (!response.HasValue || response.Value == null)
            {
                _logger.LogWarning("Verification token not found: {Token}", 
                    token.Substring(0, Math.Min(8, token.Length)) + "...");
                return null;
            }

            var entity = response.Value;
            
            // Check if expired
            if (entity.ExpiresAt < DateTimeOffset.UtcNow)
            {
                _logger.LogWarning("Verification token expired: {Token}", 
                    token.Substring(0, Math.Min(8, token.Length)) + "...");
                
                // Delete expired token
                await _tableClient.DeleteEntityAsync(PartitionKey, token);
                return null;
            }

            // Delete the token (one-time use)
            await _tableClient.DeleteEntityAsync(PartitionKey, token);
            
            _logger.LogInformation("Retrieved and deleted verification token for email: {Email}", 
                entity.Email.Substring(0, Math.Min(3, entity.Email.Length)) + "***");

            return new VerificationData(entity.Name, entity.Email, entity.Message, entity.Language);
        }
        catch (RequestFailedException ex) when (ex.Status == 404)
        {
            _logger.LogWarning("Verification token not found: {Token}", 
                token.Substring(0, Math.Min(8, token.Length)) + "...");
            return null;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to retrieve verification token");
            throw;
        }
    }

    public async Task<(bool IsHealthy, string Message)> CheckHealthAsync()
    {
        try
        {
            var sw = System.Diagnostics.Stopwatch.StartNew();
            
            // Try to query the table (cheap operation)
            await foreach (var _ in _tableClient.QueryAsync<TableEntity>(e => e.PartitionKey == "health_check_probe", maxPerPage: 1))
            {
                break; // Just check if query works
            }
            
            sw.Stop();
            return (true, $"Table Storage operational ({sw.ElapsedMilliseconds}ms)");
        }
        catch (Exception ex)
        {
            return (false, $"Table Storage error: {ex.Message}");
        }
    }
}

/// <summary>
/// Entity class for storing verification tokens in Azure Table Storage.
/// </summary>
public class VerificationTokenEntity : ITableEntity
{
    public string PartitionKey { get; set; } = "verification";
    public string RowKey { get; set; } = string.Empty;
    public DateTimeOffset? Timestamp { get; set; }
    public ETag ETag { get; set; }
    
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Language { get; set; } = "en";
    public DateTimeOffset ExpiresAt { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

/// <summary>
/// Fallback to in-memory cache when Table Storage is not configured.
/// Useful for local development.
/// </summary>
public class InMemoryTokenService : ITokenStorageService
{
    private readonly IMemoryCache _cache;
    private readonly ILogger<InMemoryTokenService> _logger;

    public InMemoryTokenService(IMemoryCache cache, ILogger<InMemoryTokenService> logger)
    {
        _cache = cache;
        _logger = logger;
    }

    public Task StoreTokenAsync(string token, VerificationData data, int expirationHours = 24)
    {
        var cacheKey = $"verification:{token}";
        _cache.Set(cacheKey, data, TimeSpan.FromHours(expirationHours));
        
        _logger.LogInformation("Stored verification token in memory cache for email: {Email}", 
            data.Email.Substring(0, Math.Min(3, data.Email.Length)) + "***");
        
        return Task.CompletedTask;
    }

    public Task<VerificationData?> RetrieveAndDeleteTokenAsync(string token)
    {
        var cacheKey = $"verification:{token}";
        
        if (_cache.TryGetValue(cacheKey, out object? cachedValue) && cachedValue is VerificationData data)
        {
            _cache.Remove(cacheKey);
            _logger.LogInformation("Retrieved and deleted verification token from memory cache");
            return Task.FromResult<VerificationData?>(data);
        }
        
        _logger.LogWarning("Verification token not found in memory cache: {Token}", 
            token.Substring(0, Math.Min(8, token.Length)) + "...");
        return Task.FromResult<VerificationData?>(null);
    }

    public Task<(bool IsHealthy, string Message)> CheckHealthAsync()
    {
        return Task.FromResult((true, "In-memory token storage (development mode)"));
    }
}

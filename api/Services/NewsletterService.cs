using api.Models.Newsletter;
using Microsoft.Azure.Cosmos;
using Microsoft.Extensions.Logging;

namespace api.Services;

/// <summary>
/// Service for managing newsletter subscribers in Cosmos DB.
/// </summary>
public interface INewsletterService
{
    Task<NewsletterSubscriber?> GetSubscriberAsync(string email);
    Task<NewsletterSubscriber> CreateSubscriberAsync(NewsletterSubscriber subscriber);
    Task<NewsletterSubscriber> UpdateSubscriberAsync(NewsletterSubscriber subscriber);
    Task<IReadOnlyList<NewsletterSubscriber>> GetActiveSubscribersByFrequencyAsync(string frequency);
    Task<NewsletterSubscriber?> GetSubscriberByUnsubscribeTokenAsync(string token);
    Task<NewsletterSubscriber?> GetSubscriberByVerificationTokenAsync(string token);
    Task<bool> IsConfiguredAsync();
}

/// <summary>
/// Cosmos DB-backed implementation of INewsletterService.
/// Container: newsletter-subscribers, partition key: /email
/// </summary>
public class CosmosNewsletterService : INewsletterService
{
    private readonly Container _container;
    private readonly ILogger<CosmosNewsletterService> _logger;

    public CosmosNewsletterService(CosmosClient client, string databaseName, ILogger<CosmosNewsletterService> logger)
    {
        _container = client.GetContainer(databaseName, "newsletter-subscribers");
        _logger = logger;
    }

    public Task<bool> IsConfiguredAsync() => Task.FromResult(true);

    public async Task<NewsletterSubscriber?> GetSubscriberAsync(string email)
    {
        try
        {
            var emailLower = email.ToLowerInvariant();
            var response = await _container.ReadItemAsync<NewsletterSubscriber>(
                id: emailLower,
                partitionKey: new PartitionKey(emailLower));
            return response.Resource;
        }
        catch (CosmosException ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return null;
        }
    }

    public async Task<NewsletterSubscriber> CreateSubscriberAsync(NewsletterSubscriber subscriber)
    {
        subscriber.Email = subscriber.Email.ToLowerInvariant();
        subscriber.Id = subscriber.Email;
        var response = await _container.CreateItemAsync(subscriber, new PartitionKey(subscriber.Email));
        _logger.LogInformation("Created newsletter subscriber: {Email}", subscriber.Email);
        return response.Resource;
    }

    public async Task<NewsletterSubscriber> UpdateSubscriberAsync(NewsletterSubscriber subscriber)
    {
        subscriber.Email = subscriber.Email.ToLowerInvariant();
        subscriber.Id = subscriber.Email;
        var response = await _container.ReplaceItemAsync(subscriber, subscriber.Id, new PartitionKey(subscriber.Email));
        _logger.LogInformation("Updated newsletter subscriber: {Email}, status: {Status}", subscriber.Email, subscriber.Status);
        return response.Resource;
    }

    public async Task<IReadOnlyList<NewsletterSubscriber>> GetActiveSubscribersByFrequencyAsync(string frequency)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.status = 'active' AND c.frequency = @frequency")
            .WithParameter("@frequency", frequency);
        return await ExecuteQueryAsync(query);
    }

    public async Task<NewsletterSubscriber?> GetSubscriberByUnsubscribeTokenAsync(string token)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.unsubscribeToken = @token AND c.status = 'active'")
            .WithParameter("@token", token);
        var results = await ExecuteQueryAsync(query);
        return results.FirstOrDefault();
    }

    public async Task<NewsletterSubscriber?> GetSubscriberByVerificationTokenAsync(string token)
    {
        var query = new QueryDefinition("SELECT * FROM c WHERE c.verificationToken = @token AND c.status = 'pending'")
            .WithParameter("@token", token);
        var results = await ExecuteQueryAsync(query);
        return results.FirstOrDefault();
    }

    private async Task<IReadOnlyList<NewsletterSubscriber>> ExecuteQueryAsync(QueryDefinition query, PartitionKey? partitionKey = null)
    {
        var results = new List<NewsletterSubscriber>();
        var options = new QueryRequestOptions();
        if (partitionKey.HasValue)
        {
            options.PartitionKey = partitionKey.Value;
        }

        using var iterator = _container.GetItemQueryIterator<NewsletterSubscriber>(query, requestOptions: options);
        while (iterator.HasMoreResults)
        {
            var response = await iterator.ReadNextAsync();
            results.AddRange(response);
        }

        return results;
    }
}

/// <summary>
/// No-op implementation when Cosmos DB is not configured.
/// </summary>
public class NullNewsletterService : INewsletterService
{
    public Task<bool> IsConfiguredAsync() => Task.FromResult(false);
    public Task<NewsletterSubscriber?> GetSubscriberAsync(string email) => Task.FromResult<NewsletterSubscriber?>(null);
    public Task<NewsletterSubscriber> CreateSubscriberAsync(NewsletterSubscriber subscriber) => throw new InvalidOperationException("Newsletter service not configured.");
    public Task<NewsletterSubscriber> UpdateSubscriberAsync(NewsletterSubscriber subscriber) => throw new InvalidOperationException("Newsletter service not configured.");
    public Task<IReadOnlyList<NewsletterSubscriber>> GetActiveSubscribersByFrequencyAsync(string frequency) => Task.FromResult<IReadOnlyList<NewsletterSubscriber>>(Array.Empty<NewsletterSubscriber>());
    public Task<NewsletterSubscriber?> GetSubscriberByUnsubscribeTokenAsync(string token) => Task.FromResult<NewsletterSubscriber?>(null);
    public Task<NewsletterSubscriber?> GetSubscriberByVerificationTokenAsync(string token) => Task.FromResult<NewsletterSubscriber?>(null);
}

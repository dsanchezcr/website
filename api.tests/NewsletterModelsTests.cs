using api.Models.Newsletter;
using Xunit;

namespace api.tests;

public class NewsletterModelsTests
{
    [Fact]
    public void NewsletterSubscriber_DefaultValues_AreCorrect()
    {
        var subscriber = new NewsletterSubscriber();

        Assert.Equal(string.Empty, subscriber.Id);
        Assert.Equal(string.Empty, subscriber.Email);
        Assert.Equal("weekly", subscriber.Frequency);
        Assert.Equal("en", subscriber.Language);
        Assert.Equal("pending", subscriber.Status);
        Assert.Null(subscriber.VerifiedAt);
        Assert.Null(subscriber.LastSentAt);
        Assert.Equal(string.Empty, subscriber.UnsubscribeToken);
        Assert.Null(subscriber.VerificationToken);
    }

    [Fact]
    public void SubscribeRequest_DefaultValues_AreCorrect()
    {
        var request = new SubscribeRequest();

        Assert.Equal(string.Empty, request.Email);
        Assert.Equal("weekly", request.Frequency);
        Assert.Equal("en", request.Language);
        Assert.Equal(string.Empty, request.RecaptchaToken);
        Assert.Equal(string.Empty, request.Website); // Honeypot
    }

    [Fact]
    public void UpdatePreferencesRequest_DefaultValues_AreCorrect()
    {
        var request = new UpdatePreferencesRequest();

        Assert.Equal(string.Empty, request.Email);
        Assert.Equal(string.Empty, request.Frequency);
        Assert.Equal(string.Empty, request.Token);
    }

    [Fact]
    public void NewsletterSubscriber_SetProperties_WorkCorrectly()
    {
        var now = DateTime.UtcNow;
        var subscriber = new NewsletterSubscriber
        {
            Id = "test-id",
            Email = "test@example.com",
            Frequency = "monthly",
            Language = "es",
            Status = "active",
            SubscribedAt = now,
            VerifiedAt = now,
            LastSentAt = now,
            UnsubscribeToken = "unsub-token",
            VerificationToken = "verify-token"
        };

        Assert.Equal("test-id", subscriber.Id);
        Assert.Equal("test@example.com", subscriber.Email);
        Assert.Equal("monthly", subscriber.Frequency);
        Assert.Equal("es", subscriber.Language);
        Assert.Equal("active", subscriber.Status);
        Assert.Equal(now, subscriber.SubscribedAt);
        Assert.Equal(now, subscriber.VerifiedAt);
        Assert.Equal(now, subscriber.LastSentAt);
        Assert.Equal("unsub-token", subscriber.UnsubscribeToken);
        Assert.Equal("verify-token", subscriber.VerificationToken);
    }

    [Theory]
    [InlineData("weekly")]
    [InlineData("monthly")]
    public void SubscribeRequest_ValidFrequencies(string frequency)
    {
        var request = new SubscribeRequest { Frequency = frequency };
        Assert.Equal(frequency, request.Frequency);
    }

    [Theory]
    [InlineData("en")]
    [InlineData("es")]
    [InlineData("pt")]
    public void SubscribeRequest_ValidLanguages(string language)
    {
        var request = new SubscribeRequest { Language = language };
        Assert.Equal(language, request.Language);
    }

    [Theory]
    [InlineData("pending")]
    [InlineData("active")]
    [InlineData("unsubscribed")]
    public void NewsletterSubscriber_ValidStatuses(string status)
    {
        var subscriber = new NewsletterSubscriber { Status = status };
        Assert.Equal(status, subscriber.Status);
    }
}

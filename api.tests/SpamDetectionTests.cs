using api;
using Xunit;

namespace api.tests;

/// <summary>
/// Tests for spam detection patterns used in SendEmail.
/// These tests exercise the actual SpamDetector logic shared with production code.
/// </summary>
public class SpamDetectionTests
{
    [Theory]
    [InlineData("Check out https://example.com and https://test.com and https://third.com", 3)]
    [InlineData("Visit www.example.com", 1)]
    [InlineData("No URLs here", 0)]
    [InlineData("One link: https://github.com", 1)]
    public void UrlPattern_DetectsCorrectCount(string message, int expectedCount)
    {
        var matches = SpamDetector.UrlPattern().Matches(message);
        Assert.Equal(expectedCount, matches.Count);
    }

    [Theory]
    [InlineData("Contact me at test@example.com and other@example.com", 2)]
    [InlineData("My email is user@domain.org", 1)]
    [InlineData("No email addresses here", 0)]
    public void EmailPattern_DetectsCorrectCount(string message, int expectedCount)
    {
        var matches = SpamDetector.EmailPattern().Matches(message);
        Assert.Equal(expectedCount, matches.Count);
    }

    [Theory]
    [InlineData("Buy viagra now!", true)]
    [InlineData("Invest in bitcoin today", true)]
    [InlineData("Win the lottery!", true)]
    [InlineData("Free crypto giveaway", true)]
    [InlineData("Visit our casino", true)]
    [InlineData("Play poker online", true)]
    [InlineData("Hello, I would like to discuss a project", false)]
    [InlineData("Great work on your Azure blog post", false)]
    public void SpamKeywords_DetectsCorrectly(string message, bool shouldMatch)
    {
        Assert.Equal(shouldMatch, SpamDetector.SpamKeywords().IsMatch(message));
    }

    [Theory]
    [InlineData("aaaaaaaaaaaa", true)]     // 12 same chars
    [InlineData("Hello World!!", false)]    // Not enough repetition
    [InlineData("normal message", false)]
    public void RepetitiveChars_DetectsCorrectly(string message, bool shouldMatch)
    {
        Assert.Equal(shouldMatch, SpamDetector.RepetitiveChars().IsMatch(message));
    }

    [Theory]
    [InlineData("John Doe", false)]
    [InlineData("María García", false)]
    [InlineData("João Silva", false)]
    [InlineData("user123", true)]
    [InlineData("test@name", true)]
    [InlineData("name#tag", true)]
    public void InvalidNameChars_DetectsCorrectly(string name, bool shouldMatch)
    {
        Assert.Equal(shouldMatch, SpamDetector.InvalidNameChars().IsMatch(name));
    }

    [Fact]
    public void CheckForSpam_MessageTooShort_IsRejected()
    {
        var result = SpamDetector.CheckForSpam("John Doe", "Hi");
        Assert.False(result.IsValid);
        Assert.Equal("Message too short", result.Reason);
    }

    [Fact]
    public void CheckForSpam_MessageTooLong_IsRejected()
    {
        var longMessage = new string('a', SpamDetector.MaxMessageLength + 1);
        var result = SpamDetector.CheckForSpam("John Doe", longMessage);
        Assert.False(result.IsValid);
        Assert.Equal("Message too long", result.Reason);
    }

    [Theory]
    [InlineData("Hi", true)]                                // 2 chars - too short
    [InlineData("Hello!", true)]                             // 6 chars - too short
    [InlineData("Hey there!", false)]                        // 10 chars - at threshold
    [InlineData("Hello, I'd like to discuss a project", false)] // normal length
    public void CheckForSpam_MessageLength_ThresholdBehavior(string message, bool shouldBeRejected)
    {
        var result = SpamDetector.CheckForSpam("John Doe", message);
        Assert.Equal(shouldBeRejected, !result.IsValid && result.Reason.Contains("Message too short"));
    }

    [Theory]
    [InlineData(5000, false)]   // at max threshold
    [InlineData(5001, true)]    // over max threshold
    public void CheckForSpam_MessageMaxLength_ThresholdBehavior(int length, bool shouldBeRejected)
    {
        var message = new string('x', length);
        var result = SpamDetector.CheckForSpam("John Doe", message);
        Assert.Equal(shouldBeRejected, !result.IsValid && result.Reason.Contains("Message too long"));
    }

    [Fact]
    public void CheckForSpam_ValidMessage_IsAccepted()
    {
        var result = SpamDetector.CheckForSpam("John Doe", "Hello, I'd like to discuss a project with you.");
        Assert.True(result.IsValid);
    }

    [Fact]
    public void CheckForSpam_TooManyUrls_IsRejected()
    {
        var result = SpamDetector.CheckForSpam("John Doe", "Check https://a.com and https://b.com and https://c.com");
        Assert.False(result.IsValid);
        Assert.Equal("Too many URLs in message", result.Reason);
    }

    [Fact]
    public void CheckForSpam_InvalidName_IsRejected()
    {
        var result = SpamDetector.CheckForSpam("user123", "Hello, I'd like to discuss a project.");
        Assert.False(result.IsValid);
        Assert.Equal("Invalid name format", result.Reason);
    }
}

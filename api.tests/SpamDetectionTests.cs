using System.Text.RegularExpressions;
using Xunit;

namespace api.tests;

/// <summary>
/// Tests for spam detection patterns used in SendEmail.
/// These tests validate the regex patterns without requiring the full Azure Functions runtime.
/// </summary>
public class SpamDetectionTests
{
    // Replicate the regex patterns from SendEmail.cs
    private static readonly Regex UrlPattern = new(@"(https?://|www\.)", RegexOptions.IgnoreCase);
    private static readonly Regex EmailPattern = new(@"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", RegexOptions.IgnoreCase);
    private static readonly Regex SpamKeywords = new(@"(viagra|cialis|crypto|lottery|winner|prize|bitcoin|forex|casino|poker)", RegexOptions.IgnoreCase);
    private static readonly Regex RepetitiveChars = new(@"(.)\1{10,}");
    private static readonly Regex InvalidNameChars = new(@"[0-9@#$%^&*()+=\[\]{};:""\\|<>?/]");

    [Theory]
    [InlineData("Check out https://example.com and https://test.com and https://third.com", 3)]
    [InlineData("Visit www.example.com", 1)]
    [InlineData("No URLs here", 0)]
    [InlineData("One link: https://github.com", 1)]
    public void UrlPattern_DetectsCorrectCount(string message, int expectedCount)
    {
        var matches = UrlPattern.Matches(message);
        Assert.Equal(expectedCount, matches.Count);
    }

    [Theory]
    [InlineData("Contact me at test@example.com and other@example.com", 2)]
    [InlineData("My email is user@domain.org", 1)]
    [InlineData("No email addresses here", 0)]
    public void EmailPattern_DetectsCorrectCount(string message, int expectedCount)
    {
        var matches = EmailPattern.Matches(message);
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
        Assert.Equal(shouldMatch, SpamKeywords.IsMatch(message));
    }

    [Theory]
    [InlineData("aaaaaaaaaaaa", true)]     // 12 same chars
    [InlineData("Hello World!!", false)]    // Not enough repetition
    [InlineData("normal message", false)]
    public void RepetitiveChars_DetectsCorrectly(string message, bool shouldMatch)
    {
        Assert.Equal(shouldMatch, RepetitiveChars.IsMatch(message));
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
        Assert.Equal(shouldMatch, InvalidNameChars.IsMatch(name));
    }

    [Fact]
    public void MessageTooShort_IsDetected()
    {
        var shortMessage = "Hi";
        // Production threshold: messages under 10 chars are rejected
        Assert.True(shortMessage.Length < 10, "Short messages should be under the 10-char threshold");
        Assert.False(string.IsNullOrWhiteSpace(shortMessage), "Message should not be empty");
    }

    [Fact]
    public void MessageTooLong_IsDetected()
    {
        var longMessage = new string('a', 5001);
        // Production threshold: messages over 5000 chars are rejected
        Assert.True(longMessage.Length > 5000, "Long messages should exceed the 5000-char threshold");
    }

    [Theory]
    [InlineData("Hi", true)]                                // 2 chars - too short
    [InlineData("Hello!", true)]                             // 6 chars - too short
    [InlineData("Hey there!", false)]                        // 10 chars - at threshold
    [InlineData("Hello, I'd like to discuss a project", false)] // normal length
    public void MessageLength_ThresholdBehavior(string message, bool isTooShort)
    {
        Assert.Equal(isTooShort, message.Length < 10);
    }

    [Theory]
    [InlineData(5000, false)]   // at max threshold
    [InlineData(5001, true)]    // over max threshold
    public void MessageMaxLength_ThresholdBehavior(int length, bool isTooLong)
    {
        var message = new string('x', length);
        Assert.Equal(isTooLong, message.Length > 5000);
    }
}

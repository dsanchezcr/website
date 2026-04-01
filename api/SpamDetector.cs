using System.Text.RegularExpressions;

namespace api;

/// <summary>
/// Centralized spam detection logic shared between SendEmail and tests.
/// </summary>
internal static partial class SpamDetector
{
    [GeneratedRegex(@"(https?://|www\.)", RegexOptions.IgnoreCase)]
    internal static partial Regex UrlPattern();

    [GeneratedRegex(@"\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b", RegexOptions.IgnoreCase)]
    internal static partial Regex EmailPattern();

    [GeneratedRegex(@"(viagra|cialis|crypto|lottery|winner|prize|bitcoin|forex|casino|poker)", RegexOptions.IgnoreCase)]
    internal static partial Regex SpamKeywords();

    [GeneratedRegex(@"(.)\1{10,}")]
    internal static partial Regex RepetitiveChars();

    [GeneratedRegex(@"[0-9@#$%^&*()+=\[\]{};:""\\|<>?/]")]
    internal static partial Regex InvalidNameChars();

    internal const int MinMessageLength = 10;
    internal const int MaxMessageLength = 5000;
    internal const int MaxUrlCount = 2;
    internal const int MaxEmailCount = 1;

    internal record SpamCheckResult(bool IsValid, string Reason);

    internal static SpamCheckResult CheckForSpam(string name, string message)
    {
        // Check for excessive URLs
        var urlMatches = UrlPattern().Matches(message);
        if (urlMatches.Count > MaxUrlCount)
        {
            return new SpamCheckResult(false, "Too many URLs in message");
        }

        // Check for multiple email addresses (common in spam)
        var emailMatches = EmailPattern().Matches(message);
        if (emailMatches.Count > MaxEmailCount)
        {
            return new SpamCheckResult(false, "Multiple email addresses detected");
        }

        // Check for spam keywords
        if (SpamKeywords().IsMatch(message))
        {
            return new SpamCheckResult(false, "Spam keywords detected");
        }

        // Check message length (too short or too long can be suspicious)
        if (message.Length < MinMessageLength)
        {
            return new SpamCheckResult(false, "Message too short");
        }

        if (message.Length > MaxMessageLength)
        {
            return new SpamCheckResult(false, "Message too long");
        }

        // Check for repetitive characters (common in spam)
        if (RepetitiveChars().IsMatch(message))
        {
            return new SpamCheckResult(false, "Repetitive characters detected");
        }

        // Check name format (should not contain numbers or special characters)
        if (InvalidNameChars().IsMatch(name))
        {
            return new SpamCheckResult(false, "Invalid name format");
        }

        return new SpamCheckResult(true, string.Empty);
    }
}

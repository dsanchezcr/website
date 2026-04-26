using System.Text.Json.Serialization;

namespace api.Models.Newsletter;

/// <summary>
/// A newsletter subscriber stored in the newsletter-subscribers container.
/// Partition key: /email
/// </summary>
public class NewsletterSubscriber
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("frequency")]
    public string Frequency { get; set; } = "weekly";

    [JsonPropertyName("language")]
    public string Language { get; set; } = "en";

    [JsonPropertyName("status")]
    public string Status { get; set; } = "pending";

    [JsonPropertyName("subscribedAt")]
    public DateTime SubscribedAt { get; set; }

    [JsonPropertyName("verifiedAt")]
    public DateTime? VerifiedAt { get; set; }

    [JsonPropertyName("lastSentAt")]
    public DateTime? LastSentAt { get; set; }

    [JsonPropertyName("unsubscribeToken")]
    public string UnsubscribeToken { get; set; } = string.Empty;

    [JsonPropertyName("verificationToken")]
    public string? VerificationToken { get; set; }
}

/// <summary>
/// Request body for subscribing to the newsletter.
/// </summary>
public class SubscribeRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("frequency")]
    public string Frequency { get; set; } = "weekly";

    [JsonPropertyName("language")]
    public string Language { get; set; } = "en";

    [JsonPropertyName("recaptchaToken")]
    public string RecaptchaToken { get; set; } = string.Empty;

    [JsonPropertyName("website")]
    public string Website { get; set; } = string.Empty; // Honeypot
}

/// <summary>
/// Request body for updating newsletter preferences.
/// </summary>
public class UpdatePreferencesRequest
{
    [JsonPropertyName("email")]
    public string Email { get; set; } = string.Empty;

    [JsonPropertyName("frequency")]
    public string Frequency { get; set; } = string.Empty;

    [JsonPropertyName("token")]
    public string Token { get; set; } = string.Empty;
}

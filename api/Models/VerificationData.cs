namespace api.Models;

/// <summary>
/// Shared data model for email verification flow.
/// Used by SendEmail to store pending verification data and by VerifyEmail to retrieve it.
/// </summary>
public record VerificationData(string Name, string Email, string Message, string Language);

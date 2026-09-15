namespace api.Services;

public interface IGamingProfileService
{
    string Platform { get; }
    Task<GamingProfile> RefreshAsync(bool renewCredentials, CancellationToken ct);
}

using DotNetEnv;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace api.Services;

public sealed class TmdbSettings
{
    internal string? ReadAccessToken { get; init; }
    internal bool ConfigurationError { get; init; }
    public bool IsConfigured => !string.IsNullOrWhiteSpace(ReadAccessToken);

    public static TmdbSettings FromEnvironment()
    {
        var key = Environment.GetEnvironmentVariable("TMDB_READ_ACCESS_TOKEN");
        if (key != null) return new() { ReadAccessToken = key.Trim() };

        if (!string.IsNullOrEmpty(Environment.GetEnvironmentVariable("WEBSITE_INSTANCE_ID")) ||
            string.Equals(Environment.GetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT"), "Production", StringComparison.OrdinalIgnoreCase))
            return new();

        foreach (var start in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
        {
            var file = FindLocalFile(start);
            if (file != null) return LoadLocalFile(file);
        }
        return new();
    }

    internal static string? FindLocalFile(string start)
    {
        for (var directory = new DirectoryInfo(start); directory != null; directory = directory.Parent)
        {
            // Anchor discovery to this API project, never an arbitrary ancestor's .env.
            if (File.Exists(Path.Combine(directory.FullName, "api.csproj")))
                return Path.Combine(directory.FullName, ".env");
            if (File.Exists(Path.Combine(directory.FullName, "api", "api.csproj")))
                return Path.Combine(directory.FullName, "api", ".env");
        }
        return null;
    }

    internal static TmdbSettings LoadLocalFile(string file)
    {
        var key = Environment.GetEnvironmentVariable("TMDB_READ_ACCESS_TOKEN");
        if (key != null) return new() { ReadAccessToken = key.Trim() };
        try
        {
            return LoadLocalContents(File.ReadAllText(file));
        }
        catch (FileNotFoundException) { return new(); }
        catch (DirectoryNotFoundException) { return new(); }
        catch (IOException) { return new() { ConfigurationError = true }; }
        catch (UnauthorizedAccessException) { return new() { ConfigurationError = true }; }
    }

    internal static TmdbSettings LoadLocalContents(string contents)
    {
        var key = Environment.GetEnvironmentVariable("TMDB_READ_ACCESS_TOKEN");
        if (key != null) return new() { ReadAccessToken = key.Trim() };
        try
        {
            // Parse without exporting unrelated settings or logging parser errors (which can contain secrets).
            var values = Env.LoadContents(contents, new LoadOptions(setEnvVars: false));
            return new() { ReadAccessToken = values.LastOrDefault(pair => pair.Key == "TMDB_READ_ACCESS_TOKEN").Value?.Trim() };
        }
        catch
        {
            return new() { ConfigurationError = true };
        }
    }
}

public static class TmdbRegistration
{
    public static IServiceCollection AddTmdbLookup(this IServiceCollection services)
    {
        services.AddHttpClient(TmdbLookupService.ClientName, client =>
            {
                client.Timeout = TmdbLookupService.RequestTimeout;
                client.MaxResponseContentBufferSize = TmdbLookupService.MaxResponseBytes;
            })
            .RemoveAllLoggers()
            .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
            {
                AllowAutoRedirect = false,
                UseCookies = false,
                ActivityHeadersPropagator = null
            });
        services.AddSingleton(provider =>
        {
            var settings = TmdbSettings.FromEnvironment();
            if (settings.ConfigurationError)
                provider.GetRequiredService<ILogger<TmdbSettings>>()
                    .LogWarning("TMDB local configuration could not be read. Check the API project's dotenv file.");
            return settings;
        });
        services.AddSingleton<ITmdbLookupService, TmdbLookupService>();
        return services;
    }
}

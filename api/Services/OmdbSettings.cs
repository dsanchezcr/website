using DotNetEnv;
using Microsoft.Extensions.DependencyInjection;

namespace api.Services;

public sealed class OmdbSettings
{
    internal string? ApiKey { get; init; }
    public bool IsConfigured => !string.IsNullOrWhiteSpace(ApiKey);

    public static OmdbSettings FromEnvironment()
    {
        var key = Environment.GetEnvironmentVariable("OMDB_API_KEY");
        if (key != null) return new() { ApiKey = key };

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

    internal static OmdbSettings LoadLocalFile(string file)
    {
        var key = Environment.GetEnvironmentVariable("OMDB_API_KEY");
        if (key != null) return new() { ApiKey = key };
        try
        {
            return LoadLocalContents(File.ReadAllText(file));
        }
        catch
        {
            return new();
        }
    }

    internal static OmdbSettings LoadLocalContents(string contents)
    {
        var key = Environment.GetEnvironmentVariable("OMDB_API_KEY");
        if (key != null) return new() { ApiKey = key };
        try
        {
            // Parse without exporting unrelated settings or logging parser errors (which can contain secrets).
            var values = Env.LoadContents(contents, new LoadOptions(setEnvVars: false));
            return new() { ApiKey = values.LastOrDefault(pair => pair.Key == "OMDB_API_KEY").Value };
        }
        catch
        {
            return new();
        }
    }
}

public static class OmdbRegistration
{
    public static IServiceCollection AddOmdbLookup(this IServiceCollection services)
    {
        services.AddHttpClient(OmdbLookupService.ClientName, client =>
            {
                client.Timeout = OmdbLookupService.RequestTimeout;
                client.MaxResponseContentBufferSize = OmdbLookupService.MaxResponseBytes;
            })
            // OMDb requires a query-string key. Factory logging is separate from OTel suppression.
            .RemoveAllLoggers()
            .ConfigurePrimaryHttpMessageHandler(() => new SocketsHttpHandler
            {
                AllowAutoRedirect = false,
                UseCookies = false,
                ActivityHeadersPropagator = null
            });
        services.AddSingleton(_ => OmdbSettings.FromEnvironment());
        services.AddSingleton<IOmdbLookupService, OmdbLookupService>();
        return services;
    }
}

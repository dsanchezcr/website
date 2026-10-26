using api.Services;
using Xunit;

namespace api.tests;

[CollectionDefinition("TMDB environment", DisableParallelization = true)]
public class TmdbEnvironmentCollection;

[Collection("TMDB environment")]
public class TmdbSettingsTests : IDisposable
{
    private readonly string? _key = Environment.GetEnvironmentVariable("TMDB_READ_ACCESS_TOKEN");
    private readonly string? _environment = Environment.GetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT");
    private readonly string? _instance = Environment.GetEnvironmentVariable("WEBSITE_INSTANCE_ID");

    public TmdbSettingsTests() => Environment.SetEnvironmentVariable("TMDB_READ_ACCESS_TOKEN", null);

    [Theory]
    [InlineData("TMDB_READ_ACCESS_TOKEN=test-local", "test-local")]
    [InlineData("# comment\nexport TMDB_READ_ACCESS_TOKEN=\"quoted value\" # comment", "quoted value")]
    [InlineData("TMDB_READ_ACCESS_TOKEN='literal#value'", "literal#value")]
    [InlineData("TMDB_READ_ACCESS_TOKEN=first\nTMDB_READ_ACCESS_TOKEN=last", "last")]
    public void DotenvUsesLibraryParsingWithoutMutatingEnvironment(string contents, string expected)
    {
        var settings = TmdbSettings.LoadLocalContents(contents + "\nTMDB_TEST_UNRELATED=must-not-be-exported");
        Assert.Equal(expected, settings.ReadAccessToken);
        Assert.True(settings.IsConfigured);
        Assert.Null(Environment.GetEnvironmentVariable("TMDB_READ_ACCESS_TOKEN"));
        Assert.Null(Environment.GetEnvironmentVariable("TMDB_TEST_UNRELATED"));
    }

    [Fact]
    public void ExistingEnvironmentWinsEvenWhenDotenvWouldFailToParse()
    {
        Environment.SetEnvironmentVariable("TMDB_READ_ACCESS_TOKEN", "configured-environment");
        Assert.Equal("configured-environment", TmdbSettings.LoadLocalContents("broken '").ReadAccessToken);
        Assert.Equal("configured-environment", TmdbSettings.LoadLocalFile("nonexistent.env").ReadAccessToken);
        Assert.Equal("configured-environment", TmdbSettings.FromEnvironment().ReadAccessToken);
    }

    [Fact]
    public void WhitespaceEnvironmentSettingIsNotOverridden()
    {
        Environment.SetEnvironmentVariable("TMDB_READ_ACCESS_TOKEN", " ");
        Assert.False(TmdbSettings.LoadLocalContents("TMDB_READ_ACCESS_TOKEN=test-local").IsConfigured);
    }

    [Theory]
    [InlineData("")]
    [InlineData("OTHER_SETTING=unrelated")]
    [InlineData("TMDB_READ_ACCESS_TOKEN='unterminated-test-value")]
    public void InvalidOrMissingDotenvKeyLeavesEndpointUnconfigured(string contents) =>
        Assert.False(TmdbSettings.LoadLocalContents(contents).IsConfigured);

    [Fact]
    public void MissingDotenvFileIsOptional() =>
        Assert.False(TmdbSettings.LoadLocalFile("nonexistent-tmdb-settings.env").IsConfigured);

    [Fact]
    public void PublishedProductionUsesOnlyEnvironmentConfiguration()
    {
        Environment.SetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT", "Production");
        Assert.False(TmdbSettings.FromEnvironment().IsConfigured);
        Environment.SetEnvironmentVariable("TMDB_READ_ACCESS_TOKEN", "deployed-server-value");
        Assert.True(TmdbSettings.FromEnvironment().IsConfigured);
    }

    [Fact]
    public void AzureInstanceNeverLoadsLocalDotenv()
    {
        Environment.SetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT", "Development");
        Environment.SetEnvironmentVariable("WEBSITE_INSTANCE_ID", "test-instance");
        Assert.False(TmdbSettings.FromEnvironment().IsConfigured);
    }

    [Fact]
    public void LocalDiscoveryResolvesOnlyTheApiProjectDotenv()
    {
        var file = TmdbSettings.FindLocalFile(AppContext.BaseDirectory);
        Assert.NotNull(file);
        Assert.Equal(".env", Path.GetFileName(file));
        Assert.True(File.Exists(Path.Combine(Path.GetDirectoryName(file)!, "api.csproj")));
        Assert.Equal(file, TmdbSettings.FindLocalFile(Path.Combine(Path.GetDirectoryName(file)!, "bin", "Debug", "net9.0")));
    }

    public void Dispose()
    {
        Environment.SetEnvironmentVariable("TMDB_READ_ACCESS_TOKEN", _key);
        Environment.SetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT", _environment);
        Environment.SetEnvironmentVariable("WEBSITE_INSTANCE_ID", _instance);
    }
}

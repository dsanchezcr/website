using api.Services;
using Xunit;

namespace api.tests;

[CollectionDefinition("OMDb environment", DisableParallelization = true)]
public class OmdbEnvironmentCollection;

[Collection("OMDb environment")]
public class OmdbSettingsTests : IDisposable
{
    private readonly string? _key = Environment.GetEnvironmentVariable("OMDB_API_KEY");
    private readonly string? _environment = Environment.GetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT");
    private readonly string? _instance = Environment.GetEnvironmentVariable("WEBSITE_INSTANCE_ID");

    public OmdbSettingsTests() => Environment.SetEnvironmentVariable("OMDB_API_KEY", null);

    [Theory]
    [InlineData("OMDB_API_KEY=test-local", "test-local")]
    [InlineData("# comment\nexport OMDB_API_KEY=\"quoted value\" # comment", "quoted value")]
    [InlineData("OMDB_API_KEY='literal#value'", "literal#value")]
    [InlineData("OMDB_API_KEY=first\nOMDB_API_KEY=last", "last")]
    public void DotenvUsesLibraryParsingWithoutMutatingEnvironment(string contents, string expected)
    {
        var settings = OmdbSettings.LoadLocalContents(contents + "\nOMDB_TEST_UNRELATED=must-not-be-exported");
        Assert.Equal(expected, settings.ApiKey);
        Assert.True(settings.IsConfigured);
        Assert.Null(Environment.GetEnvironmentVariable("OMDB_API_KEY"));
        Assert.Null(Environment.GetEnvironmentVariable("OMDB_TEST_UNRELATED"));
    }

    [Fact]
    public void ExistingEnvironmentWinsEvenWhenDotenvWouldFailToParse()
    {
        Environment.SetEnvironmentVariable("OMDB_API_KEY", "configured-environment");
        Assert.Equal("configured-environment", OmdbSettings.LoadLocalContents("broken '").ApiKey);
        Assert.Equal("configured-environment", OmdbSettings.LoadLocalFile("nonexistent.env").ApiKey);
        Assert.Equal("configured-environment", OmdbSettings.FromEnvironment().ApiKey);
    }

    [Fact]
    public void WhitespaceEnvironmentSettingIsNotOverridden()
    {
        Environment.SetEnvironmentVariable("OMDB_API_KEY", " ");
        Assert.False(OmdbSettings.LoadLocalContents("OMDB_API_KEY=test-local").IsConfigured);
    }

    [Theory]
    [InlineData("")]
    [InlineData("OTHER_SETTING=unrelated")]
    [InlineData("OMDB_API_KEY='unterminated-test-value")]
    public void InvalidOrMissingDotenvKeyLeavesEndpointUnconfigured(string contents) =>
        Assert.False(OmdbSettings.LoadLocalContents(contents).IsConfigured);

    [Fact]
    public void MissingDotenvFileIsOptional() =>
        Assert.False(OmdbSettings.LoadLocalFile("nonexistent-omdb-settings.env").IsConfigured);

    [Fact]
    public void PublishedProductionUsesOnlyEnvironmentConfiguration()
    {
        Environment.SetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT", "Production");
        Assert.False(OmdbSettings.FromEnvironment().IsConfigured);
        Environment.SetEnvironmentVariable("OMDB_API_KEY", "deployed-server-value");
        Assert.True(OmdbSettings.FromEnvironment().IsConfigured);
    }

    [Fact]
    public void AzureInstanceNeverLoadsLocalDotenv()
    {
        Environment.SetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT", "Development");
        Environment.SetEnvironmentVariable("WEBSITE_INSTANCE_ID", "test-instance");
        Assert.False(OmdbSettings.FromEnvironment().IsConfigured);
    }

    [Fact]
    public void LocalDiscoveryResolvesOnlyTheApiProjectDotenv()
    {
        var file = OmdbSettings.FindLocalFile(AppContext.BaseDirectory);
        Assert.NotNull(file);
        Assert.Equal(".env", Path.GetFileName(file));
        Assert.True(File.Exists(Path.Combine(Path.GetDirectoryName(file)!, "api.csproj")));
        Assert.Equal(file, OmdbSettings.FindLocalFile(Path.Combine(Path.GetDirectoryName(file)!, "bin", "Debug", "net9.0")));
    }

    public void Dispose()
    {
        Environment.SetEnvironmentVariable("OMDB_API_KEY", _key);
        Environment.SetEnvironmentVariable("AZURE_FUNCTIONS_ENVIRONMENT", _environment);
        Environment.SetEnvironmentVariable("WEBSITE_INSTANCE_ID", _instance);
    }
}

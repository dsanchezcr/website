using api.Services;
using Xunit;

namespace api.tests;

public class ImdbSyncServiceTests
{
    [Fact]
    public void ExtractTitleIds_Deduplicates_AndPreservesOrder()
    {
        var html = """
            <a href=\"/title/tt0111161/\">The Shawshank Redemption</a>
            <a href=\"/title/tt0111161/\">duplicate</a>
            <a href=\"/title/tt0468569/\">The Dark Knight</a>
            """;

        var ids = ImdbSyncService.ExtractTitleIds(html);

        Assert.Equal(new[] { "tt0111161", "tt0468569" }, ids);
    }

    [Fact]
    public void ExtractRatings_ParsesTitleIdAndUserRating()
    {
        var html = """
            {"titleId":"tt0903747","userRating":10}
            {"titleId":"tt0910970","userRating":8}
            """;

        var ratings = ImdbSyncService.ExtractRatings(html);

        Assert.Equal(10d, ratings["tt0903747"]);
        Assert.Equal(8d, ratings["tt0910970"]);
    }

    [Theory]
    [InlineData("tvSeries", true)]
    [InlineData("tvMiniSeries", true)]
    [InlineData("tvEpisode", true)]
    [InlineData("movie", false)]
    [InlineData("short", false)]
    [InlineData("", false)]
    public void IsSeriesKind_ClassifiesExpectedKinds(string kind, bool expected)
    {
        Assert.Equal(expected, ImdbSyncService.IsSeriesKind(kind));
    }
}

using api;
using Xunit;

namespace api.tests;

/// <summary>
/// Tests for QueryHelpers.GetQueryParam, covering URL decoding, empty-value handling,
/// and form-urlencoded '+'-as-space semantics.
/// </summary>
public class QueryHelpersTests
{
    // -------------------------------------------------------------------------
    // Basic key lookup
    // -------------------------------------------------------------------------

    [Fact]
    public void GetQueryParam_ReturnsValue_ForPresentKey()
    {
        var result = QueryHelpers.GetQueryParam("?category=action", "category");
        Assert.Equal("action", result);
    }

    [Fact]
    public void GetQueryParam_ReturnsValue_WithoutLeadingQuestionMark()
    {
        var result = QueryHelpers.GetQueryParam("category=action", "category");
        Assert.Equal("action", result);
    }

    [Fact]
    public void GetQueryParam_ReturnsNull_ForAbsentKey()
    {
        var result = QueryHelpers.GetQueryParam("?platform=xbox", "category");
        Assert.Null(result);
    }

    [Fact]
    public void GetQueryParam_ReturnsNull_ForEmptyQueryString()
    {
        var result = QueryHelpers.GetQueryParam("", "category");
        Assert.Null(result);
    }

    [Fact]
    public void GetQueryParam_ReturnsNull_ForQueryStringWithOnlyQuestionMark()
    {
        var result = QueryHelpers.GetQueryParam("?", "category");
        Assert.Null(result);
    }

    // -------------------------------------------------------------------------
    // Empty / whitespace values return null (matching documented behaviour)
    // -------------------------------------------------------------------------

    [Fact]
    public void GetQueryParam_ReturnsNull_WhenValueIsEmpty()
    {
        // ?category= should be treated as "no value" per the documented behaviour
        var result = QueryHelpers.GetQueryParam("?category=", "category");
        Assert.Null(result);
    }

    [Fact]
    public void GetQueryParam_ReturnsNull_WhenValueIsPercentEncodedWhitespace()
    {
        // %20 decodes to a space — still whitespace, still null
        var result = QueryHelpers.GetQueryParam("?category=%20", "category");
        Assert.Null(result);
    }

    [Fact]
    public void GetQueryParam_ReturnsNull_WhenValueIsPlusSignOnly()
    {
        // + decodes to a space — still whitespace, still null
        var result = QueryHelpers.GetQueryParam("?category=+", "category");
        Assert.Null(result);
    }

    // -------------------------------------------------------------------------
    // URL / form-urlencoded decoding
    // -------------------------------------------------------------------------

    [Fact]
    public void GetQueryParam_DecodesPercentEncoding()
    {
        var result = QueryHelpers.GetQueryParam("?category=science%20fiction", "category");
        Assert.Equal("science fiction", result);
    }

    [Fact]
    public void GetQueryParam_DecodesPlusAsSpace()
    {
        var result = QueryHelpers.GetQueryParam("?category=science+fiction", "category");
        Assert.Equal("science fiction", result);
    }

    [Fact]
    public void GetQueryParam_DecodesKeyWithPercentEncoding()
    {
        // Encoded key name should still match the decoded form
        var result = QueryHelpers.GetQueryParam("?plat%66orm=xbox", "platform");
        Assert.Equal("xbox", result);
    }

    // -------------------------------------------------------------------------
    // Multiple parameters
    // -------------------------------------------------------------------------

    [Fact]
    public void GetQueryParam_ReturnsCorrectValue_WithMultipleParams()
    {
        var result = QueryHelpers.GetQueryParam("?platform=xbox&section=topGames&page=1", "section");
        Assert.Equal("topGames", result);
    }

    [Fact]
    public void GetQueryParam_ReturnsFirstOccurrence_WhenKeyRepeated()
    {
        var result = QueryHelpers.GetQueryParam("?category=action&category=drama", "category");
        Assert.Equal("action", result);
    }

    // -------------------------------------------------------------------------
    // NullCosmosContentService initialization error tracking
    // -------------------------------------------------------------------------

    [Fact]
    public void NullCosmosContentService_InitializationError_IsNullByDefault()
    {
        var svc = new api.Services.NullCosmosContentService();
        Assert.Null(svc.InitializationError);
    }

    [Fact]
    public void NullCosmosContentService_InitializationError_IsStoredWhenProvided()
    {
        var svc = new api.Services.NullCosmosContentService("Invalid endpoint URI");
        Assert.Equal("Invalid endpoint URI", svc.InitializationError);
    }

    [Fact]
    public async Task NullCosmosContentService_IsConfiguredAsync_ReturnsFalse()
    {
        var svc = new api.Services.NullCosmosContentService("some error");
        Assert.False(await svc.IsConfiguredAsync());
    }
}

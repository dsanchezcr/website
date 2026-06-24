using System.Text.Json.Nodes;
using api.Services;
using Xunit;

namespace api.tests;

/// <summary>
/// Tests for CosmosAdminService helpers that are pure (no live Cosmos connection required).
/// </summary>
public class CosmosAdminServiceTests
{
    [Fact]
    public void StripSystemProperties_RemovesCosmosSystemFields_PreservesUserData()
    {
        var doc = new JsonObject
        {
            ["id"] = "m1",
            ["category"] = "drama",
            ["customField"] = "keep me",
            ["nested"] = new JsonObject { ["x"] = 1 },
            ["_rid"] = "abc",
            ["_self"] = "dbs/x/colls/y/docs/z",
            ["_etag"] = "\"00000000-0000-0000-0000-000000000000\"",
            ["_attachments"] = "attachments/",
            ["_ts"] = 1234567890
        };

        CosmosAdminService.StripSystemProperties(doc);

        // User data preserved (including unknown/custom fields)
        Assert.True(doc.ContainsKey("id"));
        Assert.True(doc.ContainsKey("category"));
        Assert.True(doc.ContainsKey("customField"));
        Assert.True(doc.ContainsKey("nested"));

        // Cosmos-managed system properties removed
        Assert.False(doc.ContainsKey("_rid"));
        Assert.False(doc.ContainsKey("_self"));
        Assert.False(doc.ContainsKey("_etag"));
        Assert.False(doc.ContainsKey("_attachments"));
        Assert.False(doc.ContainsKey("_ts"));
    }

    [Fact]
    public void NullCosmosAdminService_ReportsNotConfigured()
    {
        var svc = new NullCosmosAdminService();
        Assert.False(svc.IsConfigured);
    }
}

using api;
using Xunit;

namespace api.tests;

/// <summary>
/// Tests for admin authorization helpers: the email allow-list used by the SWA rolesSource
/// function and the client-principal role check used by the admin endpoints.
/// </summary>
public class AdminAuthTests
{
    [Fact]
    public void ParseAllowList_SplitsCommaAndSemicolon_TrimsAndIsCaseInsensitive()
    {
        var set = GetRoles.ParseAllowList(" a@x.com, B@x.com ; c@x.com ");
        Assert.Contains("a@x.com", set);
        Assert.Contains("b@x.com", set); // case-insensitive membership
        Assert.Contains("C@X.COM", set);
        Assert.Equal(3, set.Count);
    }

    [Fact]
    public void ParseAllowList_Empty_ReturnsEmptySet()
    {
        Assert.Empty(GetRoles.ParseAllowList(null));
        Assert.Empty(GetRoles.ParseAllowList("   "));
    }

    [Fact]
    public void IsAllowListed_MatchesUserDetails_CaseInsensitive()
    {
        var allow = GetRoles.ParseAllowList("admin@x.com");
        Assert.True(GetRoles.IsAllowListed("admin@x.com", null, allow));
        Assert.True(GetRoles.IsAllowListed("ADMIN@x.com", null, allow));
        Assert.False(GetRoles.IsAllowListed("other@x.com", null, allow));
    }

    [Fact]
    public void IsAllowListed_MatchesAnyClaimValue()
    {
        var allow = GetRoles.ParseAllowList("admin@x.com");
        Assert.True(GetRoles.IsAllowListed(null, new[] { "noise", "admin@x.com" }, allow));
        Assert.False(GetRoles.IsAllowListed(null, new[] { "noise" }, allow));
    }

    [Fact]
    public void IsAllowListed_NoMatch_WhenEverythingNull()
    {
        var allow = GetRoles.ParseAllowList("admin@x.com");
        Assert.False(GetRoles.IsAllowListed(null, null, allow));
    }

    [Fact]
    public void ClientPrincipal_IsInRole_IsCaseInsensitive()
    {
        var principal = new ClientPrincipal { UserRoles = new() { "anonymous", "authenticated", "admin" } };
        Assert.True(principal.IsInRole("admin"));
        Assert.True(principal.IsInRole("ADMIN"));
        Assert.False(principal.IsInRole("editor"));
    }

    [Fact]
    public void ClientPrincipal_IsInRole_FalseWhenNoRoles()
    {
        var principal = new ClientPrincipal();
        Assert.False(principal.IsInRole("admin"));
    }
}

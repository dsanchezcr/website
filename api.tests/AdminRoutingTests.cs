using System.Reflection;
using api.Services;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Routing;
using Microsoft.AspNetCore.Routing.Constraints;
using Microsoft.Azure.Functions.Worker;
using Microsoft.Extensions.DependencyInjection;
using Xunit;

namespace api.tests;

public class AdminRoutingTests
{
    [Fact]
    public async Task OmdbLookupIsNotInterceptedByEarlierCollectionRoute()
    {
        var result = await Match("/content-admin/omdb", "GET");
        Assert.Equal("GetOmdbMetadata", result?.Values["function"]);
    }

    [Theory]
    [InlineData("omdb-extra")]
    [InlineData("unknown")]
    [InlineData("movies-extra")]
    [InlineData("extra-movies")]
    [InlineData("monthly-updates-extra")]
    public async Task UnsupportedCollectionSlugsDoNotMatch(string slug) =>
        Assert.Null(await Match($"/content-admin/{slug}", "GET"));

    [Theory]
    [InlineData("GET")]
    [InlineData("POST")]
    public async Task EveryRegisteredCollectionStillMatchesIncludingCaseVariants(string method)
    {
        foreach (var slug in AdminContentTypes.Slugs)
        {
            foreach (var variant in new[] { slug, slug.ToUpperInvariant() })
            {
                var result = await Match($"/content-admin/{variant}", method);
                Assert.Equal("AdminCollection", result?.Values["function"]);
                Assert.Equal(variant, result?.Values["type"]);
            }
        }
    }

    [Theory]
    [InlineData("GET")]
    [InlineData("PUT")]
    [InlineData("DELETE")]
    public async Task EveryRegisteredItemRouteRemainsUnchanged(string method)
    {
        foreach (var slug in AdminContentTypes.Slugs)
        {
            var result = await Match($"/content-admin/{slug}/example-id", method);
            Assert.Equal("AdminItem", result?.Values["function"]);
            Assert.Equal(slug, result?.Values["type"]);
            Assert.Equal("example-id", result?.Values["id"]);
        }
    }

    [Theory]
    [InlineData("/content-admin/omdb", "POST")]
    [InlineData("/content-admin/movies", "DELETE")]
    [InlineData("/content-admin/movies/example-id", "POST")]
    public async Task UnsupportedMethodsDoNotMatch(string path, string method) =>
        Assert.Null(await Match(path, method));

    private static async Task<RouteData?> Match(string path, string method)
    {
        using var services = new ServiceCollection().AddLogging().AddRouting().BuildServiceProvider();
        var resolver = services.GetRequiredService<IInlineConstraintResolver>();
        var routes = new RouteCollection();
        var functions = new[]
        {
            typeof(AdminContent).GetMethod(nameof(AdminContent.Collection))!,
            typeof(AdminContent).GetMethod(nameof(AdminContent.Item))!,
            typeof(GetOmdbMetadata).GetMethod(nameof(GetOmdbMetadata.Run))!
        };

        // Functions uses first-match routing, so reproduce collection-before-lookup registration.
        foreach (var function in functions.OrderBy(info => info.GetCustomAttribute<FunctionAttribute>()!.Name, StringComparer.Ordinal))
        {
            var trigger = function.GetParameters()[0].GetCustomAttribute<HttpTriggerAttribute>()!;
            routes.Add(new Route(
                new FunctionTarget(function.GetCustomAttribute<FunctionAttribute>()!.Name),
                trigger.Route!, defaults: null,
                constraints: new Dictionary<string, object> { ["httpMethod"] = new HttpMethodRouteConstraint(trigger.Methods!) },
                dataTokens: null, inlineConstraintResolver: resolver));
        }

        var context = new DefaultHttpContext { RequestServices = services };
        context.Request.Path = path;
        context.Request.Method = method;
        var routeContext = new RouteContext(context);
        await routes.RouteAsync(routeContext);
        return routeContext.Handler == null ? null : routeContext.RouteData;
    }

    private sealed class FunctionTarget(string name) : IRouter
    {
        public Task RouteAsync(RouteContext context)
        {
            context.RouteData.Values["function"] = name;
            context.Handler = _ => Task.CompletedTask;
            return Task.CompletedTask;
        }

        public VirtualPathData? GetVirtualPath(VirtualPathContext context) => null;
    }
}

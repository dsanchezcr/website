using System.Text.Json.Nodes;
using api.Models.Content;

namespace api.Services;

public static class GamingOrdering
{
    public static IReadOnlyList<GamingDocument> Sort(IEnumerable<GamingDocument> items, string? section = null)
    {
        if (string.Equals(section, "topGames", StringComparison.OrdinalIgnoreCase))
            return items.OrderBy(g => g.Order).ThenBy(g => g.Id, StringComparer.Ordinal).ToList();

        return items.OrderBy(g => g.ManualOrder ?? int.MaxValue)
            .ThenByDescending(g => g.CreatedAt?.ToUnixTimeMilliseconds() ?? long.MinValue)
            .ThenByDescending(g => g.Order)
            .ThenBy(g => g.Id, StringComparer.Ordinal).ToList();
    }

    public static IReadOnlyList<JsonObject> SortDocuments(IEnumerable<JsonObject> items) =>
        items.GroupBy(g => (Platform: g["platform"]?.ToString(), Section: g["section"]?.ToString()))
            .OrderBy(g => g.Key.Platform, StringComparer.Ordinal)
            .ThenBy(g => g.Key.Section, StringComparer.Ordinal)
            .SelectMany(group =>
            {
                var documents = group.ToDictionary(g => g["id"]!.GetValue<string>());
                var sorted = Sort(group.Select(g => new GamingDocument
                {
                    Id = g["id"]!.GetValue<string>(),
                    Order = Integer(g["order"]) ?? 0,
                    ManualOrder = Integer(g["manualOrder"]),
                    CreatedAt = DateTimeOffset.TryParse(g["createdAt"]?.ToString(), out var date) ? date : null
                }), group.Key.Section);
                return sorted.Select(g => documents[g.Id]);
            }).ToList();

    private static int? Integer(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<int>(out var number) ? number : null;

    public static void StampCreation(JsonObject doc, DateTimeOffset now) => doc["createdAt"] = now.ToString("O");

    public static void PreserveCreation(JsonObject doc, JsonObject existing)
    {
        if (existing["createdAt"] != null)
            doc["createdAt"] = existing["createdAt"]!.DeepClone();
        else
            doc.Remove("createdAt");
    }
}

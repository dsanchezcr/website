using System.Globalization;
using System.Text.Json.Nodes;
using api.Models.Content;

namespace api.Services;

public static class MediaOrdering
{
    public static IReadOnlyList<JsonObject> SortDocuments(IEnumerable<JsonObject> documents)
    {
        return documents.GroupBy(doc => ReadString(doc["category"]) ?? string.Empty)
            .OrderBy(group => group.Key, StringComparer.Ordinal)
            .SelectMany(group => Sort(group.Select(doc => new RawMedia(doc)
            {
                SyncSource = ReadString(doc["syncSource"]),
                SyncedAt = DateTimeOffset.TryParse(ReadString(doc["syncedAt"]), CultureInfo.InvariantCulture,
                    DateTimeStyles.None, out var timestamp) ? timestamp : null,
                Order = doc["order"] is JsonValue rank && rank.TryGetValue<int>(out var value) ? value : null
            }), group.Key).Select(item => item.Document))
            .ToList();
    }

    private static string? ReadString(JsonNode? node) =>
        node is JsonValue value && value.TryGetValue<string>(out var text) ? text : null;

    // Read ordering keys only; malformed legacy metadata must remain editable.
    private sealed class RawMedia(JsonObject document) : MediaDocument
    {
        public JsonObject Document { get; } = document;
    }

    public static IReadOnlyList<T> Sort<T>(IEnumerable<T> items, string? category) where T : MediaDocument
    {
        if (category is "top-movies" or "top-series" or "top-tv")
            return items.OrderBy(item => item.Order ?? int.MaxValue).ToList();

        // A non-destructive sync retains removed titles. Current snapshots precede
        // retained snapshots; within a snapshot order mirrors created_at.desc.
        // Manual records keep their relative descending order, after account feeds.
        return items.OrderByDescending(item => item.SyncSource == "tmdb")
            .ThenByDescending(item => item.SyncSource == "tmdb" ? item.SyncedAt : null)
            .ThenByDescending(item => item.Order ?? int.MinValue)
            .ToList();
    }
}

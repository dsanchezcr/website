using System.Text.Json;
using System.Text.Json.Nodes;
using System.Text.RegularExpressions;

namespace api.Services;

/// <summary>
/// Server-side validation for admin content writes. Catches the most common mistakes that would
/// break the public site (missing partition key, malformed localized objects, invalid gaming
/// status, non-numeric ratings) before anything is persisted. Unknown fields are intentionally
/// left untouched so they round-trip unchanged.
/// </summary>
public static class ContentValidator
{
    private static readonly HashSet<string> GamingStatuses = new(StringComparer.OrdinalIgnoreCase)
    {
        "completed", "playing", "backlog", "dropped"
    };

    private static readonly Regex MonthPattern = new(@"^\d{4}-\d{2}$", RegexOptions.Compiled);

    /// <summary>
    /// Validate a document for the given content type. Returns a list of human-readable error
    /// messages; an empty list means the document is valid.
    /// </summary>
    public static IReadOnlyList<string> Validate(AdminContentType type, JsonObject doc)
    {
        var errors = new List<string>();

        // Partition key is always required and must be a non-empty string.
        var pkValue = AsString(doc[type.PartitionKeyField]);
        if (string.IsNullOrWhiteSpace(pkValue))
            errors.Add($"Field '{type.PartitionKeyField}' (partition key) is required and must be a non-empty string.");

        // id, when present, must be a string.
        if (doc.ContainsKey("id") && Kind(doc["id"]) is not (JsonValueKind.String or JsonValueKind.Null))
            errors.Add("Field 'id' must be a string.");

        switch (type.Slug)
        {
            case "movies":
            case "series":
                RequireString(doc, "titleId", errors, required: false);
                RequireNumberInRange(doc, "myRating", 0, 10, errors);
                RequireInt(doc, "order", errors);
                RequireLocalized(doc, "review", errors, allowPlainString: false);
                break;

            case "gaming":
                RequireInt(doc, "order", errors);
                RequireGamingStatus(doc, errors);
                RequireLocalized(doc, "title", errors, allowPlainString: true);
                RequireLocalized(doc, "description", errors, allowPlainString: true);
                RequireLocalized(doc, "recommendation", errors, allowPlainString: true);
                RequireBool(doc, "coOp", errors);
                RequireBool(doc, "online", errors);
                break;

            case "parks":
                RequireLocalized(doc, "name", errors, allowPlainString: false);
                RequireLocalized(doc, "description", errors, allowPlainString: false);
                RequireNumberArray(doc, "mapCenter", 2, errors);
                RequireNumber(doc, "mapZoom", errors);
                break;

            case "monthly-updates":
                RequireInt(doc, "order", errors);
                if (!string.IsNullOrWhiteSpace(pkValue) && !MonthPattern.IsMatch(pkValue!))
                    errors.Add("Field 'month' must be in 'YYYY-MM' format.");
                break;
        }

        return errors;
    }

    // ── helpers ──

    private static JsonValueKind Kind(JsonNode? node) => node?.GetValueKind() ?? JsonValueKind.Null;

    private static bool IsAbsent(JsonNode? node) => node is null || node.GetValueKind() == JsonValueKind.Null;

    private static string? AsString(JsonNode? node) =>
        node is JsonValue v && v.TryGetValue<string>(out var s) ? s : null;

    private static void RequireString(JsonObject doc, string field, List<string> errors, bool required)
    {
        var node = doc[field];
        if (IsAbsent(node))
        {
            if (required) errors.Add($"Field '{field}' is required.");
            return;
        }
        if (Kind(node) != JsonValueKind.String)
            errors.Add($"Field '{field}' must be a string.");
    }

    private static void RequireBool(JsonObject doc, string field, List<string> errors)
    {
        var node = doc[field];
        if (IsAbsent(node)) return;
        if (Kind(node) is not (JsonValueKind.True or JsonValueKind.False))
            errors.Add($"Field '{field}' must be a boolean.");
    }

    private static void RequireNumber(JsonObject doc, string field, List<string> errors)
    {
        var node = doc[field];
        if (IsAbsent(node)) return;
        if (Kind(node) != JsonValueKind.Number)
            errors.Add($"Field '{field}' must be a number.");
    }

    private static void RequireInt(JsonObject doc, string field, List<string> errors)
    {
        var node = doc[field];
        if (IsAbsent(node)) return;
        if (Kind(node) != JsonValueKind.Number || !TryGetDouble(node!, out var d) || d != Math.Floor(d))
            errors.Add($"Field '{field}' must be an integer.");
    }

    private static void RequireNumberInRange(JsonObject doc, string field, double min, double max, List<string> errors)
    {
        var node = doc[field];
        if (IsAbsent(node)) return;
        if (Kind(node) != JsonValueKind.Number || !TryGetDouble(node!, out var d))
        {
            errors.Add($"Field '{field}' must be a number.");
            return;
        }
        if (d < min || d > max)
            errors.Add($"Field '{field}' must be between {min} and {max}.");
    }

    /// <summary>
    /// Extract a double from a numeric node, robust to whether the value is backed by a parsed
    /// JsonElement (request body) or a boxed CLR number (e.g. constructed in tests).
    /// </summary>
    private static bool TryGetDouble(JsonNode node, out double value)
    {
        var v = node.AsValue();
        if (v.TryGetValue<double>(out value)) return true;
        if (v.TryGetValue<long>(out var l)) { value = l; return true; }
        if (v.TryGetValue<int>(out var i)) { value = i; return true; }
        if (v.TryGetValue<decimal>(out var dec)) { value = (double)dec; return true; }
        return double.TryParse(node.ToJsonString(), System.Globalization.NumberStyles.Any,
            System.Globalization.CultureInfo.InvariantCulture, out value);
    }

    private static void RequireGamingStatus(JsonObject doc, List<string> errors)
    {
        var node = doc["status"];
        if (IsAbsent(node)) return;
        var status = AsString(node);
        if (status == null || !GamingStatuses.Contains(status))
            errors.Add("Field 'status' must be one of: completed, playing, backlog, dropped.");
    }

    private static void RequireNumberArray(JsonObject doc, string field, int length, List<string> errors)
    {
        var node = doc[field];
        if (IsAbsent(node)) return;
        if (node is not JsonArray arr || arr.Count != length || arr.Any(n => Kind(n) != JsonValueKind.Number))
            errors.Add($"Field '{field}' must be an array of {length} numbers.");
    }

    /// <summary>
    /// A localized value is either a plain string (when <paramref name="allowPlainString"/>) or an
    /// object whose values are all strings (e.g. {"en":"...","es":"...","pt":"..."}).
    /// </summary>
    private static void RequireLocalized(JsonObject doc, string field, List<string> errors, bool allowPlainString)
    {
        var node = doc[field];
        if (IsAbsent(node)) return;

        if (Kind(node) == JsonValueKind.String)
        {
            if (!allowPlainString)
                errors.Add($"Field '{field}' must be a localized object with en/es/pt string values.");
            return;
        }

        if (node is JsonObject obj)
        {
            foreach (var kvp in obj)
            {
                if (Kind(kvp.Value) is not (JsonValueKind.String or JsonValueKind.Null))
                {
                    errors.Add($"Field '{field}.{kvp.Key}' must be a string.");
                    break;
                }
            }
            return;
        }

        errors.Add(allowPlainString
            ? $"Field '{field}' must be a string or a localized object."
            : $"Field '{field}' must be a localized object with en/es/pt string values.");
    }
}

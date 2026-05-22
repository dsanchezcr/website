using System.Globalization;
using System.Text.Json.Nodes;
using CommunityToolkit.Mvvm.ComponentModel;

namespace CosmosManager.ViewModels;

public enum DynamicFieldKind { String, Number, Bool, Localized, ReadOnly }

/// <summary>
/// Generic per-key editor for any field in the source JSON that the typed form does not explicitly expose.
/// On save the value is written back into the underlying <see cref="JsonObject"/> so nothing is lost.
/// </summary>
public partial class DynamicFieldViewModel : ObservableObject
{
    public string Name { get; }
    public DynamicFieldKind FieldKind { get; }
    public string ReadOnlyDescription { get; }

    [ObservableProperty] private string? stringValue;
    [ObservableProperty] private bool? boolValue;
    [ObservableProperty] private string? localizedEn;
    [ObservableProperty] private string? localizedEs;
    [ObservableProperty] private string? localizedPt;

    public bool IsString => FieldKind == DynamicFieldKind.String;
    public bool IsNumber => FieldKind == DynamicFieldKind.Number;
    public bool IsBool => FieldKind == DynamicFieldKind.Bool;
    public bool IsLocalized => FieldKind == DynamicFieldKind.Localized;
    public bool IsReadOnly => FieldKind == DynamicFieldKind.ReadOnly;

    private DynamicFieldViewModel(string name, DynamicFieldKind kind, string readOnlyDescription = "")
    {
        Name = name;
        FieldKind = kind;
        ReadOnlyDescription = readOnlyDescription;
    }

    public static DynamicFieldViewModel FromNode(string key, JsonNode? node)
    {
        if (node is null)
            return new DynamicFieldViewModel(key, DynamicFieldKind.String) { StringValue = string.Empty };

        if (node is JsonValue v)
        {
            if (v.TryGetValue<bool>(out var b))
                return new DynamicFieldViewModel(key, DynamicFieldKind.Bool) { BoolValue = b };
            if (v.TryGetValue<string>(out var s))
                return new DynamicFieldViewModel(key, DynamicFieldKind.String) { StringValue = s };
            // Numbers (double / int / long / decimal). Store as string for the textbox; parse on write.
            return new DynamicFieldViewModel(key, DynamicFieldKind.Number) { StringValue = node.ToJsonString() };
        }

        if (node is JsonObject o && IsLocalizedShape(o))
        {
            return new DynamicFieldViewModel(key, DynamicFieldKind.Localized)
            {
                LocalizedEn = ReadString(o, "en"),
                LocalizedEs = ReadString(o, "es"),
                LocalizedPt = ReadString(o, "pt")
            };
        }

        if (node is JsonArray a)
            return new DynamicFieldViewModel(key, DynamicFieldKind.ReadOnly, $"(array — {a.Count} item{(a.Count == 1 ? "" : "s")}, edit via raw JSON)");

        if (node is JsonObject obj)
            return new DynamicFieldViewModel(key, DynamicFieldKind.ReadOnly, $"(object — {obj.Count} field{(obj.Count == 1 ? "" : "s")}, edit via raw JSON)");

        return new DynamicFieldViewModel(key, DynamicFieldKind.ReadOnly, "(complex value, edit via raw JSON)");
    }

    /// <summary>Writes the current value back into the JSON object under <see cref="Name"/>.</summary>
    public void WriteTo(JsonObject root)
    {
        switch (FieldKind)
        {
            case DynamicFieldKind.String:
                if (string.IsNullOrEmpty(StringValue)) root.Remove(Name);
                else root[Name] = StringValue;
                break;

            case DynamicFieldKind.Number:
                if (string.IsNullOrWhiteSpace(StringValue)) { root.Remove(Name); break; }
                if (long.TryParse(StringValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var l))
                    root[Name] = l;
                else if (double.TryParse(StringValue, NumberStyles.Float, CultureInfo.InvariantCulture, out var d))
                    root[Name] = d;
                else
                    root[Name] = StringValue; // fall back to string if user typed something odd
                break;

            case DynamicFieldKind.Bool:
                if (BoolValue.HasValue) root[Name] = BoolValue.Value;
                else root.Remove(Name);
                break;

            case DynamicFieldKind.Localized:
                var en = LocalizedEn ?? string.Empty;
                var es = LocalizedEs ?? string.Empty;
                var pt = LocalizedPt ?? string.Empty;
                if (string.IsNullOrEmpty(en) && string.IsNullOrEmpty(es) && string.IsNullOrEmpty(pt))
                {
                    root.Remove(Name);
                }
                else
                {
                    var obj = new JsonObject();
                    if (!string.IsNullOrEmpty(en)) obj["en"] = en;
                    if (!string.IsNullOrEmpty(es)) obj["es"] = es;
                    if (!string.IsNullOrEmpty(pt)) obj["pt"] = pt;
                    root[Name] = obj;
                }
                break;

            case DynamicFieldKind.ReadOnly:
                // Preserved as-is in the underlying _root.
                break;
        }
    }

    private static bool IsLocalizedShape(JsonObject o)
    {
        if (o.Count == 0 || o.Count > 3) return false;
        foreach (var kv in o)
        {
            if (kv.Key is not ("en" or "es" or "pt")) return false;
            if (kv.Value is JsonValue val && val.TryGetValue<string>(out _)) continue;
            if (kv.Value is null) continue;
            return false;
        }
        return true;
    }

    private static string ReadString(JsonObject o, string key) =>
        o.TryGetPropertyValue(key, out var v) && v is JsonValue jv && jv.TryGetValue<string>(out var s) ? s : string.Empty;
}

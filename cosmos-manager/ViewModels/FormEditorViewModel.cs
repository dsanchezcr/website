using System.Collections.ObjectModel;
using System.Globalization;
using System.Text.Json;
using System.Text.Json.Nodes;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CosmosManager.Services;

namespace CosmosManager.ViewModels;

public enum FormEntityKind { Movie, Series, Gaming, MonthlyUpdate, Park }

/// <summary>
/// Lightweight summary of a nested park item shown in the form (read-only list).
/// Full per-item editing is available via the "Edit raw JSON…" fallback.
/// </summary>
public class ParkItemSummary
{
    public string Id { get; init; } = string.Empty;
    public string Category { get; init; } = string.Empty;
    public string Name { get; init; } = string.Empty;
    public int? Rating { get; init; }
    public bool? MustDo { get; init; }
    public string Display =>
        $"[{(string.IsNullOrEmpty(Category) ? "?" : Category)}] {Name}"
        + (Rating.HasValue ? $"  ★ {Rating}" : string.Empty)
        + (MustDo == true ? "  ⭐ must-do" : string.Empty);
}

/// <summary>
/// Strongly-typed form view model for every content type in the database.
/// Unknown fields in the source JSON are preserved on save (round-trip through <see cref="JsonObject"/>).
///
/// Preview URLs are derived from inputs:
///   - Image: <see cref="ImageUrl"/> or <see cref="ParkImageUrl"/>
///   - YouTube thumbnail: from <see cref="YoutubeVideoId"/>
///   - IMDb link: from <see cref="TitleId"/>
///   - Map link: from <see cref="MapCenter"/>
/// </summary>
public partial class FormEditorViewModel : ObservableObject
{
    private static readonly JsonSerializerOptions JsonOpts = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    public FormEntityKind Kind { get; }
    public string Container { get; }
    public bool IsNew { get; }
    public string OriginalPartitionKey { get; }
    private readonly CosmosManagerService? _service;

    // Source JSON object — mutated on save so unknown fields are preserved.
    private JsonObject _root;

    /// <summary>
    /// Generic editors for every JSON field the typed form does not already expose. Lets the user
    /// edit any field — including any new ones added to documents — without dropping to raw JSON.
    /// </summary>
    public ObservableCollection<DynamicFieldViewModel> DynamicFields { get; } = [];

    /// <summary>Raw JSON of a sample document fetched from the same container (for schema inspection).</summary>
    [ObservableProperty] private string? sampleDocumentJson;
    [ObservableProperty] private bool isFetchingSample;

    [ObservableProperty] private string id = string.Empty;

    // Movies / Series
    [ObservableProperty] private string titleId = string.Empty;
    [ObservableProperty] private string category = string.Empty;
    [ObservableProperty] private double? myRating;
    [ObservableProperty] private int? order;
    [ObservableProperty] private string reviewEn = string.Empty;
    [ObservableProperty] private string reviewEs = string.Empty;
    [ObservableProperty] private string reviewPt = string.Empty;

    // Gaming
    [ObservableProperty] private string platform = string.Empty;
    [ObservableProperty] private string section = string.Empty;
    [ObservableProperty] private string type = "card";
    [ObservableProperty] private string titleEn = string.Empty;
    [ObservableProperty] private string titleEs = string.Empty;
    [ObservableProperty] private string titlePt = string.Empty;
    [ObservableProperty] private string status = string.Empty;
    [ObservableProperty] private string imageUrl = string.Empty;
    [ObservableProperty] private string url = string.Empty;
    [ObservableProperty] private string descriptionEn = string.Empty;
    [ObservableProperty] private string descriptionEs = string.Empty;
    [ObservableProperty] private string descriptionPt = string.Empty;
    [ObservableProperty] private string recommendationEn = string.Empty;
    [ObservableProperty] private string recommendationEs = string.Empty;
    [ObservableProperty] private string recommendationPt = string.Empty;
    [ObservableProperty] private bool? coOp;
    [ObservableProperty] private bool? online;
    [ObservableProperty] private int gamingChildCount;

    // Monthly Update
    [ObservableProperty] private string month = string.Empty;
    [ObservableProperty] private string releaseDate = string.Empty;
    [ObservableProperty] private string platforms = string.Empty;
    [ObservableProperty] private string youtubeVideoId = string.Empty;
    [ObservableProperty] private string youtubeTitleEn = string.Empty;
    [ObservableProperty] private string youtubeTitleEs = string.Empty;
    [ObservableProperty] private string youtubeTitlePt = string.Empty;

    // Parks (top-level)
    [ObservableProperty] private string provider = string.Empty;
    [ObservableProperty] private string parkId = string.Empty;
    [ObservableProperty] private string nameEn = string.Empty;
    [ObservableProperty] private string nameEs = string.Empty;
    [ObservableProperty] private string namePt = string.Empty;
    [ObservableProperty] private string parkDescriptionEn = string.Empty;
    [ObservableProperty] private string parkDescriptionEs = string.Empty;
    [ObservableProperty] private string parkDescriptionPt = string.Empty;
    [ObservableProperty] private string mapCenter = string.Empty;     // "lat,lng"
    [ObservableProperty] private double? mapZoom;
    [ObservableProperty] private string parkImageUrl = string.Empty;
    public System.Collections.ObjectModel.ObservableCollection<ParkItemSummary> ParkItems { get; } = [];

    // ── Computed previews ──
    /// <summary>
    /// Returns the first non-empty image URL among the typed fields and the most common image-field names
    /// found anywhere in the source JSON. Detected fields (in order): the typed field for the current Kind,
    /// then <c>imageUrl</c>, <c>heroImageUrl</c>, <c>posterUrl</c>, <c>coverImageUrl</c>, <c>thumbnailUrl</c>.
    /// </summary>
    public string? ImagePreviewUrl
    {
        get
        {
            string? typed = Kind == FormEntityKind.Park ? ParkImageUrl : ImageUrl;
            if (!string.IsNullOrWhiteSpace(typed)) return typed.Trim();
            foreach (var key in new[] { "imageUrl", "heroImageUrl", "posterUrl", "coverImageUrl", "thumbnailUrl" })
            {
                var v = GetString(key);
                if (!string.IsNullOrWhiteSpace(v)) return v.Trim();
            }
            return null;
        }
    }

    public string? YoutubeThumbnailUrl =>
        string.IsNullOrWhiteSpace(YoutubeVideoId)
            ? null
            : $"https://img.youtube.com/vi/{YoutubeVideoId.Trim()}/hqdefault.jpg";

    public string? YoutubeWatchUrl =>
        string.IsNullOrWhiteSpace(YoutubeVideoId)
            ? null
            : $"https://www.youtube.com/watch?v={YoutubeVideoId.Trim()}";

    public string? ImdbUrl =>
        string.IsNullOrWhiteSpace(TitleId) ? null : $"https://www.imdb.com/title/{TitleId.Trim()}/";

    public string? MapPreviewUrl
    {
        get
        {
            if (string.IsNullOrWhiteSpace(MapCenter)) return null;
            var parts = MapCenter.Split(',', 2);
            if (parts.Length != 2) return null;
            if (!double.TryParse(parts[0], NumberStyles.Float, CultureInfo.InvariantCulture, out var lat)) return null;
            if (!double.TryParse(parts[1], NumberStyles.Float, CultureInfo.InvariantCulture, out var lng)) return null;
            var z = (int)(MapZoom ?? 14);
            return $"https://www.openstreetmap.org/?mlat={lat.ToString(CultureInfo.InvariantCulture)}&mlon={lng.ToString(CultureInfo.InvariantCulture)}&zoom={z}";
        }
    }

    partial void OnImageUrlChanged(string value) => OnPropertyChanged(nameof(ImagePreviewUrl));
    partial void OnParkImageUrlChanged(string value) => OnPropertyChanged(nameof(ImagePreviewUrl));
    partial void OnYoutubeVideoIdChanged(string value)
    {
        OnPropertyChanged(nameof(YoutubeThumbnailUrl));
        OnPropertyChanged(nameof(YoutubeWatchUrl));
    }
    partial void OnTitleIdChanged(string value) => OnPropertyChanged(nameof(ImdbUrl));
    partial void OnMapCenterChanged(string value) => OnPropertyChanged(nameof(MapPreviewUrl));
    partial void OnMapZoomChanged(double? value) => OnPropertyChanged(nameof(MapPreviewUrl));

    public bool Saved { get; private set; }

    public FormEditorViewModel(FormEntityKind kind, string container, string partitionKey, string sourceJson, bool isNew, CosmosManagerService? service = null)
    {
        Kind = kind;
        Container = container;
        OriginalPartitionKey = partitionKey;
        IsNew = isNew;
        _service = service;
        _root = JsonNode.Parse(sourceJson)?.AsObject() ?? new JsonObject();
        LoadFromJson();
        RebuildDynamicFields();
    }

    /// <summary>Keys already rendered by the typed form for the current Kind — excluded from the generic editor.</summary>
    private static readonly HashSet<string> CommonHandledKeys = new(StringComparer.Ordinal)
    {
        "id", "_rid", "_self", "_etag", "_attachments", "_ts"
    };

    private HashSet<string> HandledKeysForCurrentKind()
    {
        var keys = new HashSet<string>(CommonHandledKeys, StringComparer.Ordinal);
        switch (Kind)
        {
            case FormEntityKind.Movie:
            case FormEntityKind.Series:
                keys.UnionWith(new[] { "titleId", "category", "myRating", "order", "review" });
                break;
            case FormEntityKind.Gaming:
                keys.UnionWith(new[] { "platform", "section", "type", "title", "status", "imageUrl", "url", "description", "recommendation", "coOp", "online", "order", "games" });
                break;
            case FormEntityKind.MonthlyUpdate:
                keys.UnionWith(new[] { "month", "title", "releaseDate", "description", "platforms", "youtubeVideoId", "youtubeTitle", "imageUrl", "category", "order" });
                break;
            case FormEntityKind.Park:
                keys.UnionWith(new[] { "provider", "parkId", "name", "description", "mapCenter", "mapZoom", "imageUrl", "items" });
                break;
        }
        return keys;
    }

    private void RebuildDynamicFields()
    {
        DynamicFields.Clear();
        var handled = HandledKeysForCurrentKind();
        foreach (var kv in _root)
        {
            if (handled.Contains(kv.Key)) continue;
            DynamicFields.Add(DynamicFieldViewModel.FromNode(kv.Key, kv.Value));
        }
    }

    [RelayCommand]
    private async Task FetchSampleAsync()
    {
        if (_service == null) { SampleDocumentJson = "(no live connection)"; return; }
        IsFetchingSample = true;
        try
        {
            var pkField = Container switch
            {
                CosmosManagerService.MoviesContainer or CosmosManagerService.SeriesContainer => "category",
                CosmosManagerService.GamingContainer => "platform",
                CosmosManagerService.ParksContainer => "provider",
                CosmosManagerService.MonthlyUpdatesContainer => "month",
                _ => null
            };
            var pkValue = GetEffectivePartitionKey();
            var sample = await _service.GetSampleDocumentAsync(Container, pkField, string.IsNullOrEmpty(pkValue) ? null : pkValue);
            SampleDocumentJson = sample ?? "(no documents in this partition)";
        }
        catch (Exception ex)
        {
            SampleDocumentJson = $"(error fetching sample: {ex.Message})";
        }
        finally { IsFetchingSample = false; }
    }

    private void LoadFromJson()
    {
        Id = GetString("id") ?? string.Empty;

        switch (Kind)
        {
            case FormEntityKind.Movie:
            case FormEntityKind.Series:
                TitleId = GetString("titleId") ?? string.Empty;
                Category = GetString("category") ?? string.Empty;
                MyRating = GetDouble("myRating");
                Order = GetInt("order");
                (ReviewEn, ReviewEs, ReviewPt) = GetLocalized("review");
                break;

            case FormEntityKind.Gaming:
                Platform = GetString("platform") ?? string.Empty;
                Section = GetString("section") ?? string.Empty;
                Type = GetString("type") ?? "card";
                (TitleEn, TitleEs, TitlePt) = GetStringOrLocalized("title");
                Status = GetString("status") ?? string.Empty;
                ImageUrl = GetString("imageUrl") ?? string.Empty;
                Url = GetString("url") ?? string.Empty;
                (DescriptionEn, DescriptionEs, DescriptionPt) = GetStringOrLocalized("description");
                (RecommendationEn, RecommendationEs, RecommendationPt) = GetStringOrLocalized("recommendation");
                CoOp = GetBool("coOp");
                Online = GetBool("online");
                Order = GetInt("order");
                GamingChildCount = (_root["games"] as JsonArray)?.Count ?? 0;
                break;

            case FormEntityKind.MonthlyUpdate:
                Month = GetString("month") ?? string.Empty;
                (TitleEn, TitleEs, TitlePt) = GetStringOrLocalized("title");
                ReleaseDate = GetString("releaseDate") ?? string.Empty;
                (DescriptionEn, DescriptionEs, DescriptionPt) = GetStringOrLocalized("description");
                Platforms = GetString("platforms") ?? string.Empty;
                YoutubeVideoId = GetString("youtubeVideoId") ?? string.Empty;
                (YoutubeTitleEn, YoutubeTitleEs, YoutubeTitlePt) = GetStringOrLocalized("youtubeTitle");
                ImageUrl = GetString("imageUrl") ?? string.Empty;
                Category = GetString("category") ?? string.Empty;
                Order = GetInt("order");
                break;

            case FormEntityKind.Park:
                Provider = GetString("provider") ?? string.Empty;
                ParkId = GetString("parkId") ?? string.Empty;
                (NameEn, NameEs, NamePt) = GetLocalized("name");
                (ParkDescriptionEn, ParkDescriptionEs, ParkDescriptionPt) = GetLocalized("description");
                MapCenter = FormatDoubleArray(_root["mapCenter"] as JsonArray);
                MapZoom = GetDouble("mapZoom");
                ParkImageUrl = GetString("imageUrl") ?? GetString("heroImageUrl") ?? string.Empty;
                LoadParkItems();
                break;
        }
    }

    private void LoadParkItems()
    {
        ParkItems.Clear();
        if (_root["items"] is not JsonArray arr) return;
        foreach (var node in arr)
        {
            if (node is not JsonObject o) continue;
            string name;
            if (o["name"] is JsonObject lo && lo["en"] is JsonValue env && env.TryGetValue<string>(out var ens))
                name = ens;
            else if (o["name"] is JsonValue jv && jv.TryGetValue<string>(out var s))
                name = s;
            else
                name = (o["id"] as JsonValue)?.GetValue<string>() ?? "(unnamed)";

            int? rating = o["rating"] is JsonValue rv && rv.TryGetValue<int>(out var ri) ? ri : null;
            bool? mustDo = o["mustDo"] is JsonValue mv && mv.TryGetValue<bool>(out var mb) ? mb : null;
            ParkItems.Add(new ParkItemSummary
            {
                Id = (o["id"] as JsonValue)?.GetValue<string>() ?? string.Empty,
                Category = (o["category"] as JsonValue)?.GetValue<string>() ?? string.Empty,
                Name = name,
                Rating = rating,
                MustDo = mustDo
            });
        }
    }

    /// <summary>Build the JSON payload to save. Preserves unknown fields from the source.</summary>
    public string BuildJson()
    {
        SetString("id", Id);

        switch (Kind)
        {
            case FormEntityKind.Movie:
            case FormEntityKind.Series:
                SetString("titleId", TitleId);
                SetString("category", Category);
                SetDouble("myRating", MyRating);
                SetInt("order", Order);
                SetLocalized("review", ReviewEn, ReviewEs, ReviewPt);
                break;

            case FormEntityKind.Gaming:
                SetString("platform", Platform);
                SetString("section", Section);
                SetString("type", Type);
                SetStringOrLocalized("title", TitleEn, TitleEs, TitlePt);
                SetString("status", Status);
                SetString("imageUrl", ImageUrl);
                SetString("url", Url);
                SetStringOrLocalized("description", DescriptionEn, DescriptionEs, DescriptionPt);
                SetStringOrLocalized("recommendation", RecommendationEn, RecommendationEs, RecommendationPt);
                SetBool("coOp", CoOp);
                SetBool("online", Online);
                SetInt("order", Order);
                break;

            case FormEntityKind.MonthlyUpdate:
                SetString("month", Month);
                SetStringOrLocalized("title", TitleEn, TitleEs, TitlePt);
                SetString("releaseDate", ReleaseDate);
                SetStringOrLocalized("description", DescriptionEn, DescriptionEs, DescriptionPt);
                SetString("platforms", Platforms);
                SetString("youtubeVideoId", YoutubeVideoId);
                SetStringOrLocalized("youtubeTitle", YoutubeTitleEn, YoutubeTitleEs, YoutubeTitlePt);
                SetString("imageUrl", ImageUrl);
                SetString("category", Category);
                SetInt("order", Order);
                break;

            case FormEntityKind.Park:
                SetString("provider", Provider);
                SetString("parkId", ParkId);
                SetLocalized("name", NameEn, NameEs, NamePt);
                SetLocalized("description", ParkDescriptionEn, ParkDescriptionEs, ParkDescriptionPt);
                SetDoubleArray("mapCenter", MapCenter);
                SetDouble("mapZoom", MapZoom);
                if (!string.IsNullOrWhiteSpace(ParkImageUrl)) _root["imageUrl"] = ParkImageUrl;
                else _root.Remove("imageUrl");
                // items[] is preserved as-is via _root.
                break;
        }

        // Write every dynamic field (anything the typed form doesn't expose) back into the root object.
        foreach (var f in DynamicFields)
            f.WriteTo(_root);

        return _root.ToJsonString(JsonOpts);
    }

    public string GetEffectivePartitionKey() => Kind switch
    {
        FormEntityKind.Movie or FormEntityKind.Series => Category,
        FormEntityKind.Gaming => Platform,
        FormEntityKind.MonthlyUpdate => Month,
        FormEntityKind.Park => Provider,
        _ => OriginalPartitionKey
    };

    [RelayCommand]
    private void Save() => Saved = true;

    // ── JSON helpers ──

    private string? GetString(string name) =>
        _root.TryGetPropertyValue(name, out var v) && v is JsonValue jv && jv.TryGetValue<string>(out var s) ? s : null;

    private double? GetDouble(string name) =>
        _root.TryGetPropertyValue(name, out var v) && v is JsonValue jv && jv.TryGetValue<double>(out var d) ? d : (double?)null;

    private int? GetInt(string name) =>
        _root.TryGetPropertyValue(name, out var v) && v is JsonValue jv && jv.TryGetValue<int>(out var i) ? i : (int?)null;

    private bool? GetBool(string name) =>
        _root.TryGetPropertyValue(name, out var v) && v is JsonValue jv && jv.TryGetValue<bool>(out var b) ? b : (bool?)null;

    private (string En, string Es, string Pt) GetLocalized(string name)
    {
        if (_root.TryGetPropertyValue(name, out var v) && v is JsonObject o)
        {
            string Read(string key) => o.TryGetPropertyValue(key, out var x) && x is JsonValue jv && jv.TryGetValue<string>(out var s) ? s : string.Empty;
            return (Read("en"), Read("es"), Read("pt"));
        }
        return (string.Empty, string.Empty, string.Empty);
    }

    /// <summary>Reads a field that may be either a plain string or a localized object.</summary>
    private (string En, string Es, string Pt) GetStringOrLocalized(string name)
    {
        if (!_root.TryGetPropertyValue(name, out var v) || v == null) return (string.Empty, string.Empty, string.Empty);
        if (v is JsonValue jv && jv.TryGetValue<string>(out var s)) return (s, string.Empty, string.Empty);
        if (v is JsonObject o)
        {
            string Read(string key) => o.TryGetPropertyValue(key, out var x) && x is JsonValue xv && xv.TryGetValue<string>(out var ss) ? ss : string.Empty;
            return (Read("en"), Read("es"), Read("pt"));
        }
        return (string.Empty, string.Empty, string.Empty);
    }

    private void SetString(string name, string? value)
    {
        if (string.IsNullOrEmpty(value)) _root.Remove(name);
        else _root[name] = value;
    }

    private void SetDouble(string name, double? value)
    {
        if (value.HasValue) _root[name] = value.Value;
        else _root.Remove(name);
    }

    private void SetInt(string name, int? value)
    {
        if (value.HasValue) _root[name] = value.Value;
        else _root.Remove(name);
    }

    private void SetBool(string name, bool? value)
    {
        if (value.HasValue) _root[name] = value.Value;
        else _root.Remove(name);
    }

    private void SetLocalized(string name, string en, string es, string pt)
    {
        if (string.IsNullOrEmpty(en) && string.IsNullOrEmpty(es) && string.IsNullOrEmpty(pt))
        {
            _root.Remove(name);
            return;
        }
        var o = new JsonObject();
        if (!string.IsNullOrEmpty(en)) o["en"] = en;
        if (!string.IsNullOrEmpty(es)) o["es"] = es;
        if (!string.IsNullOrEmpty(pt)) o["pt"] = pt;
        _root[name] = o;
    }

    /// <summary>
    /// Writes a field that may have been originally a plain string. Emits a plain string
    /// when only English is filled and no localized object was present originally; otherwise
    /// emits a localized object.
    /// </summary>
    private void SetStringOrLocalized(string name, string en, string es, string pt)
    {
        var hadObject = _root.TryGetPropertyValue(name, out var existing) && existing is JsonObject;
        if (string.IsNullOrEmpty(en) && string.IsNullOrEmpty(es) && string.IsNullOrEmpty(pt))
        {
            _root.Remove(name);
            return;
        }
        if (!hadObject && string.IsNullOrEmpty(es) && string.IsNullOrEmpty(pt))
        {
            _root[name] = en;
            return;
        }
        SetLocalized(name, en, es, pt);
    }

    private static string FormatDoubleArray(JsonArray? arr)
    {
        if (arr == null || arr.Count == 0) return string.Empty;
        return string.Join(",", arr.Select(n => n is JsonValue v && v.TryGetValue<double>(out var d)
            ? d.ToString(CultureInfo.InvariantCulture) : ""));
    }

    private void SetDoubleArray(string name, string csv)
    {
        if (string.IsNullOrWhiteSpace(csv)) { _root.Remove(name); return; }
        var parts = csv.Split(',');
        var arr = new JsonArray();
        foreach (var p in parts)
        {
            if (double.TryParse(p.Trim(), NumberStyles.Float, CultureInfo.InvariantCulture, out var d))
                arr.Add(d);
        }
        if (arr.Count == 0) _root.Remove(name);
        else _root[name] = arr;
    }
}

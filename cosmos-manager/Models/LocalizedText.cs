using System.Text.Json.Serialization;

namespace CosmosManager.Models;

public class LocalizedText
{
    [JsonPropertyName("en")]
    public string? En { get; set; }

    [JsonPropertyName("es")]
    public string? Es { get; set; }

    [JsonPropertyName("pt")]
    public string? Pt { get; set; }

    public override string ToString() => En ?? Es ?? Pt ?? string.Empty;
}

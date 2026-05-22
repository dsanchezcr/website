using System.Windows;
using System.Windows.Controls;

namespace CosmosManager.ViewModels;

/// <summary>
/// Picks the right DataTemplate for a <see cref="DynamicFieldViewModel"/> based on its
/// <see cref="DynamicFieldKind"/>. Templates are supplied from XAML.
/// </summary>
public class DynamicFieldTemplateSelector : DataTemplateSelector
{
    public DataTemplate? StringTemplate { get; set; }
    public DataTemplate? NumberTemplate { get; set; }
    public DataTemplate? BoolTemplate { get; set; }
    public DataTemplate? LocalizedTemplate { get; set; }
    public DataTemplate? ReadOnlyTemplate { get; set; }

    public override DataTemplate? SelectTemplate(object item, DependencyObject container) =>
        item is not DynamicFieldViewModel f ? base.SelectTemplate(item, container) : f.FieldKind switch
        {
            DynamicFieldKind.String => StringTemplate,
            DynamicFieldKind.Number => NumberTemplate,
            DynamicFieldKind.Bool => BoolTemplate,
            DynamicFieldKind.Localized => LocalizedTemplate,
            DynamicFieldKind.ReadOnly => ReadOnlyTemplate,
            _ => base.SelectTemplate(item, container)
        };
}

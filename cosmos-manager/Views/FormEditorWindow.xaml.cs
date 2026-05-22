using System.Diagnostics;
using System.Windows;
using CosmosManager.ViewModels;

namespace CosmosManager.Views;

public partial class FormEditorWindow : Window
{
    public FormEditorViewModel ViewModel { get; }

    /// <summary>True if user clicked Save (form data is valid and ready to persist).</summary>
    public bool Saved { get; private set; }

    /// <summary>True if user clicked "Edit raw JSON" — caller should open the JSON editor instead.</summary>
    public bool RequestRawJsonEdit { get; private set; }

    public FormEditorWindow(FormEditorViewModel vm)
    {
        ViewModel = vm;
        DataContext = vm;
        InitializeComponent();
    }

    private void Save_Click(object sender, RoutedEventArgs e)
    {
        Saved = true;
        DialogResult = true;
        Close();
    }

    private void EditJson_Click(object sender, RoutedEventArgs e)
    {
        RequestRawJsonEdit = true;
        DialogResult = false;
        Close();
    }

    private void OpenYoutube_Click(object sender, RoutedEventArgs e) => OpenBrowser(ViewModel.YoutubeWatchUrl);
    private void OpenImdb_Click(object sender, RoutedEventArgs e) => OpenBrowser(ViewModel.ImdbUrl);
    private void OpenUrl_Click(object sender, RoutedEventArgs e) => OpenBrowser(ViewModel.Url);
    private void OpenMap_Click(object sender, RoutedEventArgs e) => OpenBrowser(ViewModel.MapPreviewUrl);

    private static void OpenBrowser(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return;
        try
        {
            Process.Start(new ProcessStartInfo(url) { UseShellExecute = true });
        }
        catch { /* swallow — best effort */ }
    }
}

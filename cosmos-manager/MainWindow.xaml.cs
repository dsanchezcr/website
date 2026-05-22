using System.Windows;
using CosmosManager.ViewModels;

namespace CosmosManager;

public partial class MainWindow : Window
{
    private readonly MainViewModel _vm;

    public MainWindow()
    {
        InitializeComponent();
        _vm = new MainViewModel();
        DataContext = _vm;
        Loaded += MainWindow_Loaded;
    }

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        await _vm.InitializeAsync();
    }

    private void KeyBox_PasswordChanged(object sender, RoutedEventArgs e)
    {
        _vm.Key = KeyBox.Password;
    }
}
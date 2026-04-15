using System.Windows;
using CosmosManager.ViewModels;

namespace CosmosManager;

public partial class MainWindow : Window
{
    public MainWindow()
    {
        InitializeComponent();
        DataContext = new MainViewModel();
    }

    private void KeyBox_PasswordChanged(object sender, RoutedEventArgs e)
    {
        if (DataContext is MainViewModel vm)
        {
            vm.Key = KeyBox.Password;
        }
    }
}
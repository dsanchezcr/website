using System.Collections.ObjectModel;
using System.Text.Json;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CosmosManager.Models;
using CosmosManager.Services;

namespace CosmosManager.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private CosmosManagerService? _service;

    [ObservableProperty] private string endpoint = string.Empty;
    [ObservableProperty] private string key = string.Empty;
    [ObservableProperty] private string databaseName = "website-content";
    [ObservableProperty] private bool isConnected;
    [ObservableProperty] private string statusMessage = "Not connected";
    [ObservableProperty] private bool isBusy;

    // ── Movies ──
    [ObservableProperty] private ObservableCollection<MovieDocument> movies = [];
    [ObservableProperty] private MovieDocument? selectedMovie;
    [ObservableProperty] private ObservableCollection<string> movieCategories = [];
    [ObservableProperty] private string? selectedMovieCategory;

    // ── Series ──
    [ObservableProperty] private ObservableCollection<SeriesDocument> series = [];
    [ObservableProperty] private SeriesDocument? selectedSeries;
    [ObservableProperty] private ObservableCollection<string> seriesCategories = [];
    [ObservableProperty] private string? selectedSeriesCategory;

    // ── Gaming ──
    [ObservableProperty] private ObservableCollection<GamingDocument> gamingItems = [];
    [ObservableProperty] private GamingDocument? selectedGaming;
    [ObservableProperty] private ObservableCollection<string> gamingPlatforms = [];
    [ObservableProperty] private string? selectedGamingPlatform;

    // ── Parks ──
    [ObservableProperty] private ObservableCollection<ParkDocument> parks = [];
    [ObservableProperty] private ParkDocument? selectedPark;
    [ObservableProperty] private ObservableCollection<string> parkProviders = [];
    [ObservableProperty] private string? selectedParkProvider;

    // ── Monthly Updates ──
    [ObservableProperty] private ObservableCollection<MonthlyUpdateDocument> monthlyUpdates = [];
    [ObservableProperty] private MonthlyUpdateDocument? selectedMonthlyUpdate;
    [ObservableProperty] private ObservableCollection<string> monthlyUpdateMonths = [];
    [ObservableProperty] private string? selectedMonth;

    // ── JSON Editor ──
    [ObservableProperty] private string jsonEditorContent = string.Empty;
    [ObservableProperty] private bool isJsonEditorOpen;
    [ObservableProperty] private string jsonEditorTitle = string.Empty;
    private string? _jsonEditorContainer;
    private string? _jsonEditorPartitionKey;
    private bool _jsonEditorIsNew;

    [RelayCommand]
    private async Task ConnectAsync()
    {
        if (string.IsNullOrWhiteSpace(Endpoint) || string.IsNullOrWhiteSpace(Key))
        {
            StatusMessage = "Please enter endpoint and key.";
            return;
        }

        IsBusy = true;
        StatusMessage = "Connecting...";
        try
        {
            _service?.Dispose();
            _service = new CosmosManagerService(Endpoint, Key, DatabaseName);
            await _service.TestConnectionAsync();
            IsConnected = true;
            StatusMessage = $"Connected to {DatabaseName}";
            await LoadFiltersAsync();
        }
        catch (Exception ex)
        {
            IsConnected = false;
            StatusMessage = $"Connection failed: {ex.Message}";
        }
        finally
        {
            IsBusy = false;
        }
    }

    [RelayCommand]
    private void Disconnect()
    {
        _service?.Dispose();
        _service = null;
        IsConnected = false;
        StatusMessage = "Disconnected";
        ClearAll();
    }

    private void ClearAll()
    {
        Movies.Clear(); Series.Clear(); GamingItems.Clear(); Parks.Clear(); MonthlyUpdates.Clear();
        MovieCategories.Clear(); SeriesCategories.Clear(); GamingPlatforms.Clear();
        ParkProviders.Clear(); MonthlyUpdateMonths.Clear();
    }

    private async Task LoadFiltersAsync()
    {
        if (_service == null) return;
        try
        {
            var movieCats = await _service.GetDistinctValuesAsync(CosmosManagerService.MoviesContainer, "category");
            MovieCategories = new ObservableCollection<string>(movieCats);

            var seriesCats = await _service.GetDistinctValuesAsync(CosmosManagerService.SeriesContainer, "category");
            SeriesCategories = new ObservableCollection<string>(seriesCats);

            var platforms = await _service.GetDistinctValuesAsync(CosmosManagerService.GamingContainer, "platform");
            GamingPlatforms = new ObservableCollection<string>(platforms);

            var providers = await _service.GetDistinctValuesAsync(CosmosManagerService.ParksContainer, "provider");
            ParkProviders = new ObservableCollection<string>(providers);

            var months = await _service.GetDistinctValuesAsync(CosmosManagerService.MonthlyUpdatesContainer, "month");
            MonthlyUpdateMonths = new ObservableCollection<string>(months.OrderByDescending(m => m));
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error loading filters: {ex.Message}";
        }
    }

    // ── Movies CRUD ──

    [RelayCommand]
    private async Task LoadMoviesAsync()
    {
        if (_service == null) return;
        IsBusy = true;
        try
        {
            var items = await _service.GetAllAsync<MovieDocument>(
                CosmosManagerService.MoviesContainer, SelectedMovieCategory, "category");
            Movies = new ObservableCollection<MovieDocument>(items);
            StatusMessage = $"Loaded {items.Count} movies";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private void NewMovie()
    {
        var json = JsonSerializer.Serialize(new MovieDocument
        {
            Id = Guid.NewGuid().ToString(),
            Category = SelectedMovieCategory ?? "watched"
        }, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        OpenJsonEditor("New Movie", CosmosManagerService.MoviesContainer, SelectedMovieCategory ?? "watched", json, isNew: true);
    }

    [RelayCommand]
    private async Task EditMovieAsync()
    {
        if (_service == null || SelectedMovie == null) return;
        IsBusy = true;
        try
        {
            var json = await _service.GetItemJsonAsync(CosmosManagerService.MoviesContainer, SelectedMovie.Id, SelectedMovie.Category);
            OpenJsonEditor($"Edit Movie: {SelectedMovie.TitleId}", CosmosManagerService.MoviesContainer, SelectedMovie.Category, json, isNew: false);
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private async Task DeleteMovieAsync()
    {
        if (_service == null || SelectedMovie == null) return;
        if (MessageBox.Show($"Delete movie '{SelectedMovie.TitleId}'?", "Confirm Delete", MessageBoxButton.YesNo) != MessageBoxResult.Yes) return;
        IsBusy = true;
        try
        {
            await _service.DeleteAsync(CosmosManagerService.MoviesContainer, SelectedMovie.Id, SelectedMovie.Category);
            Movies.Remove(SelectedMovie);
            StatusMessage = "Movie deleted";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    // ── Series CRUD ──

    [RelayCommand]
    private async Task LoadSeriesAsync()
    {
        if (_service == null) return;
        IsBusy = true;
        try
        {
            var items = await _service.GetAllAsync<SeriesDocument>(
                CosmosManagerService.SeriesContainer, SelectedSeriesCategory, "category");
            Series = new ObservableCollection<SeriesDocument>(items);
            StatusMessage = $"Loaded {items.Count} series";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private void NewSeries()
    {
        var json = JsonSerializer.Serialize(new SeriesDocument
        {
            Id = Guid.NewGuid().ToString(),
            Category = SelectedSeriesCategory ?? "watched"
        }, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        OpenJsonEditor("New Series", CosmosManagerService.SeriesContainer, SelectedSeriesCategory ?? "watched", json, isNew: true);
    }

    [RelayCommand]
    private async Task EditSeriesAsync()
    {
        if (_service == null || SelectedSeries == null) return;
        IsBusy = true;
        try
        {
            var json = await _service.GetItemJsonAsync(CosmosManagerService.SeriesContainer, SelectedSeries.Id, SelectedSeries.Category);
            OpenJsonEditor($"Edit Series: {SelectedSeries.TitleId}", CosmosManagerService.SeriesContainer, SelectedSeries.Category, json, isNew: false);
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private async Task DeleteSeriesAsync()
    {
        if (_service == null || SelectedSeries == null) return;
        if (MessageBox.Show($"Delete series '{SelectedSeries.TitleId}'?", "Confirm Delete", MessageBoxButton.YesNo) != MessageBoxResult.Yes) return;
        IsBusy = true;
        try
        {
            await _service.DeleteAsync(CosmosManagerService.SeriesContainer, SelectedSeries.Id, SelectedSeries.Category);
            Series.Remove(SelectedSeries);
            StatusMessage = "Series deleted";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    // ── Gaming CRUD ──

    [RelayCommand]
    private async Task LoadGamingAsync()
    {
        if (_service == null || string.IsNullOrEmpty(SelectedGamingPlatform)) return;
        IsBusy = true;
        try
        {
            var items = await _service.GetAllAsync<GamingDocument>(
                CosmosManagerService.GamingContainer, SelectedGamingPlatform, "platform");
            GamingItems = new ObservableCollection<GamingDocument>(items.OrderBy(g => g.Order));
            StatusMessage = $"Loaded {items.Count} gaming items for {SelectedGamingPlatform}";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private void NewGaming()
    {
        var json = JsonSerializer.Serialize(new GamingDocument
        {
            Id = Guid.NewGuid().ToString(),
            Platform = SelectedGamingPlatform ?? "xbox"
        }, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        OpenJsonEditor("New Gaming Entry", CosmosManagerService.GamingContainer, SelectedGamingPlatform ?? "xbox", json, isNew: true);
    }

    [RelayCommand]
    private async Task EditGamingAsync()
    {
        if (_service == null || SelectedGaming == null) return;
        IsBusy = true;
        try
        {
            var json = await _service.GetItemJsonAsync(CosmosManagerService.GamingContainer, SelectedGaming.Id, SelectedGaming.Platform);
            OpenJsonEditor($"Edit Gaming: {SelectedGaming.Title}", CosmosManagerService.GamingContainer, SelectedGaming.Platform, json, isNew: false);
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private async Task DeleteGamingAsync()
    {
        if (_service == null || SelectedGaming == null) return;
        if (MessageBox.Show($"Delete gaming entry '{SelectedGaming.Title}'?", "Confirm Delete", MessageBoxButton.YesNo) != MessageBoxResult.Yes) return;
        IsBusy = true;
        try
        {
            await _service.DeleteAsync(CosmosManagerService.GamingContainer, SelectedGaming.Id, SelectedGaming.Platform);
            GamingItems.Remove(SelectedGaming);
            StatusMessage = "Gaming entry deleted";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    // ── Parks CRUD ──

    [RelayCommand]
    private async Task LoadParksAsync()
    {
        if (_service == null || string.IsNullOrEmpty(SelectedParkProvider)) return;
        IsBusy = true;
        try
        {
            var items = await _service.GetAllAsync<ParkDocument>(
                CosmosManagerService.ParksContainer, SelectedParkProvider, "provider");
            Parks = new ObservableCollection<ParkDocument>(items);
            StatusMessage = $"Loaded {items.Count} parks for {SelectedParkProvider}";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private void NewPark()
    {
        var json = JsonSerializer.Serialize(new ParkDocument
        {
            Id = Guid.NewGuid().ToString(),
            Provider = SelectedParkProvider ?? "disney"
        }, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        OpenJsonEditor("New Park", CosmosManagerService.ParksContainer, SelectedParkProvider ?? "disney", json, isNew: true);
    }

    [RelayCommand]
    private async Task EditParkAsync()
    {
        if (_service == null || SelectedPark == null) return;
        IsBusy = true;
        try
        {
            var json = await _service.GetItemJsonAsync(CosmosManagerService.ParksContainer, SelectedPark.Id, SelectedPark.Provider);
            OpenJsonEditor($"Edit Park: {SelectedPark.Name?.En ?? SelectedPark.ParkId}", CosmosManagerService.ParksContainer, SelectedPark.Provider, json, isNew: false);
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private async Task DeleteParkAsync()
    {
        if (_service == null || SelectedPark == null) return;
        if (MessageBox.Show($"Delete park '{SelectedPark.Name?.En ?? SelectedPark.ParkId}'?", "Confirm Delete", MessageBoxButton.YesNo) != MessageBoxResult.Yes) return;
        IsBusy = true;
        try
        {
            await _service.DeleteAsync(CosmosManagerService.ParksContainer, SelectedPark.Id, SelectedPark.Provider);
            Parks.Remove(SelectedPark);
            StatusMessage = "Park deleted";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    // ── Monthly Updates CRUD ──

    [RelayCommand]
    private async Task LoadMonthlyUpdatesAsync()
    {
        if (_service == null || string.IsNullOrEmpty(SelectedMonth)) return;
        IsBusy = true;
        try
        {
            var items = await _service.GetAllAsync<MonthlyUpdateDocument>(
                CosmosManagerService.MonthlyUpdatesContainer, SelectedMonth, "month");
            MonthlyUpdates = new ObservableCollection<MonthlyUpdateDocument>(items.OrderBy(m => m.Order));
            StatusMessage = $"Loaded {items.Count} monthly updates for {SelectedMonth}";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private void NewMonthlyUpdate()
    {
        var json = JsonSerializer.Serialize(new MonthlyUpdateDocument
        {
            Id = Guid.NewGuid().ToString(),
            Month = SelectedMonth ?? DateTime.Now.ToString("yyyy-MM")
        }, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        OpenJsonEditor("New Monthly Update", CosmosManagerService.MonthlyUpdatesContainer, SelectedMonth ?? DateTime.Now.ToString("yyyy-MM"), json, isNew: true);
    }

    [RelayCommand]
    private async Task EditMonthlyUpdateAsync()
    {
        if (_service == null || SelectedMonthlyUpdate == null) return;
        IsBusy = true;
        try
        {
            var json = await _service.GetItemJsonAsync(CosmosManagerService.MonthlyUpdatesContainer, SelectedMonthlyUpdate.Id, SelectedMonthlyUpdate.Month);
            OpenJsonEditor($"Edit Monthly Update: {SelectedMonthlyUpdate.Title}", CosmosManagerService.MonthlyUpdatesContainer, SelectedMonthlyUpdate.Month, json, isNew: false);
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private async Task DeleteMonthlyUpdateAsync()
    {
        if (_service == null || SelectedMonthlyUpdate == null) return;
        if (MessageBox.Show($"Delete monthly update '{SelectedMonthlyUpdate.Title}'?", "Confirm Delete", MessageBoxButton.YesNo) != MessageBoxResult.Yes) return;
        IsBusy = true;
        try
        {
            await _service.DeleteAsync(CosmosManagerService.MonthlyUpdatesContainer, SelectedMonthlyUpdate.Id, SelectedMonthlyUpdate.Month);
            MonthlyUpdates.Remove(SelectedMonthlyUpdate);
            StatusMessage = "Monthly update deleted";
        }
        catch (Exception ex) { StatusMessage = $"Error: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    // ── JSON Editor ──

    private void OpenJsonEditor(string title, string container, string partitionKey, string json, bool isNew)
    {
        JsonEditorTitle = title;
        _jsonEditorContainer = container;
        _jsonEditorPartitionKey = partitionKey;
        _jsonEditorIsNew = isNew;
        JsonEditorContent = json;
        IsJsonEditorOpen = true;
    }

    [RelayCommand]
    private async Task SaveJsonAsync()
    {
        if (_service == null || _jsonEditorContainer == null || _jsonEditorPartitionKey == null) return;
        IsBusy = true;
        try
        {
            // Validate JSON
            JsonDocument.Parse(JsonEditorContent);

            if (_jsonEditorIsNew)
                await _service.CreateItemFromJsonAsync(_jsonEditorContainer, JsonEditorContent, _jsonEditorPartitionKey);
            else
                await _service.SaveItemJsonAsync(_jsonEditorContainer, JsonEditorContent, _jsonEditorPartitionKey);

            IsJsonEditorOpen = false;
            StatusMessage = _jsonEditorIsNew ? "Item created successfully" : "Item saved successfully";

            // Reload the current section
            await ReloadCurrentSectionAsync();
        }
        catch (JsonException)
        {
            StatusMessage = "Invalid JSON. Please fix the syntax and try again.";
        }
        catch (Exception ex) { StatusMessage = $"Error saving: {ex.Message}"; }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private void CancelJsonEditor()
    {
        IsJsonEditorOpen = false;
    }

    private async Task ReloadCurrentSectionAsync()
    {
        switch (_jsonEditorContainer)
        {
            case CosmosManagerService.MoviesContainer: await LoadMoviesAsync(); break;
            case CosmosManagerService.SeriesContainer: await LoadSeriesAsync(); break;
            case CosmosManagerService.GamingContainer: await LoadGamingAsync(); break;
            case CosmosManagerService.ParksContainer: await LoadParksAsync(); break;
            case CosmosManagerService.MonthlyUpdatesContainer: await LoadMonthlyUpdatesAsync(); break;
        }
    }
}

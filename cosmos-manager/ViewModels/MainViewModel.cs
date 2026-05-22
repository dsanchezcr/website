using System.Collections.ObjectModel;
using System.Text.Json;
using System.Windows;
using CommunityToolkit.Mvvm.ComponentModel;
using CommunityToolkit.Mvvm.Input;
using CosmosManager.Models;
using CosmosManager.Services;
using CosmosManager.Views;

namespace CosmosManager.ViewModels;

public partial class MainViewModel : ObservableObject
{
    private readonly AzureAuthService _auth = new();
    private CosmosDiscoveryService? _discovery;
    private CosmosManagerService? _service;

    [ObservableProperty] private string endpoint = string.Empty;
    [ObservableProperty] private string key = string.Empty;
    [ObservableProperty] private string databaseName = "dsanchezcr-website";
    [ObservableProperty] private bool isConnected;
    [ObservableProperty] private string statusMessage = "Not connected";
    [ObservableProperty] private bool isBusy;

    // ── Microsoft sign-in / discovery ──
    [ObservableProperty] private bool isSignedIn;
    [ObservableProperty] private string? signedInAccount;
    [ObservableProperty] private ObservableCollection<AzureSubscriptionInfo> subscriptions = [];
    [ObservableProperty] private AzureSubscriptionInfo? selectedSubscription;
    [ObservableProperty] private ObservableCollection<CosmosAccountInfo> cosmosAccounts = [];
    [ObservableProperty] private CosmosAccountInfo? selectedCosmosAccount;
    [ObservableProperty] private ObservableCollection<string> databases = [];
    [ObservableProperty] private string? selectedDatabase;
    [ObservableProperty] private bool showManualConnection;

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

    // ── Microsoft sign-in & Cosmos discovery ──

    public async Task InitializeAsync()
    {
        // Best-effort silent sign-in from token cache.
        try
        {
            if (await _auth.TrySilentSignInAsync())
            {
                IsSignedIn = true;
                SignedInAccount = _auth.Account;
                _discovery = new CosmosDiscoveryService(_auth);
                StatusMessage = $"Signed in as {SignedInAccount}. Select a subscription to discover Cosmos DB accounts.";
                await LoadSubscriptionsAsync();
            }
            else
            {
                StatusMessage = "Click 'Sign in with Microsoft' to discover your Cosmos DB accounts.";
            }
        }
        catch (Exception ex)
        {
            StatusMessage = $"Silent sign-in failed: {ex.Message}";
        }
    }

    [RelayCommand]
    private async Task SignInAsync()
    {
        IsBusy = true;
        StatusMessage = "Signing in to Microsoft...";
        try
        {
            await _auth.SignInAsync();
            IsSignedIn = true;
            SignedInAccount = _auth.Account;
            _discovery = new CosmosDiscoveryService(_auth);
            StatusMessage = $"Signed in as {SignedInAccount}";
            await LoadSubscriptionsAsync();
        }
        catch (Exception ex)
        {
            StatusMessage = $"Sign-in failed: {ex.Message}";
        }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private void SignOut()
    {
        _auth.SignOut();
        IsSignedIn = false;
        SignedInAccount = null;
        _discovery = null;
        Subscriptions.Clear();
        CosmosAccounts.Clear();
        Databases.Clear();
        SelectedSubscription = null;
        SelectedCosmosAccount = null;
        SelectedDatabase = null;
        Disconnect();
        StatusMessage = "Signed out";
    }

    private async Task LoadSubscriptionsAsync()
    {
        if (_discovery == null) return;
        IsBusy = true;
        try
        {
            var subs = await _discovery.ListSubscriptionsAsync();
            Subscriptions = new ObservableCollection<AzureSubscriptionInfo>(subs);
            if (Subscriptions.Count == 1) SelectedSubscription = Subscriptions[0];
        }
        catch (Exception ex)
        {
            StatusMessage = $"Failed to list subscriptions: {ex.Message}";
        }
        finally { IsBusy = false; }
    }

    partial void OnSelectedSubscriptionChanged(AzureSubscriptionInfo? value)
    {
        CosmosAccounts.Clear();
        Databases.Clear();
        SelectedCosmosAccount = null;
        SelectedDatabase = null;
        if (value != null) _ = LoadCosmosAccountsAsync(value);
    }

    private async Task LoadCosmosAccountsAsync(AzureSubscriptionInfo sub)
    {
        if (_discovery == null) return;
        IsBusy = true;
        StatusMessage = $"Loading Cosmos DB accounts in {sub.DisplayName}...";
        try
        {
            var accounts = await _discovery.ListCosmosAccountsAsync(sub.Id);
            CosmosAccounts = new ObservableCollection<CosmosAccountInfo>(accounts);
            StatusMessage = $"Found {accounts.Count} Cosmos DB account(s) in {sub.DisplayName}";
            if (CosmosAccounts.Count == 1) SelectedCosmosAccount = CosmosAccounts[0];
        }
        catch (Exception ex)
        {
            StatusMessage = $"Failed to list accounts: {ex.Message}";
        }
        finally { IsBusy = false; }
    }

    partial void OnSelectedCosmosAccountChanged(CosmosAccountInfo? value)
    {
        Databases.Clear();
        SelectedDatabase = null;
        if (value != null)
        {
            Endpoint = value.Endpoint;
            _ = LoadDatabasesAsync(value);
        }
    }

    private async Task LoadDatabasesAsync(CosmosAccountInfo account)
    {
        if (_discovery == null) return;
        IsBusy = true;
        try
        {
            var dbs = await _discovery.ListDatabasesAsync(account);
            Databases = new ObservableCollection<string>(dbs);
            // Pre-select dsanchezcr-website if it exists, otherwise first.
            SelectedDatabase = dbs.FirstOrDefault(d => d.Equals("dsanchezcr-website", StringComparison.OrdinalIgnoreCase))
                ?? dbs.FirstOrDefault();
        }
        catch (Exception ex)
        {
            StatusMessage = $"Failed to list databases: {ex.Message}";
        }
        finally { IsBusy = false; }
    }

    [RelayCommand]
    private async Task ConnectDiscoveredAsync()
    {
        if (_discovery == null || SelectedCosmosAccount == null || string.IsNullOrWhiteSpace(SelectedDatabase))
        {
            StatusMessage = "Select a Cosmos DB account and database first.";
            return;
        }

        IsBusy = true;
        StatusMessage = "Connecting (RBAC)...";
        try
        {
            _service?.Dispose();
            DatabaseName = SelectedDatabase;
            Endpoint = SelectedCosmosAccount.Endpoint;

            // Try RBAC (data-plane AAD) first — no keys leave Azure.
            _service = new CosmosManagerService(SelectedCosmosAccount.Endpoint, _auth.Credential, SelectedDatabase);
            try
            {
                await _service.TestConnectionAsync();
                IsConnected = true;
                StatusMessage = $"Connected via Entra ID (RBAC) to {SelectedDatabase}";
                await LoadFiltersAsync();
                return;
            }
            catch (Exception rbacEx) when (IsAuthOrForbidden(rbacEx))
            {
                // Fall back to fetching the master key via ARM.
                _service.Dispose();
                StatusMessage = "RBAC denied — falling back to account key...";
                var fetchedKey = await _discovery.TryGetPrimaryKeyAsync(SelectedCosmosAccount);
                if (string.IsNullOrEmpty(fetchedKey))
                {
                    IsConnected = false;
                    StatusMessage = "Cannot connect: no RBAC role (Cosmos DB Built-in Data Contributor) and no permission to list keys.";
                    return;
                }
                Key = fetchedKey;
                _service = new CosmosManagerService(SelectedCosmosAccount.Endpoint, fetchedKey, SelectedDatabase);
                await _service.TestConnectionAsync();
                IsConnected = true;
                StatusMessage = $"Connected via account key to {SelectedDatabase}";
                await LoadFiltersAsync();
            }
        }
        catch (Exception ex)
        {
            IsConnected = false;
            StatusMessage = $"Connection failed: {ex.Message}";
        }
        finally { IsBusy = false; }
    }

    private static bool IsAuthOrForbidden(Exception ex)
    {
        if (ex is Microsoft.Azure.Cosmos.CosmosException ce)
            return ce.StatusCode == System.Net.HttpStatusCode.Forbidden
                || ce.StatusCode == System.Net.HttpStatusCode.Unauthorized;
        return ex.Message.Contains("forbidden", StringComparison.OrdinalIgnoreCase)
            || ex.Message.Contains("unauthorized", StringComparison.OrdinalIgnoreCase);
    }

    [RelayCommand]
    private void ToggleManualConnection() => ShowManualConnection = !ShowManualConnection;

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
    private async Task NewMovieAsync()
    {
        var json = JsonSerializer.Serialize(new MovieDocument
        {
            Id = Guid.NewGuid().ToString(),
            Category = SelectedMovieCategory ?? "watched"
        }, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await OpenFormEditorAsync(FormEntityKind.Movie, CosmosManagerService.MoviesContainer, SelectedMovieCategory ?? "watched", json, isNew: true);
    }

    [RelayCommand]
    private async Task EditMovieAsync()
    {
        if (_service == null || SelectedMovie == null) return;
        IsBusy = true;
        try
        {
            var json = await _service.GetItemJsonAsync(CosmosManagerService.MoviesContainer, SelectedMovie.Id, SelectedMovie.Category);
            await OpenFormEditorAsync(FormEntityKind.Movie, CosmosManagerService.MoviesContainer, SelectedMovie.Category, json, isNew: false);
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
    private async Task NewSeriesAsync()
    {
        var json = JsonSerializer.Serialize(new SeriesDocument
        {
            Id = Guid.NewGuid().ToString(),
            Category = SelectedSeriesCategory ?? "watched"
        }, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await OpenFormEditorAsync(FormEntityKind.Series, CosmosManagerService.SeriesContainer, SelectedSeriesCategory ?? "watched", json, isNew: true);
    }

    [RelayCommand]
    private async Task EditSeriesAsync()
    {
        if (_service == null || SelectedSeries == null) return;
        IsBusy = true;
        try
        {
            var json = await _service.GetItemJsonAsync(CosmosManagerService.SeriesContainer, SelectedSeries.Id, SelectedSeries.Category);
            await OpenFormEditorAsync(FormEntityKind.Series, CosmosManagerService.SeriesContainer, SelectedSeries.Category, json, isNew: false);
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
    private async Task NewGamingAsync()
    {
        var json = JsonSerializer.Serialize(new GamingDocument
        {
            Id = Guid.NewGuid().ToString(),
            Platform = SelectedGamingPlatform ?? "xbox"
        }, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await OpenFormEditorAsync(FormEntityKind.Gaming, CosmosManagerService.GamingContainer, SelectedGamingPlatform ?? "xbox", json, isNew: true);
    }

    [RelayCommand]
    private async Task EditGamingAsync()
    {
        if (_service == null || SelectedGaming == null) return;
        IsBusy = true;
        try
        {
            var json = await _service.GetItemJsonAsync(CosmosManagerService.GamingContainer, SelectedGaming.Id, SelectedGaming.Platform);
            await OpenFormEditorAsync(FormEntityKind.Gaming, CosmosManagerService.GamingContainer, SelectedGaming.Platform, json, isNew: false);
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
    private async Task NewParkAsync()
    {
        var json = JsonSerializer.Serialize(new ParkDocument
        {
            Id = Guid.NewGuid().ToString(),
            Provider = SelectedParkProvider ?? "disney"
        }, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await OpenFormEditorAsync(FormEntityKind.Park, CosmosManagerService.ParksContainer, SelectedParkProvider ?? "disney", json, isNew: true);
    }

    [RelayCommand]
    private async Task EditParkAsync()
    {
        if (_service == null || SelectedPark == null) return;
        IsBusy = true;
        try
        {
            var json = await _service.GetItemJsonAsync(CosmosManagerService.ParksContainer, SelectedPark.Id, SelectedPark.Provider);
            await OpenFormEditorAsync(FormEntityKind.Park, CosmosManagerService.ParksContainer, SelectedPark.Provider, json, isNew: false);
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
    private async Task NewMonthlyUpdateAsync()
    {
        var json = JsonSerializer.Serialize(new MonthlyUpdateDocument
        {
            Id = Guid.NewGuid().ToString(),
            Month = SelectedMonth ?? DateTime.Now.ToString("yyyy-MM")
        }, new JsonSerializerOptions { WriteIndented = true, PropertyNamingPolicy = JsonNamingPolicy.CamelCase });
        await OpenFormEditorAsync(FormEntityKind.MonthlyUpdate, CosmosManagerService.MonthlyUpdatesContainer, SelectedMonth ?? DateTime.Now.ToString("yyyy-MM"), json, isNew: true);
    }

    [RelayCommand]
    private async Task EditMonthlyUpdateAsync()
    {
        if (_service == null || SelectedMonthlyUpdate == null) return;
        IsBusy = true;
        try
        {
            var json = await _service.GetItemJsonAsync(CosmosManagerService.MonthlyUpdatesContainer, SelectedMonthlyUpdate.Id, SelectedMonthlyUpdate.Month);
            await OpenFormEditorAsync(FormEntityKind.MonthlyUpdate, CosmosManagerService.MonthlyUpdatesContainer, SelectedMonthlyUpdate.Month, json, isNew: false);
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

    private static string? GetPartitionKeyField(string? containerName) => containerName switch
    {
        CosmosManagerService.MoviesContainer => "category",
        CosmosManagerService.SeriesContainer => "category",
        CosmosManagerService.GamingContainer => "platform",
        CosmosManagerService.ParksContainer => "provider",
        CosmosManagerService.MonthlyUpdatesContainer => "month",
        _ => null
    };

    private async Task OpenFormEditorAsync(FormEntityKind kind, string container, string partitionKey, string json, bool isNew)
    {
        if (_service == null) return;

        var vm = new FormEditorViewModel(kind, container, partitionKey, json, isNew, _service);
        var win = new FormEditorWindow(vm) { Owner = Application.Current.MainWindow };
        win.ShowDialog();

        if (win.RequestRawJsonEdit)
        {
            // User wants to drop into the raw JSON editor with whatever they had.
            var currentJson = vm.BuildJson();
            OpenJsonEditor(isNew ? $"New {kind} (raw JSON)" : $"Edit {kind} (raw JSON)",
                container, partitionKey, currentJson, isNew);
            return;
        }

        if (!win.Saved) return;

        IsBusy = true;
        try
        {
            var payload = vm.BuildJson();
            var pk = vm.GetEffectivePartitionKey();
            if (string.IsNullOrEmpty(pk)) pk = partitionKey;

            if (isNew)
                await _service.CreateItemFromJsonAsync(container, payload, pk);
            else
                await _service.SaveItemJsonAsync(container, payload, pk);

            StatusMessage = isNew ? "Item created" : "Item saved";
            _jsonEditorContainer = container; // for ReloadCurrentSectionAsync
            await ReloadCurrentSectionAsync();
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error saving: {ex.Message}";
            MessageBox.Show(Application.Current.MainWindow!, ex.Message,
                "Save failed", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        finally { IsBusy = false; }
    }

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
            // Validate JSON and extract partition key from edited content
            using var validationDoc = JsonDocument.Parse(JsonEditorContent);
            var pkField = GetPartitionKeyField(_jsonEditorContainer);
            if (pkField != null && validationDoc.RootElement.TryGetProperty(pkField, out var pkElement))
            {
                _jsonEditorPartitionKey = pkElement.GetString() ?? _jsonEditorPartitionKey;
            }

            if (_jsonEditorIsNew)
                await _service.CreateItemFromJsonAsync(_jsonEditorContainer, JsonEditorContent, _jsonEditorPartitionKey);
            else
                await _service.SaveItemJsonAsync(_jsonEditorContainer, JsonEditorContent, _jsonEditorPartitionKey);

            IsJsonEditorOpen = false;
            StatusMessage = _jsonEditorIsNew ? "Item created successfully" : "Item saved successfully";

            // Reload the current section
            await ReloadCurrentSectionAsync();
        }
        catch (JsonException jex)
        {
            StatusMessage = "Invalid JSON. Please fix the syntax and try again.";
            MessageBox.Show(Application.Current.MainWindow!, jex.Message,
                "Invalid JSON", MessageBoxButton.OK, MessageBoxImage.Warning);
        }
        catch (Exception ex)
        {
            StatusMessage = $"Error saving: {ex.Message}";
            MessageBox.Show(Application.Current.MainWindow!, ex.Message,
                "Save failed", MessageBoxButton.OK, MessageBoxImage.Error);
        }
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
        }    }
}

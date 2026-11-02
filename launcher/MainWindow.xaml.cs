using System.Collections.ObjectModel;
using System.Diagnostics;
using System.IO;
using System.Windows;
using System.Windows.Controls;
using System.Windows.Input;
using System.Windows.Media;
using System.Windows.Media.Imaging;
using GameVault.Launcher.Models;
using GameVault.Launcher.Services;

namespace GameVault.Launcher;

public partial class MainWindow : Window
{
    private readonly StorageService _storageService;
    private readonly ApiService _apiService;
    private readonly GameManagerService _gameManagerService;
    
    private AppSession _session;
    private readonly ObservableCollection<GameListItem> _allGames = new();
    private readonly ObservableCollection<GameListItem> _displayedGames = new();
    private readonly Dictionary<Guid, CancellationTokenSource> _downloadingTasks = new();

    public MainWindow()
    {
        InitializeComponent();

        _storageService = new StorageService();
        _session = _storageService.LoadSession();

        _apiService = new ApiService(_session.ApiUrl);
        _gameManagerService = new GameManagerService(_storageService);

        lstSidebarGames.ItemsSource = _displayedGames;
        icGamePosters.ItemsSource = _displayedGames;
        txtApiUrl.Text = _session.ApiUrl;

        _autoSyncTimer = new System.Windows.Threading.DispatcherTimer
        {
            Interval = TimeSpan.FromSeconds(8)
        };
        _autoSyncTimer.Tick += async (s, e) =>
        {
            if (_session.User != null && !string.IsNullOrEmpty(_session.AccessToken))
            {
                await LoadLibraryAsync(silent: true);
            }
        };
        _autoSyncTimer.Start();

        Loaded += MainWindow_Loaded;
    }

    private readonly System.Windows.Threading.DispatcherTimer _autoSyncTimer;

    private async void MainWindow_Loaded(object sender, RoutedEventArgs e)
    {
        if (!string.IsNullOrEmpty(_session.SavedEmail))
        {
            txtLoginEmail.Text = _session.SavedEmail;
        }

        // Auto login if we have a valid token
        if (!string.IsNullOrEmpty(_session.AccessToken) && _session.User != null)
        {
            _apiService.SetAuthToken(_session.AccessToken);
            UpdateUserProfileUi(_session.User);
            ShowMainSteamView();
            await LoadLibraryAsync();

            HandleDeepLink(App.LaunchArgument);
        }
        else
        {
            ShowLoginView();
        }
    }

    private void HandleDeepLink(string? arg)
    {
        try
        {
            if (WindowState == WindowState.Minimized)
            {
                WindowState = WindowState.Normal;
            }
            Activate();
            Topmost = true;
            Topmost = false;
            Focus();
        }
        catch { }

        if (string.IsNullOrEmpty(arg)) return;

        // format: gamevault://launch/{gameId} hoặc gamevault://open/{gameId}
        string? rawId = null;
        if (arg.StartsWith("gamevault://launch/", StringComparison.OrdinalIgnoreCase))
        {
            rawId = arg.Substring("gamevault://launch/".Length).TrimEnd('/');
        }
        else if (arg.StartsWith("gamevault://open/", StringComparison.OrdinalIgnoreCase))
        {
            rawId = arg.Substring("gamevault://open/".Length).TrimEnd('/');
        }

        if (!string.IsNullOrEmpty(rawId) && Guid.TryParse(rawId, out var targetGameId))
        {
            var match = _allGames.FirstOrDefault(g => g.GameId == targetGameId);
            if (match != null)
            {
                // Chỉ chọn game trong danh sách thư viện, KHÔNG tự động chạy vào game
                lstSidebarGames.SelectedItem = match;
            }
        }
    }

    #region View Switching & User Profile

    private void ShowLoginView()
    {
        viewLogin.Visibility = Visibility.Visible;
        viewMainSteam.Visibility = Visibility.Collapsed;
        txtLoginError.Text = string.Empty;
        pnlLoginError.Visibility = Visibility.Collapsed;
    }

    private void ShowMainSteamView()
    {
        viewLogin.Visibility = Visibility.Collapsed;
        viewMainSteam.Visibility = Visibility.Visible;
    }

    private void UpdateUserProfileUi(UserDto user)
    {
        txtUserName.Text = string.IsNullOrWhiteSpace(user.FullName) ? "Gamer" : user.FullName;
        txtUserAvatarInitial.Text = string.IsNullOrWhiteSpace(user.FullName)
            ? user.Email[0].ToString().ToUpperInvariant()
            : user.FullName[0].ToString().ToUpperInvariant();

        if (!string.IsNullOrWhiteSpace(user.AvatarUrl))
        {
            try
            {
                var avatarPath = user.AvatarUrl.StartsWith("/")
                    ? $"{_session.ApiUrl.TrimEnd('/')}{user.AvatarUrl}"
                    : user.AvatarUrl;

                var bitmap = new BitmapImage();
                bitmap.BeginInit();
                bitmap.UriSource = new Uri(avatarPath, UriKind.Absolute);
                bitmap.CacheOption = BitmapCacheOption.OnLoad;
                bitmap.CreateOptions = BitmapCreateOptions.IgnoreImageCache;
                bitmap.EndInit();

                imgUserAvatar.Source = bitmap;
                imgUserAvatar.Visibility = Visibility.Visible;
                txtUserAvatarInitial.Visibility = Visibility.Collapsed;
            }
            catch
            {
                imgUserAvatar.Visibility = Visibility.Collapsed;
                txtUserAvatarInitial.Visibility = Visibility.Visible;
            }
        }
        else
        {
            imgUserAvatar.Visibility = Visibility.Collapsed;
            txtUserAvatarInitial.Visibility = Visibility.Visible;
        }
    }

    #endregion

    #region Authentication Events

    private async void BtnLogin_Click(object sender, RoutedEventArgs e)
    {
        try
        {
            await PerformLoginAsync();
        }
        catch (Exception ex)
        {
            ShowLoginError($"Lỗi hệ thống: {ex.Message}");
        }
    }

    private async void TxtLoginPassword_KeyDown(object sender, KeyEventArgs e)
    {
        if (e.Key == Key.Enter)
        {
            e.Handled = true;
            try
            {
                await PerformLoginAsync();
            }
            catch (Exception ex)
            {
                ShowLoginError($"Lỗi hệ thống: {ex.Message}");
            }
        }
    }

    private async Task PerformLoginAsync()
    {
        try
        {
            var email = txtLoginEmail.Text.Trim();
            var password = txtLoginPassword.Password;
            var customApiUrl = txtApiUrl.Text.Trim();

            if (string.IsNullOrEmpty(email) || string.IsNullOrEmpty(password))
            {
                ShowLoginError("Vui lòng nhập đầy đủ Email và Mật khẩu.");
                return;
            }

            if (!string.IsNullOrEmpty(customApiUrl) && !string.Equals(customApiUrl, _session.ApiUrl, StringComparison.OrdinalIgnoreCase))
            {
                _session.ApiUrl = customApiUrl;
                _apiService.UpdateBaseUrl(customApiUrl);
            }

            btnLogin.IsEnabled = false;
            btnLogin.Content = "ĐANG XÁC THỰC...";
            pnlLoginError.Visibility = Visibility.Collapsed;

            var authResponse = await _apiService.LoginAsync(email, password);

            _session.AccessToken = authResponse.AccessToken;
            _session.RefreshToken = authResponse.RefreshToken;
            _session.User = authResponse.User;
            _session.SavedEmail = email;
            _storageService.SaveSession(_session);

            UpdateUserProfileUi(authResponse.User);
            ShowMainSteamView();
            await LoadLibraryAsync();
        }
        catch (Exception ex)
        {
            ShowLoginError(ex.Message);
        }
        finally
        {
            btnLogin.IsEnabled = true;
            btnLogin.Content = "ĐĂNG NHẬP";
        }
    }

    private void ShowLoginError(string message)
    {
        txtLoginError.Text = message;
        pnlLoginError.Visibility = Visibility.Visible;
    }

    private void BtnLogout_Click(object sender, RoutedEventArgs e)
    {
        var confirm = DarkMessageBoxWindow.ShowConfirm(
            this,
            "Bạn có chắc chắn muốn đăng xuất khỏi GameVault Client không?",
            "Xác nhận đăng xuất",
            okText: "Đăng xuất",
            cancelText: "Hủy",
            isDestructive: true);

        if (confirm)
        {
            _storageService.ClearSession();
            _apiService.SetAuthToken(null);
            _allGames.Clear();
            _displayedGames.Clear();

            ShowLoginView();
        }
    }

    #endregion

    #region Library Operations

    private async Task LoadLibraryAsync(bool silent = false)
    {
        try
        {
            // Sync latest user profile and avatar from server
            var latestProfile = await _apiService.GetProfileAsync();
            if (latestProfile != null)
            {
                _session.User = latestProfile;
                _storageService.SaveSession(_session);
                UpdateUserProfileUi(latestProfile);
            }

            var serverGames = await _apiService.GetLibraryAsync();

            // If silent sync and count matches existing without download ongoing, skip full refresh
            if (silent && serverGames.Count == _allGames.Count && !_allGames.Any(g => g.IsDownloading))
            {
                return;
            }

            _allGames.Clear();
            _displayedGames.Clear();

            foreach (var g in serverGames)
            {
                var item = new GameListItem
                {
                    GameId = g.GameId,
                    Title = g.Title,
                    Slug = g.Slug,
                    RawCoverUrl = g.CoverUrl,
                    AcquiredAt = g.AcquiredAt,
                    Version = g.Version ?? "1.0.0",
                    LastDownloadAt = g.LastDownloadAt
                };

                // Safe image loading
                if (!string.IsNullOrEmpty(g.CoverUrl))
                {
                    try
                    {
                        var uri = g.CoverUrl.StartsWith("/") 
                            ? new Uri($"{_session.ApiUrl.TrimEnd('/')}{g.CoverUrl}")
                            : new Uri(g.CoverUrl);
                        item.CoverUrl = new BitmapImage(uri);
                    }
                    catch { }
                }

                // Check local installation state
                if (_gameManagerService.IsGameInstalled(g.GameId, out var metadata))
                {
                    item.IsInstalled = true;
                    item.InstalledMetadata = metadata;
                }
                else
                {
                    item.IsInstalled = false;
                }

                _allGames.Add(item);
                _displayedGames.Add(item);
            }

            txtGamesCountBadge.Text = $"Games ({_allGames.Count})";
            txtShelfCount.Text = $"({_allGames.Count} trò chơi sở hữu)";
            pnlEmptyLibrary.Visibility = _allGames.Count == 0 ? Visibility.Visible : Visibility.Collapsed;
        }
        catch (Exception ex)
        {
            if (!silent)
            {
                DarkMessageBoxWindow.ShowWarning(this, $"Lỗi tải thư viện: {ex.Message}", "Lỗi kết nối");
            }
        }
    }

    private async void BtnRefreshLibrary_Click(object sender, RoutedEventArgs e)
    {
        await LoadLibraryAsync();
    }

    private void TxtSearchGame_TextChanged(object sender, TextChangedEventArgs e)
    {
        var filter = txtSearchGame.Text.Trim().ToLowerInvariant();
        _displayedGames.Clear();

        foreach (var game in _allGames)
        {
            if (string.IsNullOrEmpty(filter) || game.Title.ToLowerInvariant().Contains(filter) || game.Slug.ToLowerInvariant().Contains(filter))
            {
                _displayedGames.Add(game);
            }
        }
    }

    private void LstGames_SelectionChanged(object sender, SelectionChangedEventArgs e)
    {
        // When clicking on sidebar item, select corresponding game
        if (lstSidebarGames.SelectedItem is GameListItem selected)
        {
            // Do not force UI shift, can be used for quick focus
        }
    }

    #endregion

    #region Card Action Buttons (Play / Install / Options)

    private void BtnCardPlay_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is GameListItem game)
        {
            try
            {
                if (game.InstalledMetadata != null)
                {
                    _gameManagerService.LaunchGame(game.InstalledMetadata);
                }
                else
                {
                    DarkMessageBoxWindow.ShowWarning(this, "Không tìm thấy thông tin cài đặt game.", "Lỗi");
                }
            }
            catch (Exception ex)
            {
                DarkMessageBoxWindow.ShowError(this, $"Lỗi khởi chạy game: {ex.Message}", "Lỗi khởi chạy");
            }
        }
    }

    private async void BtnCardInstall_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is GameListItem game)
        {
            await DownloadAndInstallCardGameAsync(game);
        }
    }

    private async Task DownloadAndInstallCardGameAsync(GameListItem game)
    {
        // Cho phép người dùng chọn ổ đĩa / thư mục cài đặt game (D:\, E:\, C:\...)
        var folderDialog = new Microsoft.Win32.OpenFolderDialog
        {
            Title = $"Chọn thư mục / ổ đĩa để tải và cài đặt game: {game.Title}",
            Multiselect = false
        };

        if (!string.IsNullOrEmpty(_session.PreferredInstallDirectory) && Directory.Exists(_session.PreferredInstallDirectory))
        {
            folderDialog.InitialDirectory = _session.PreferredInstallDirectory;
        }
        else if (Directory.Exists(@"D:\"))
        {
            folderDialog.InitialDirectory = @"D:\";
        }
        else
        {
            folderDialog.InitialDirectory = StorageService.DefaultGamesInstallDirectory;
        }

        bool? dialogResult = folderDialog.ShowDialog(this);
        if (dialogResult != true || string.IsNullOrWhiteSpace(folderDialog.FolderName))
        {
            // Người dùng hủy chọn hoặc tắt cửa sổ
            return;
        }

        string chosenInstallFolder = folderDialog.FolderName;
        _session.PreferredInstallDirectory = chosenInstallFolder;
        _storageService.SaveSession(_session);

        var cts = new CancellationTokenSource();
        _downloadingTasks[game.GameId] = cts;

        game.IsDownloading = true;
        game.DownloadPercent = 0;
        game.DownloadProgressText = "0%";

        var progress = new Progress<(double progressPercent, string statusText)>(info =>
        {
            game.DownloadPercent = info.progressPercent;
            game.DownloadProgressText = $"{info.progressPercent:F0}%";
        });

        try
        {
            var downloadLink = await _apiService.GetDownloadLinkAsync(game.GameId, cts.Token);
            var gameDto = new LibraryGameDto(
                game.GameId, game.Title, game.Slug, game.RawCoverUrl, game.AcquiredAt, game.Version, game.LastDownloadAt
            );

            await _gameManagerService.DownloadAndInstallGameAsync(
                gameDto,
                downloadLink.DownloadUrl,
                _session.ApiUrl,
                chosenInstallFolder,
                progress,
                cts.Token
            );

            if (_gameManagerService.IsGameInstalled(game.GameId, out var metadata))
            {
                game.IsInstalled = true;
                game.InstalledMetadata = metadata;
            }

            DarkMessageBoxWindow.ShowInfo(this, $"Cài đặt hoàn tất: {game.Title}!\nBạn có thể bấm nút Play ▶ màu xanh để bắt đầu chơi.", "Hoàn tất cài đặt");
        }
        catch (OperationCanceledException)
        {
            game.DownloadProgressText = "Đã hủy";
        }
        catch (Exception ex)
        {
            DarkMessageBoxWindow.ShowError(this, $"Lỗi tải/cài đặt: {ex.Message}", "Lỗi tải game");
        }
        finally
        {
            game.IsDownloading = false;
            _downloadingTasks.Remove(game.GameId);
        }
    }

    private void BtnCardOptions_Click(object sender, RoutedEventArgs e)
    {
        if (sender is Button btn && btn.Tag is GameListItem game)
        {
            var menu = new ContextMenu();

            if (game.IsInstalled)
            {
                var itemPlay = new MenuItem
                {
                    Header = "▶  Chơi ngay (Qua Launcher DRM)",
                    FontWeight = FontWeights.Bold,
                    Foreground = (SolidColorBrush)new BrushConverter().ConvertFrom("#4ADE80")!
                };
                itemPlay.Click += (s, args) => BtnCardPlay_Click(btn, args);
                menu.Items.Add(itemPlay);

                var itemFolder = new MenuItem
                {
                    Header = "📂  Mở thư mục cài đặt",
                    FontWeight = FontWeights.Bold,
                    Foreground = System.Windows.Media.Brushes.White
                };
                itemFolder.Click += (s, args) => OpenGameFolder(game);
                menu.Items.Add(itemFolder);

                var itemUninstall = new MenuItem
                {
                    Header = "🗑  Gỡ cài đặt khỏi máy",
                    FontWeight = FontWeights.Bold,
                    Foreground = (SolidColorBrush)new BrushConverter().ConvertFrom("#FBBF24")!
                };
                itemUninstall.Click += (s, args) => UninstallGame(game);
                menu.Items.Add(itemUninstall);
            }
            else
            {
                var itemInstall = new MenuItem
                {
                    Header = "⬇  Tải và Cài đặt",
                    FontWeight = FontWeights.Bold,
                    Foreground = (SolidColorBrush)new BrushConverter().ConvertFrom("#38BDF8")!
                };
                itemInstall.Click += async (s, args) => await DownloadAndInstallCardGameAsync(game);
                menu.Items.Add(itemInstall);
            }

            menu.Items.Add(new Separator());

            var itemRemove = new MenuItem
            {
                Header = "❌  Xóa game khỏi Thư viện (Tài khoản)",
                FontWeight = FontWeights.Bold,
                Foreground = (SolidColorBrush)new BrushConverter().ConvertFrom("#F87171")!
            };
            itemRemove.Click += async (s, args) => await RemoveGameFromAccount(game);
            menu.Items.Add(itemRemove);

            menu.PlacementTarget = btn;
            menu.IsOpen = true;
        }
    }

    private void OpenGameFolder(GameListItem game)
    {
        if (game.InstalledMetadata != null && Directory.Exists(game.InstalledMetadata.InstallPath))
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = game.InstalledMetadata.InstallPath,
                UseShellExecute = true
            });
        }
        else
        {
            DarkMessageBoxWindow.ShowWarning(this, "Thư mục game không tồn tại hoặc đã bị xóa.", "Lỗi");
        }
    }

    private void UninstallGame(GameListItem game)
    {
        var confirm = DarkMessageBoxWindow.ShowConfirm(
            this,
            $"Bạn có chắc chắn muốn gỡ cài đặt '{game.Title}' khỏi máy tính không?",
            "Xác nhận gỡ cài đặt",
            okText: "Gỡ cài đặt",
            cancelText: "Hủy",
            isDestructive: true);

        if (confirm)
        {
            _gameManagerService.UninstallGame(game.GameId);
            game.IsInstalled = false;
            game.InstalledMetadata = null;
            DarkMessageBoxWindow.ShowInfo(this, $"Đã gỡ cài đặt thành công '{game.Title}'.", "Thông báo");
        }
    }

    private async Task RemoveGameFromAccount(GameListItem game)
    {
        var confirm = DarkMessageBoxWindow.ShowConfirm(
            this,
            $"Bạn có chắc chắn muốn xóa game '{game.Title}' vĩnh viễn khỏi tài khoản của mình không?",
            "Xác nhận xóa game",
            okText: "Xóa vĩnh viễn",
            cancelText: "Hủy",
            isDestructive: true);

        if (confirm)
        {
            try
            {
                if (game.IsInstalled)
                {
                    _gameManagerService.UninstallGame(game.GameId);
                }

                await _apiService.RemoveFromLibraryAsync(game.GameId);

                _allGames.Remove(game);
                _displayedGames.Remove(game);

                txtGamesCountBadge.Text = $"Games ({_allGames.Count})";
                txtShelfCount.Text = $"({_allGames.Count} trò chơi sở hữu)";
                pnlEmptyLibrary.Visibility = _allGames.Count == 0 ? Visibility.Visible : Visibility.Collapsed;

                DarkMessageBoxWindow.ShowInfo(this, "Đã xóa game khỏi Thư viện tài khoản thành công.", "Đã xóa");
            }
            catch (Exception ex)
            {
                DarkMessageBoxWindow.ShowError(this, $"Không thể xóa game: {ex.Message}", "Lỗi");
            }
        }
    }

    #endregion

    #region Web Store & External Navigation

    private void BtnVisitWebsite_Click(object sender, RoutedEventArgs e)
    {
        var confirm = DarkMessageBoxWindow.ShowConfirm(
            this,
            "Bạn có muốn mở trình duyệt để truy cập Cửa hàng GameVault trên Website không?",
            "Xác nhận truy cập Website",
            okText: "Mở trình duyệt",
            cancelText: "Hủy");

        if (!confirm)
        {
            return;
        }

        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = _session.WebUrl,
                UseShellExecute = true
            });
        }
        catch (Exception ex)
        {
            DarkMessageBoxWindow.ShowError(this, $"Không thể mở trình duyệt: {ex.Message}", "Lỗi");
        }
    }

    private void BtnOpenRegisterWeb_Click(object sender, RoutedEventArgs e)
    {
        var registerUrl = $"{_session.WebUrl.TrimEnd('/')}/auth/register";
        try
        {
            Process.Start(new ProcessStartInfo
            {
                FileName = registerUrl,
                UseShellExecute = true
            });
        }
        catch
        {
            BtnVisitWebsite_Click(sender, e);
        }
    }

    #endregion
}
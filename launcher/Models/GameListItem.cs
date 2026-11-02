using System.ComponentModel;
using System.Runtime.CompilerServices;
using System.Windows;
using System.Windows.Media;

namespace GameVault.Launcher.Models;

public class GameListItem : INotifyPropertyChanged
{
    public Guid GameId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? RawCoverUrl { get; set; }
    public DateTime AcquiredAt { get; set; }
    public string Version { get; set; } = "1.0.0";
    public DateTime? LastDownloadAt { get; set; }

    public ImageSource? CoverUrl { get; set; }
    public InstalledGameMetadata? InstalledMetadata { get; set; }

    private bool _isInstalled;
    public bool IsInstalled
    {
        get => _isInstalled;
        set
        {
            _isInstalled = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(StatusText));
            OnPropertyChanged(nameof(StatusColorBrush));
            OnPropertyChanged(nameof(StatusBadgeIcon));
            OnPropertyChanged(nameof(IsInstalledVisible));
            OnPropertyChanged(nameof(IsNotInstalledVisible));
            OnPropertyChanged(nameof(IsDownloadingVisible));
        }
    }

    private bool _isDownloading;
    public bool IsDownloading
    {
        get => _isDownloading;
        set
        {
            _isDownloading = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(StatusText));
            OnPropertyChanged(nameof(StatusColorBrush));
            OnPropertyChanged(nameof(StatusBadgeIcon));
            OnPropertyChanged(nameof(IsInstalledVisible));
            OnPropertyChanged(nameof(IsNotInstalledVisible));
            OnPropertyChanged(nameof(IsDownloadingVisible));
        }
    }

    private double _downloadPercent;
    public double DownloadPercent
    {
        get => _downloadPercent;
        set
        {
            _downloadPercent = value;
            OnPropertyChanged();
        }
    }

    private string _downloadProgressText = string.Empty;
    public string DownloadProgressText
    {
        get => _downloadProgressText;
        set
        {
            _downloadProgressText = value;
            OnPropertyChanged();
            OnPropertyChanged(nameof(StatusText));
        }
    }

    public Visibility IsInstalledVisible => IsInstalled && !IsDownloading ? Visibility.Visible : Visibility.Collapsed;
    public Visibility IsNotInstalledVisible => !IsInstalled && !IsDownloading ? Visibility.Visible : Visibility.Collapsed;
    public Visibility IsDownloadingVisible => IsDownloading ? Visibility.Visible : Visibility.Collapsed;

    public string StatusText
    {
        get
        {
            if (IsDownloading) return string.IsNullOrEmpty(DownloadProgressText) ? "Đang tải xuống..." : DownloadProgressText;
            if (IsInstalled) return "✓ Đã cài đặt";
            return "Chưa tải về";
        }
    }

    public Brush StatusColorBrush
    {
        get
        {
            if (IsDownloading) return new SolidColorBrush(Color.FromRgb(99, 102, 241)); // Indigo
            if (IsInstalled) return new SolidColorBrush(Color.FromRgb(16, 185, 129)); // Green
            return new SolidColorBrush(Color.FromRgb(148, 163, 184)); // Gray
        }
    }

    public string StatusBadgeIcon
    {
        get
        {
            if (IsDownloading) return "⏳";
            if (IsInstalled) return "▶";
            return "⬇";
        }
    }

    public event PropertyChangedEventHandler? PropertyChanged;
    protected void OnPropertyChanged([CallerMemberName] string? propertyName = null)
    {
        PropertyChanged?.Invoke(this, new PropertyChangedEventArgs(propertyName));
    }
}

using System.IO;
using System.Text.Json;
using GameVault.Launcher.Models;

namespace GameVault.Launcher.Services;

public class StorageService
{
    private readonly string _appDataFolder;
    private readonly string _sessionFilePath;
    private readonly string _installedGamesFilePath;

    public static readonly string DefaultGamesInstallDirectory = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "GameVault",
        "Games"
    );

    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNameCaseInsensitive = true,
        WriteIndented = true
    };

    public StorageService(string? customAppDataFolder = null)
    {
        _appDataFolder = string.IsNullOrWhiteSpace(customAppDataFolder)
            ? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "GameVault")
            : customAppDataFolder;

        _sessionFilePath = Path.Combine(_appDataFolder, "session.json");
        _installedGamesFilePath = Path.Combine(_appDataFolder, "installed_games.json");

        if (!Directory.Exists(_appDataFolder))
        {
            Directory.CreateDirectory(_appDataFolder);
        }

        if (string.IsNullOrWhiteSpace(customAppDataFolder) && !Directory.Exists(DefaultGamesInstallDirectory))
        {
            Directory.CreateDirectory(DefaultGamesInstallDirectory);
        }
    }

    public AppSession LoadSession()
    {
        try
        {
            if (File.Exists(_sessionFilePath))
            {
                var json = File.ReadAllText(_sessionFilePath);
                var session = JsonSerializer.Deserialize<AppSession>(json, JsonOptions);
                if (session != null) return session;
            }
        }
        catch { }

        return new AppSession();
    }

    public void SaveSession(AppSession session)
    {
        try
        {
            var json = JsonSerializer.Serialize(session, JsonOptions);
            File.WriteAllText(_sessionFilePath, json);
        }
        catch { }
    }

    public void ClearSession()
    {
        try
        {
            var session = LoadSession();
            session.AccessToken = null;
            session.RefreshToken = null;
            session.User = null;
            SaveSession(session);
        }
        catch { }
    }

    public Dictionary<Guid, InstalledGameMetadata> LoadInstalledGames()
    {
        try
        {
            if (File.Exists(_installedGamesFilePath))
            {
                var json = File.ReadAllText(_installedGamesFilePath);
                var dict = JsonSerializer.Deserialize<Dictionary<Guid, InstalledGameMetadata>>(json, JsonOptions);
                return dict ?? new Dictionary<Guid, InstalledGameMetadata>();
            }
        }
        catch { }

        return new Dictionary<Guid, InstalledGameMetadata>();
    }

    public void SaveInstalledGames(Dictionary<Guid, InstalledGameMetadata> installedGames)
    {
        try
        {
            var json = JsonSerializer.Serialize(installedGames, JsonOptions);
            File.WriteAllText(_installedGamesFilePath, json);
        }
        catch { }
    }

    public void SetGameInstalled(InstalledGameMetadata metadata)
    {
        var games = LoadInstalledGames();
        games[metadata.GameId] = metadata;
        SaveInstalledGames(games);
    }

    public void SetGameUninstalled(Guid gameId)
    {
        var games = LoadInstalledGames();
        if (games.ContainsKey(gameId))
        {
            games.Remove(gameId);
            SaveInstalledGames(games);
        }
    }
}

using System.IO;
using System.Text.Json;
using GameVault.Launcher.Models;

namespace GameVault.Launcher.Services;

public class StorageService
{
    private static readonly string AppDataFolder = Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
        "GameVault"
    );

    private static readonly string SessionFilePath = Path.Combine(AppDataFolder, "session.json");
    private static readonly string InstalledGamesFilePath = Path.Combine(AppDataFolder, "installed_games.json");
    
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

    public StorageService()
    {
        if (!Directory.Exists(AppDataFolder))
        {
            Directory.CreateDirectory(AppDataFolder);
        }

        if (!Directory.Exists(DefaultGamesInstallDirectory))
        {
            Directory.CreateDirectory(DefaultGamesInstallDirectory);
        }
    }

    public AppSession LoadSession()
    {
        try
        {
            if (File.Exists(SessionFilePath))
            {
                var json = File.ReadAllText(SessionFilePath);
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
            File.WriteAllText(SessionFilePath, json);
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
            if (File.Exists(InstalledGamesFilePath))
            {
                var json = File.ReadAllText(InstalledGamesFilePath);
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
            File.WriteAllText(InstalledGamesFilePath, json);
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

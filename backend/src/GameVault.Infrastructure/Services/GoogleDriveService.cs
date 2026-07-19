using GameVault.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using Google.Apis.Auth.OAuth2;
using Google.Apis.Drive.v3;
using Google.Apis.Services;
using Google.Apis.Upload;
using DriveFile = Google.Apis.Drive.v3.Data.File;

namespace GameVault.Infrastructure.Services;

public class GoogleDriveService(IConfiguration config) : IGoogleDriveService
{
    private string LocalRoot
    {
        get
        {
            var dir = Directory.GetCurrentDirectory();
            while (dir != null)
            {
                var wwwroot = Path.Combine(dir, "wwwroot");
                if (Directory.Exists(wwwroot))
                {
                    return Path.Combine(wwwroot, "uploads");
                }
                var apiWwwroot = Path.Combine(dir, "src", "GameVault.API", "wwwroot");
                if (Directory.Exists(apiWwwroot))
                {
                    return Path.Combine(apiWwwroot, "uploads");
                }
                dir = Directory.GetParent(dir)?.FullName;
            }
            return Path.Combine(Directory.GetCurrentDirectory(), "wwwroot", "uploads");
        }
    }

    private bool IsLocalFallback()
    {
        var base64 = config["GoogleDrive:ServiceAccountJsonBase64"];
        var clientId = config["GoogleDrive:OAuth:ClientId"];
        var useFallback = config.GetValue<bool>("GoogleDrive:UseLocalFallback", true);
        return useFallback || (string.IsNullOrEmpty(base64) && string.IsNullOrEmpty(clientId));
    }

    private DriveService GetDriveService()
    {
        // 1. Check if OAuth is configured (using User Credential)
        var clientId = config["GoogleDrive:OAuth:ClientId"];
        var clientSecret = config["GoogleDrive:OAuth:ClientSecret"];
        var refreshToken = config["GoogleDrive:OAuth:RefreshToken"];

        if (!string.IsNullOrEmpty(clientId) && !string.IsNullOrEmpty(clientSecret) && !string.IsNullOrEmpty(refreshToken))
        {
            var flow = new Google.Apis.Auth.OAuth2.Flows.GoogleAuthorizationCodeFlow(new Google.Apis.Auth.OAuth2.Flows.GoogleAuthorizationCodeFlow.Initializer
            {
                ClientSecrets = new ClientSecrets
                {
                    ClientId = clientId,
                    ClientSecret = clientSecret
                },
                Scopes = new[] { DriveService.Scope.Drive }
            });

            var credential = new UserCredential(flow, "user", new Google.Apis.Auth.OAuth2.Responses.TokenResponse
            {
                RefreshToken = refreshToken
            });

            return new DriveService(new BaseClientService.Initializer
            {
                HttpClientInitializer = credential,
                ApplicationName = "GameVault"
            });
        }

        // 2. Fall back to Service Account JSON
        var base64Json = config["GoogleDrive:ServiceAccountJsonBase64"];
        if (string.IsNullOrEmpty(base64Json))
        {
            throw new InvalidOperationException("Google Drive credentials are not configured.");
        }

        byte[] jsonBytes = Convert.FromBase64String(base64Json);
        using var stream = new System.IO.MemoryStream(jsonBytes);
        var serviceAccountCredential = CredentialFactory.FromStream<ServiceAccountCredential>(stream)
            .ToGoogleCredential()
            .CreateScoped(DriveService.Scope.Drive);

        return new DriveService(new BaseClientService.Initializer
        {
            HttpClientInitializer = serviceAccountCredential,
            ApplicationName = "GameVault"
        });
    }

    private async Task<string> GetOrCreateFolderIdAsync(DriveService service, string folderPath, string parentId, CancellationToken ct)
    {
        if (string.IsNullOrEmpty(folderPath)) return parentId;

        var parts = folderPath.Split('/', StringSplitOptions.RemoveEmptyEntries);
        string currentParent = parentId;

        foreach (var part in parts)
        {
            var listRequest = service.Files.List();
            listRequest.Q = $"name = '{part}' and '{currentParent}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false";
            listRequest.Fields = "files(id)";

            var listResult = await listRequest.ExecuteAsync(ct);
            var folder = listResult.Files.FirstOrDefault();

            if (folder != null)
            {
                currentParent = folder.Id;
            }
            else
            {
                var newFolder = new DriveFile
                {
                    Name = part,
                    MimeType = "application/vnd.google-apps.folder",
                    Parents = new List<string> { currentParent }
                };
                var createRequest = service.Files.Create(newFolder);
                createRequest.Fields = "id";
                var createdFolder = await createRequest.ExecuteAsync(ct);
                currentParent = createdFolder.Id;
            }
        }

        return currentParent;
    }

    public async Task<(string FileId, string Url)> UploadAsync(Stream stream, string fileName, string mimeType, string folder, CancellationToken ct = default)
    {
        if (IsLocalFallback())
        {
            Directory.CreateDirectory(Path.Combine(LocalRoot, folder));
            var fileId = Guid.NewGuid().ToString();
            var safeName = $"{fileId}_{Path.GetFileName(fileName)}";
            var path = Path.Combine(LocalRoot, folder, safeName);
            await using var fs = System.IO.File.Create(path);
            await stream.CopyToAsync(fs, ct);
            return (fileId, $"/uploads/{folder}/{safeName}");
        }
        else
        {
            var service = GetDriveService();
            var rootFolderId = config["GoogleDrive:RootFolderId"] ?? "root";
            var parentFolderId = await GetOrCreateFolderIdAsync(service, folder, rootFolderId, ct);

            var driveFile = new DriveFile
            {
                Name = fileName,
                Parents = new List<string> { parentFolderId }
            };

            var request = service.Files.Create(driveFile, stream, mimeType);
            request.Fields = "id, webViewLink, webContentLink";

            var progress = await request.UploadAsync(ct);
            if (progress.Status == UploadStatus.Failed)
            {
                throw new Exception($"Google Drive upload failed: {progress.Exception?.Message}", progress.Exception);
            }

            var uploadedFile = request.ResponseBody;

            try
            {
                var permission = new Google.Apis.Drive.v3.Data.Permission
                {
                    Role = "reader",
                    Type = "anyone"
                };
                await service.Permissions.Create(permission, uploadedFile.Id).ExecuteAsync(ct);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Warning: Failed to set public permissions: {ex.Message}");
            }

            string url = uploadedFile.WebContentLink ?? uploadedFile.WebViewLink;
            if (mimeType.StartsWith("image/", StringComparison.OrdinalIgnoreCase))
            {
                url = $"https://drive.google.com/thumbnail?sz=w1000&id={uploadedFile.Id}";
            }
            return (uploadedFile.Id, url);
        }
    }

    public async Task<string> GetDownloadUrlAsync(string fileId, CancellationToken ct = default)
    {
        if (IsLocalFallback())
        {
            if (Directory.Exists(LocalRoot))
            {
                var files = Directory.GetFiles(LocalRoot, $"*{fileId}*", SearchOption.AllDirectories);
                if (files.Length > 0)
                {
                    var rel = files[0].Replace(Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "").Replace('\\', '/');
                    return rel;
                }
            }
            return $"/uploads/{fileId}";
        }
        else
        {
            var service = GetDriveService();
            var request = service.Files.Get(fileId);
            request.Fields = "webContentLink, webViewLink";
            var file = await request.ExecuteAsync(ct);
            return file.WebContentLink ?? file.WebViewLink;
        }
    }

    public async Task DeleteAsync(string fileId, CancellationToken ct = default)
    {
        if (IsLocalFallback())
        {
            if (Directory.Exists(LocalRoot))
            {
                var files = Directory.GetFiles(LocalRoot, $"*{fileId}*", SearchOption.AllDirectories);
                foreach (var file in files)
                {
                    try
                    {
                        System.IO.File.Delete(file);
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Failed to delete local file: {ex.Message}");
                    }
                }
            }
        }
        else
        {
            try
            {
                var service = GetDriveService();
                await service.Files.Delete(fileId).ExecuteAsync(ct);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Failed to delete file from Google Drive: {ex.Message}");
            }
        }
    }

    public async Task<string?> DownloadFileToLocalAsync(string driveFileId, string localRelativePath, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(driveFileId)) return null;

        // Build destination path
        var destPath = Path.Combine(LocalRoot, localRelativePath.Replace('/', Path.DirectorySeparatorChar).TrimStart(Path.DirectorySeparatorChar));
        
        // Skip if already exists
        if (System.IO.File.Exists(destPath)) return $"/uploads/{localRelativePath}";

        try
        {
            var service = GetDriveService();
            var request = service.Files.Get(driveFileId);
            
            var dir = Path.GetDirectoryName(destPath);
            if (dir != null && !Directory.Exists(dir)) Directory.CreateDirectory(dir);

            await using var fs = System.IO.File.Create(destPath);
            await request.DownloadAsync(fs, ct);
            
            return $"/uploads/{localRelativePath}";
        }
        catch (Exception ex)
        {
            Console.WriteLine($"Failed to download Drive file {driveFileId} to {localRelativePath}: {ex.Message}");
            return null;
        }
    }
}

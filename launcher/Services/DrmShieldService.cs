using System.Diagnostics;
using System.IO;
using System.Reflection;
using System.Security.Cryptography;
using System.Text;
using GameVault.Launcher.Models;
using Microsoft.Win32;

namespace GameVault.Launcher.Services;

public class DrmShieldService
{
    private const string ProtectedFolderName = ".gv_protected";
    private const string EncryptedExtension = ".gvbin";
    private const string MetaFileName = "drm.meta.txt";
    private static readonly byte[] MagicHeader = Encoding.ASCII.GetBytes("GVDRM001"); // 8 bytes
    private static readonly Lazy<byte[]> EmbeddedStubBytes = new(LoadEmbeddedStubBytes);
    private static readonly Lazy<byte[]> EmbeddedStubHash = new(() => SHA256.HashData(EmbeddedStubBytes.Value));

    private static byte[] LoadEmbeddedStubBytes()
    {
        var assembly = Assembly.GetExecutingAssembly();
        using var stream = assembly.GetManifestResourceStream("GameVaultDrmStub.exe")
            ?? throw new InvalidOperationException("Không tìm thấy tài nguyên bảo vệ GameVaultDrmStub.exe trong Launcher.");
        using var ms = new MemoryStream();
        stream.CopyTo(ms);
        return ms.ToArray();
    }

    private static string GetMachineBindingId()
    {
        try
        {
            using var key = Registry.LocalMachine.OpenSubKey(@"SOFTWARE\Microsoft\Cryptography");
            var guid = key?.GetValue("MachineGuid")?.ToString();
            if (!string.IsNullOrWhiteSpace(guid))
            {
                return guid.Trim();
            }
        }
        catch
        {
            // Fallback to machine name if registry read is restricted
        }

        return Environment.MachineName;
    }

    private static (byte[] EncKey, byte[] MacKey) DeriveKeys(Guid gameId)
    {
        var machineId = GetMachineBindingId();
        var encSeed = Encoding.UTF8.GetBytes($"GameVault-DRM-ENC-v1|{machineId}|{gameId:N}");
        var macSeed = Encoding.UTF8.GetBytes($"GameVault-DRM-MAC-v1|{machineId}|{gameId:N}");
        return (SHA256.HashData(encSeed), SHA256.HashData(macSeed));
    }

    public static string GetProtectedDirectory(string exePath)
    {
        var exeDir = Path.GetDirectoryName(exePath)
            ?? throw new InvalidOperationException("Đường dẫn tệp thực thi không hợp lệ.");
        return Path.Combine(exeDir, ProtectedFolderName);
    }

    public static string GetEncryptedPayloadPath(string exePath)
    {
        var exeName = Path.GetFileName(exePath);
        return Path.Combine(GetProtectedDirectory(exePath), exeName + EncryptedExtension);
    }

    public bool IsStubExecutable(string exePath)
    {
        if (!File.Exists(exePath)) return false;

        try
        {
            var stubBytes = EmbeddedStubBytes.Value;
            var fi = new FileInfo(exePath);
            if (fi.Length != stubBytes.Length) return false;

            using var fs = new FileStream(exePath, FileMode.Open, FileAccess.Read, FileShare.ReadWrite);
            var fileHash = SHA256.HashData(fs);
            return CryptographicOperations.FixedTimeEquals(fileHash, EmbeddedStubHash.Value);
        }
        catch
        {
            return false;
        }
    }

    public bool HasEncryptedPayload(string exePath)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return false;
        try
        {
            return File.Exists(GetEncryptedPayloadPath(exePath));
        }
        catch
        {
            return false;
        }
    }

    private static void EnsureProtectedDirectory(string protectedDir)
    {
        if (!Directory.Exists(protectedDir))
        {
            var info = Directory.CreateDirectory(protectedDir);
            try { info.Attributes |= FileAttributes.Hidden; } catch { }
        }
    }

    private static void WriteMetadataFile(string protectedDir, Guid gameId, string gameTitle)
    {
        try
        {
            var metaPath = Path.Combine(protectedDir, MetaFileName);
            var safeTitle = (gameTitle ?? string.Empty).Replace("\r", " ").Replace("\n", " ").Trim();
            var content = $"gameId={gameId}\ntitle={safeTitle}\n";
            File.WriteAllText(metaPath, content, new UTF8Encoding(encoderShouldEmitUTF8Identifier: false));
        }
        catch
        {
        }
    }

    /// <summary>
    /// Encrypts the original game .exe into .gv_protected/&lt;name&gt;.gvbin and replaces the .exe with the DRM Stub.
    /// Safe to call repeatedly: never overwrites .gvbin with the stub.
    /// </summary>
    public void ProtectExecutable(Guid gameId, string gameTitle, string exePath)
    {
        if (string.IsNullOrWhiteSpace(exePath) || !File.Exists(exePath)) return;
        if (!exePath.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) return;

        var protectedDir = GetProtectedDirectory(exePath);
        EnsureProtectedDirectory(protectedDir);
        WriteMetadataFile(protectedDir, gameId, gameTitle);

        var encryptedPath = GetEncryptedPayloadPath(exePath);

        // If already replaced by stub, never overwrite the encrypted payload
        if (IsStubExecutable(exePath))
        {
            return;
        }

        // Encrypt original executable -> .gvbin atomically via temp file
        var plainBytes = File.ReadAllBytes(exePath);
        var (encKey, macKey) = DeriveKeys(gameId);

        byte[] iv = RandomNumberGenerator.GetBytes(16);
        byte[] cipherBytes;
        using (var aes = Aes.Create())
        {
            aes.KeySize = 256;
            aes.Key = encKey;
            aes.IV = iv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;
            using var encryptor = aes.CreateEncryptor();
            cipherBytes = encryptor.TransformFinalBlock(plainBytes, 0, plainBytes.Length);
        }

        // Compute HMAC-SHA256 over MagicHeader || IV || Ciphertext
        byte[] mac;
        using (var hmac = new HMACSHA256(macKey))
        {
            hmac.TransformBlock(MagicHeader, 0, MagicHeader.Length, null, 0);
            hmac.TransformBlock(iv, 0, iv.Length, null, 0);
            hmac.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
            mac = hmac.Hash!;
        }

        var tempEncPath = encryptedPath + ".tmp";
        using (var fs = new FileStream(tempEncPath, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            fs.Write(MagicHeader, 0, MagicHeader.Length);
            fs.Write(iv, 0, iv.Length);
            fs.Write(mac, 0, mac.Length);
            fs.Write(cipherBytes, 0, cipherBytes.Length);
        }

        File.Move(tempEncPath, encryptedPath, overwrite: true);

        // Replace original .exe with DRM Stub
        ReplaceFileWithRetry(exePath, EmbeddedStubBytes.Value);
    }

    /// <summary>
    /// Decrypts .gvbin and restores the real game executable at its exact original path so engines like Unity find *_Data.
    /// </summary>
    public bool UnlockForLaunch(Guid gameId, string gameTitle, string exePath)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return false;
        if (!exePath.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) return false;

        var encryptedPath = GetEncryptedPayloadPath(exePath);

        // Legacy installation without DRM yet -> protect first so .gvbin backup exists
        if (!File.Exists(encryptedPath))
        {
            if (!File.Exists(exePath) || IsStubExecutable(exePath))
            {
                throw new FileNotFoundException("Không tìm thấy gói dữ liệu bản quyền (.gvbin) của trò chơi. Vui lòng cài đặt lại game từ Launcher.");
            }
            ProtectExecutable(gameId, gameTitle, exePath);
        }
        else
        {
            var protectedDir = GetProtectedDirectory(exePath);
            EnsureProtectedDirectory(protectedDir);
            WriteMetadataFile(protectedDir, gameId, gameTitle);
        }

        var raw = File.ReadAllBytes(encryptedPath);
        int headerLen = MagicHeader.Length;
        int ivLen = 16;
        int macLen = 32;
        int prefixLen = headerLen + ivLen + macLen;

        if (raw.Length <= prefixLen || !raw.AsSpan(0, headerLen).SequenceEqual(MagicHeader))
        {
            throw new InvalidDataException("Tệp bản quyền trò chơi bị hỏng. Vui lòng gỡ cài đặt và tải lại từ GameVault Launcher.");
        }

        var iv = raw.AsSpan(headerLen, ivLen).ToArray();
        var storedMac = raw.AsSpan(headerLen + ivLen, macLen).ToArray();
        var cipherBytes = raw.AsSpan(prefixLen).ToArray();

        var (encKey, macKey) = DeriveKeys(gameId);
        byte[] computedMac;
        using (var hmac = new HMACSHA256(macKey))
        {
            hmac.TransformBlock(MagicHeader, 0, headerLen, null, 0);
            hmac.TransformBlock(iv, 0, ivLen, null, 0);
            hmac.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
            computedMac = hmac.Hash!;
        }

        if (!CryptographicOperations.FixedTimeEquals(storedMac, computedMac))
        {
            throw new UnauthorizedAccessException("Xác thực bản quyền thất bại (tệp game không thuộc thiết bị này hoặc đã bị chỉnh sửa). Vui lòng tải lại game qua GameVault Launcher.");
        }

        byte[] plainBytes;
        using (var aes = Aes.Create())
        {
            aes.KeySize = 256;
            aes.Key = encKey;
            aes.IV = iv;
            aes.Mode = CipherMode.CBC;
            aes.Padding = PaddingMode.PKCS7;
            using var decryptor = aes.CreateDecryptor();
            plainBytes = decryptor.TransformFinalBlock(cipherBytes, 0, cipherBytes.Length);
        }

        ReplaceFileWithRetry(exePath, plainBytes);
        return true;
    }

    /// <summary>
    /// Restores the DRM Stub back onto exePath after the game exits.
    /// </summary>
    public void RestoreStub(string exePath)
    {
        if (string.IsNullOrWhiteSpace(exePath)) return;
        if (!exePath.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) return;
        if (!HasEncryptedPayload(exePath)) return;
        if (IsStubExecutable(exePath)) return;

        try
        {
            ReplaceFileWithRetry(exePath, EmbeddedStubBytes.Value, maxRetries: 12, delayMs: 300);
        }
        catch (Exception ex)
        {
            App.Log($"[DRM] Failed to restore stub for '{exePath}': {ex.Message}");
        }
    }

    public void ProtectAllIdleGames(IEnumerable<InstalledGameMetadata> installedGames)
    {
        foreach (var meta in installedGames)
        {
            try
            {
                if (string.IsNullOrWhiteSpace(meta.ExecutablePath)) continue;
                if (!meta.ExecutablePath.EndsWith(".exe", StringComparison.OrdinalIgnoreCase)) continue;
                if (!File.Exists(meta.ExecutablePath)) continue;
                if (IsStubExecutable(meta.ExecutablePath)) continue;
                if (IsExecutableCurrentlyRunning(meta.ExecutablePath)) continue;

                if (HasEncryptedPayload(meta.ExecutablePath))
                {
                    RestoreStub(meta.ExecutablePath);
                }
                else
                {
                    ProtectExecutable(meta.GameId, meta.Slug, meta.ExecutablePath);
                }
            }
            catch (Exception ex)
            {
                App.Log($"[DRM] ProtectAllIdleGames skipped '{meta.ExecutablePath}': {ex.Message}");
            }
        }
    }

    private static bool IsExecutableCurrentlyRunning(string exePath)
    {
        try
        {
            var fullTarget = Path.GetFullPath(exePath);
            var procName = Path.GetFileNameWithoutExtension(exePath);
            foreach (var proc in Process.GetProcessesByName(procName))
            {
                try
                {
                    var mainPath = proc.MainModule?.FileName;
                    if (!string.IsNullOrEmpty(mainPath) &&
                        string.Equals(Path.GetFullPath(mainPath), fullTarget, StringComparison.OrdinalIgnoreCase))
                    {
                        return true;
                    }
                }
                catch
                {
                    // Access denied to process MainModule -> err on the side of caution if same process name
                    return true;
                }
                finally
                {
                    proc.Dispose();
                }
            }
        }
        catch
        {
        }
        return false;
    }

    private static void ReplaceFileWithRetry(string targetPath, byte[] bytes, int maxRetries = 8, int delayMs = 200)
    {
        Exception? lastError = null;
        for (int attempt = 0; attempt < maxRetries; attempt++)
        {
            try
            {
                var tempPath = targetPath + ".gvswap.tmp";
                File.WriteAllBytes(tempPath, bytes);
                File.Move(tempPath, targetPath, overwrite: true);
                return;
            }
            catch (IOException ex)
            {
                lastError = ex;
                Thread.Sleep(delayMs);
            }
            catch (UnauthorizedAccessException ex)
            {
                lastError = ex;
                Thread.Sleep(delayMs);
            }
        }

        throw new IOException($"Không thể cập nhật tệp trò chơi '{Path.GetFileName(targetPath)}' vì đang bị tiến trình khác sử dụng.", lastError);
    }
}

using System;
using System.IO;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Text;

[assembly: AssemblyTitle("GameVault DRM Protected Launcher")]
[assembly: AssemblyProduct("GameVault")]
[assembly: AssemblyCompany("GameVault")]
[assembly: AssemblyVersion("1.0.0.0")]

internal static class GameVaultDrmStub
{
    // Marker embedded in binary for verification
    public const string StubSignature = "GAMEVAULT_DRM_STUB_V1";

    private const uint MB_YESNO = 0x00000004;
    private const uint MB_ICONWARNING = 0x00000030;
    private const uint MB_TOPMOST = 0x00040000;
    private const int IDYES = 6;
    private const int SW_SHOWNORMAL = 1;

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    private static extern int MessageBoxW(IntPtr hWnd, string text, string caption, uint type);

    [DllImport("shell32.dll", CharSet = CharSet.Unicode)]
    private static extern IntPtr ShellExecuteW(
        IntPtr hwnd,
        string lpOperation,
        string lpFile,
        string lpParameters,
        string lpDirectory,
        int nShowCmd);

    [STAThread]
    private static int Main(string[] args)
    {
        string gameId = string.Empty;
        string gameTitle = string.Empty;

        try
        {
            string exeDir = AppDomain.CurrentDomain.BaseDirectory;
            string metaPath = Path.Combine(exeDir, ".gv_protected", "drm.meta.txt");
            if (File.Exists(metaPath))
            {
                string[] lines = File.ReadAllLines(metaPath, Encoding.UTF8);
                foreach (string rawLine in lines)
                {
                    if (string.IsNullOrWhiteSpace(rawLine)) continue;
                    int eq = rawLine.IndexOf('=');
                    if (eq <= 0) continue;
                    string key = rawLine.Substring(0, eq).Trim();
                    string val = rawLine.Substring(eq + 1).Trim();
                    if (string.Equals(key, "gameId", StringComparison.OrdinalIgnoreCase))
                    {
                        gameId = val;
                    }
                    else if (string.Equals(key, "title", StringComparison.OrdinalIgnoreCase))
                    {
                        gameTitle = val;
                    }
                }
            }
        }
        catch
        {
            // Ignore metadata read errors and show generic DRM message
        }

        string displayTitle = string.IsNullOrEmpty(gameTitle)
            ? "Trò chơi này"
            : "Trò chơi \"" + gameTitle + "\"";

        string message =
            "[BẢO VỆ BẢN QUYỀN GAMEVAULT DRM]\n\n" +
            displayTitle + " bắt buộc phải được khởi chạy thông qua ứng dụng:\n" +
            "GameVault Launcher\n\n" +
            "Bạn không thể mở trực tiếp tệp .exe hoặc sao chép sang máy tính khác.\n\n" +
            "Bạn có muốn mở GameVault Launcher ngay bây giờ không?";

        int result = MessageBoxW(
            IntPtr.Zero,
            message,
            "GameVault DRM Protection",
            MB_YESNO | MB_ICONWARNING | MB_TOPMOST);

        if (result == IDYES)
        {
            string targetUri = string.IsNullOrEmpty(gameId)
                ? "gamevault://"
                : "gamevault://open/" + gameId;

            try
            {
                ShellExecuteW(IntPtr.Zero, "open", targetUri, null, null, SW_SHOWNORMAL);
            }
            catch
            {
            }
        }

        return 1;
    }
}

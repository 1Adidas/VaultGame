using System.Diagnostics;
using Microsoft.Win32;

namespace GameVault.Launcher.Services;

public static class ProtocolService
{
    private const string PROTOCOL_NAME = "gamevault";

    public static void RegisterProtocol()
    {
        try
        {
            var exePath = Environment.ProcessPath ?? Process.GetCurrentProcess().MainModule?.FileName;
            if (string.IsNullOrEmpty(exePath)) return;

            // Register gamevault:// scheme in Windows Registry (HKCU)
            using var key = Registry.CurrentUser.CreateSubKey($@"Software\Classes\{PROTOCOL_NAME}");
            if (key != null)
            {
                key.SetValue("", "URL:GameVault Protocol");
                key.SetValue("URL Protocol", "");

                using var defaultIcon = key.CreateSubKey("DefaultIcon");
                defaultIcon?.SetValue("", $"\"{exePath}\",0");

                using var commandKey = key.CreateSubKey(@"shell\open\command");
                commandKey?.SetValue("", $"\"{exePath}\" \"%1\"");
            }
        }
        catch
        {
            // Ignore if non-admin or registry permission restricted
        }
    }
}

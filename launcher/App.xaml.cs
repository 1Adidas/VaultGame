using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Threading;
using System.Windows;
using GameVault.Launcher.Services;

namespace GameVault.Launcher;

public partial class App : Application
{
    public static string? LaunchArgument { get; private set; }
    private static Mutex? _mutex;

    [DllImport("user32.dll")]
    private static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

    private const int SW_RESTORE = 9;

    protected override void OnStartup(StartupEventArgs e)
    {
        // Global exception handling to prevent silent application termination
        DispatcherUnhandledException += (s, args) =>
        {
            args.Handled = true;
            Debug.WriteLine($"[CRITICAL] DispatcherUnhandledException: {args.Exception}");
            DarkMessageBoxWindow.ShowError(null, $"Đã xảy ra sự cố: {args.Exception.Message}", "Lỗi Launcher");
        };

        AppDomain.CurrentDomain.UnhandledException += (s, args) =>
        {
            if (args.ExceptionObject is Exception ex)
            {
                Debug.WriteLine($"[FATAL] AppDomain UnhandledException: {ex}");
            }
        };

        TaskScheduler.UnobservedTaskException += (s, args) =>
        {
            args.SetObserved();
            Debug.WriteLine($"[WARNING] UnobservedTaskException: {args.Exception}");
        };

        const string appGuid = "GameVault-Launcher-Singleton-9589ee38";
        _mutex = new Mutex(true, appGuid, out bool isNewInstance);

        if (!isNewInstance)
        {
            // Another instance is already running! Bring it to front and exit
            BringExistingInstanceToFront();
            Shutdown();
            return;
        }

        base.OnStartup(e);

        if (e.Args.Length > 0)
        {
            LaunchArgument = e.Args[0];
        }

        // Register gamevault:// URL scheme for Windows Web-to-Launcher deep linking
        ProtocolService.RegisterProtocol();
    }

    private static void BringExistingInstanceToFront()
    {
        try
        {
            var current = Process.GetCurrentProcess();
            foreach (var p in Process.GetProcessesByName(current.ProcessName))
            {
                if (p.Id != current.Id && p.MainWindowHandle != IntPtr.Zero)
                {
                    ShowWindowAsync(p.MainWindowHandle, SW_RESTORE);
                    SetForegroundWindow(p.MainWindowHandle);
                    break;
                }
            }
        }
        catch { }
    }
}

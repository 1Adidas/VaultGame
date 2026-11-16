using System.Diagnostics;
using System.IO;
using System.IO.Pipes;
using System.Runtime.InteropServices;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Windows;
using GameVault.Launcher.Services;

namespace GameVault.Launcher;

public partial class App : Application
{
    public static string? LaunchArgument { get; private set; }
    private static Mutex? _mutex;
    private static Mutex? _drmMutex;
    private const string PipeName = "GameVault-Launcher-Ipc-Pipe";

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
            Log($"[CRITICAL] DispatcherUnhandledException: {args.Exception}");
            DarkMessageBoxWindow.ShowError(null, $"Đã xảy ra sự cố: {args.Exception.Message}", "Lỗi Launcher");
        };

        AppDomain.CurrentDomain.UnhandledException += (s, args) =>
        {
            if (args.ExceptionObject is Exception ex)
            {
                Log($"[FATAL] AppDomain UnhandledException: {ex}");
            }
        };

        TaskScheduler.UnobservedTaskException += (s, args) =>
        {
            args.SetObserved();
            Log($"[WARNING] UnobservedTaskException: {args.Exception}");
        };

        Log($"App starting up. Args: {string.Join(" ", e.Args)}");

        const string appGuid = "GameVault-Launcher-Singleton-9589ee38";
        _mutex = new Mutex(true, appGuid, out bool isNewInstance);

        if (!isNewInstance)
        {
            Log("Another instance is already running.");
            if (e.Args.Length > 0)
            {
                SendArgToExistingInstance(e.Args[0]);
            }
            BringExistingInstanceToFront();
            Shutdown();
            return;
        }

        base.OnStartup(e);

        // Start Named Pipe server to listen for deep link calls from subsequent instances
        StartNamedPipeServer();

        // GameVault DRM: Hold local mutex to authenticate launched games
        try
        {
            _drmMutex = new Mutex(true, "Local\\GameVault_Launcher_Running");
        }
        catch { }

        if (e.Args.Length > 0)
        {
            LaunchArgument = e.Args[0];
        }

        // Register gamevault:// URL scheme for Windows Web-to-Launcher deep linking
        ProtocolService.RegisterProtocol();
    }

    protected override void OnExit(ExitEventArgs e)
    {
        Log($"App OnExit with code {e.ApplicationExitCode}");
        base.OnExit(e);
    }

    public static void Log(string message)
    {
        try
        {
            var logPath = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "gamevault_launcher.log");
            System.IO.File.AppendAllText(logPath, $"[{DateTime.Now:yyyy-MM-dd HH:mm:ss.fff}] {message}{Environment.NewLine}");
        }
        catch { }
    }

    private static void StartNamedPipeServer()
    {
        Task.Run(async () =>
        {
            while (true)
            {
                try
                {
                    await using var server = new NamedPipeServerStream(PipeName, PipeDirection.In, NamedPipeServerStream.MaxAllowedServerInstances, PipeTransmissionMode.Byte, PipeOptions.Asynchronous);
                    await server.WaitForConnectionAsync();
                    using var reader = new StreamReader(server, Encoding.UTF8);
                    var message = await reader.ReadToEndAsync();
                    if (!string.IsNullOrWhiteSpace(message))
                    {
                        Log($"NamedPipe server received: {message}");
                        Current?.Dispatcher?.Invoke(() =>
                        {
                            if (Current.MainWindow is MainWindow mw)
                            {
                                mw.HandleDeepLink(message.Trim());
                            }
                        });
                    }
                }
                catch (Exception ex)
                {
                    Log($"NamedPipe server exception: {ex.Message}");
                    await Task.Delay(500);
                }
            }
        });
    }

    private static void SendArgToExistingInstance(string arg)
    {
        try
        {
            using var client = new NamedPipeClientStream(".", PipeName, PipeDirection.Out);
            client.Connect(1500);
            using var writer = new StreamWriter(client, Encoding.UTF8);
            writer.Write(arg);
            writer.Flush();
            Log($"Sent argument to existing instance: {arg}");
        }
        catch (Exception ex)
        {
            Log($"Failed to send argument to existing instance: {ex.Message}");
        }
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

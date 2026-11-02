using System;
using System.Linq;
using System.Threading;

namespace SampleGame;

class Program
{
    private const string REQUIRED_AUTH_KEY = "--gv-auth-key=GameVaultSecret2026";

    static void Main(string[] args)
    {
        Console.OutputEncoding = System.Text.Encoding.UTF8;
        Console.Title = "GameVault - Protected Game Demo";

        bool hasValidAuth = args != null && args.Any(a => a.Equals(REQUIRED_AUTH_KEY, StringComparison.OrdinalIgnoreCase));

        if (!hasValidAuth)
        {
            Console.ForegroundColor = ConsoleColor.Red;
            Console.WriteLine(@"
========================================================================
                      [!] LỖI BẢO MẬT BẢN QUYỀN DRM [!]
========================================================================
  Trò chơi này bắt buộc phải được khởi chạy thông qua ứng dụng:
                       🎮 GAMEVAULT LAUNCHER
  
  Bạn không thể mở trực tiếp file .exe bên ngoài mà không có phiên xác thực!
========================================================================
");
            Console.ResetColor();
            Console.WriteLine("Nhấn phím bất kỳ để đóng...");
            Console.ReadKey();
            Environment.Exit(1);
            return;
        }

        Console.ForegroundColor = ConsoleColor.Cyan;
        Console.WriteLine(@"
   ______                        _    __            ____ 
  / ____/____ _ ____ ___   ___  | |  / /____ _ __  __/ / /_
 / / __ / __ `// __ `__ \ / _ \ | | / // __ `// / / / / __/
/ /_/ // /_/ // / / / / //  __/ | |/ // /_/ // /_/ / / /_  
\____/ \__,_//_/ /_/ /_/ \___/  |___/ \__,_/ \__,_/_/\__/  
                                                           
        ✓ XÁC THỰC BẢN QUYỀN THÀNH CÔNG TỪ LAUNCHER!
========================================================================");
        Console.ForegroundColor = ConsoleColor.Green;
        Console.WriteLine(" Trạng thái: ĐÃ KÍCH HOẠT (Phiên chơi hợp lệ)");
        Console.WriteLine($" Thời gian bắt đầu: {DateTime.Now:HH:mm:ss dd/MM/yyyy}");
        Console.ResetColor();
        Console.WriteLine("========================================================================");
        Console.WriteLine(" Game đang chạy ở chế độ nền. Thưởng thức đồ họa và gameplay mượt mà!");
        Console.WriteLine(" (Nhấn 'Q' hoặc phím bất kỳ để thoát khỏi game)");

        int count = 0;
        while (!Console.KeyAvailable)
        {
            Thread.Sleep(1000);
            count++;
            Console.Write($"\r [Đang chơi...] Thời gian trong game: {count} giây   ");
        }

        Console.WriteLine("\nCảm ơn bạn đã trải nghiệm qua GameVault!");
    }
}

using System.Windows;
using System.Windows.Input;
using System.Windows.Media;

namespace GameVault.Launcher;

public partial class DarkMessageBoxWindow : Window
{
    public bool DialogResultValue { get; private set; }

    public DarkMessageBoxWindow()
    {
        InitializeComponent();
        KeyDown += (s, e) =>
        {
            if (e.Key == Key.Escape)
            {
                BtnCancel_Click(s, e);
            }
            else if (e.Key == Key.Enter)
            {
                BtnOk_Click(s, e);
            }
        };
    }

    private void Header_MouseDown(object sender, MouseButtonEventArgs e)
    {
        if (e.LeftButton == MouseButtonState.Pressed)
        {
            DragMove();
        }
    }

    private void BtnOk_Click(object sender, RoutedEventArgs e)
    {
        DialogResultValue = true;
        DialogResult = true;
        Close();
    }

    private void BtnCancel_Click(object sender, RoutedEventArgs e)
    {
        DialogResultValue = false;
        DialogResult = false;
        Close();
    }

    private void BtnClose_Click(object sender, RoutedEventArgs e)
    {
        DialogResultValue = false;
        DialogResult = false;
        Close();
    }

    public static bool ShowConfirm(
        Window? owner,
        string message,
        string title = "Xác nhận",
        string okText = "Đồng ý",
        string cancelText = "Hủy",
        bool isDestructive = false)
    {
        var win = new DarkMessageBoxWindow();
        if (owner != null && owner.IsVisible)
        {
            win.Owner = owner;
        }

        win.txtTitle.Text = title;
        win.txtMessage.Text = message;
        win.btnOk.Content = okText;
        win.btnCancel.Content = cancelText;

        if (isDestructive)
        {
            win.txtHeaderIcon.Text = "⚠️";
            win.txtIcon.Text = "⚠️";
            win.txtIcon.Foreground = (SolidColorBrush)new BrushConverter().ConvertFrom("#EF4444")!;
            win.pnlIcon.Background = (SolidColorBrush)new BrushConverter().ConvertFrom("#3B181E")!;
            win.btnOk.Background = (SolidColorBrush)new BrushConverter().ConvertFrom("#DC2626")!;
        }
        else
        {
            win.txtHeaderIcon.Text = "❓";
            win.txtIcon.Text = "❓";
            win.txtIcon.Foreground = (SolidColorBrush)new BrushConverter().ConvertFrom("#38BDF8")!;
            win.pnlIcon.Background = (SolidColorBrush)new BrushConverter().ConvertFrom("#1E293B")!;
            win.btnOk.Background = (SolidColorBrush)new BrushConverter().ConvertFrom("#2563EB")!;
        }

        win.ShowDialog();
        return win.DialogResultValue;
    }

    public static void ShowInfo(Window? owner, string message, string title = "Thông báo")
    {
        var win = new DarkMessageBoxWindow();
        if (owner != null && owner.IsVisible)
        {
            win.Owner = owner;
        }

        win.txtTitle.Text = title;
        win.txtMessage.Text = message;
        win.txtHeaderIcon.Text = "✓";
        win.txtIcon.Text = "✓";
        win.txtIcon.Foreground = (SolidColorBrush)new BrushConverter().ConvertFrom("#34D399")!;
        win.pnlIcon.Background = (SolidColorBrush)new BrushConverter().ConvertFrom("#132E24")!;
        win.btnCancel.Visibility = Visibility.Collapsed;
        win.btnOk.Content = "Đã hiểu";

        win.ShowDialog();
    }

    public static void ShowWarning(Window? owner, string message, string title = "Cảnh báo")
    {
        var win = new DarkMessageBoxWindow();
        if (owner != null && owner.IsVisible)
        {
            win.Owner = owner;
        }

        win.txtTitle.Text = title;
        win.txtMessage.Text = message;
        win.txtHeaderIcon.Text = "⚠️";
        win.txtIcon.Text = "⚠️";
        win.txtIcon.Foreground = (SolidColorBrush)new BrushConverter().ConvertFrom("#FBBF24")!;
        win.pnlIcon.Background = (SolidColorBrush)new BrushConverter().ConvertFrom("#382D14")!;
        win.btnCancel.Visibility = Visibility.Collapsed;
        win.btnOk.Content = "Đóng";

        win.ShowDialog();
    }

    public static void ShowError(Window? owner, string message, string title = "Lỗi")
    {
        var win = new DarkMessageBoxWindow();
        if (owner != null && owner.IsVisible)
        {
            win.Owner = owner;
        }

        win.txtTitle.Text = title;
        win.txtMessage.Text = message;
        win.txtHeaderIcon.Text = "✕";
        win.txtIcon.Text = "✕";
        win.txtIcon.Foreground = (SolidColorBrush)new BrushConverter().ConvertFrom("#F87171")!;
        win.pnlIcon.Background = (SolidColorBrush)new BrushConverter().ConvertFrom("#3B181E")!;
        win.btnCancel.Visibility = Visibility.Collapsed;
        win.btnOk.Content = "Đóng";
        win.btnOk.Background = (SolidColorBrush)new BrushConverter().ConvertFrom("#DC2626")!;

        win.ShowDialog();
    }
}

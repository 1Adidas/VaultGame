<div align="center">

# 🎮 GAMEVAULT
### Nền tảng phân phối game kỹ thuật số thế hệ mới
*Đồ án chuyên ngành phát triển ứng dụng web - CDIO 4*

[![Next.js](https://img.shields.io/badge/Next.js-15.x-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-9.0-512BD4?style=for-the-badge&logo=.net&logoColor=white)](https://dotnet.microsoft.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Groq Cloud](https://img.shields.io/badge/Groq_AI-Llama_3.1-orange?style=for-the-badge&logo=openai&logoColor=white)](https://groq.com/)
[![SePay](https://img.shields.io/badge/SePay-VietQR_Payment-blue?style=for-the-badge&logo=checkmarx&logoColor=white)](https://sepay.vn/)
[![Google Drive](https://img.shields.io/badge/Google_Drive-Storage-yellow?style=for-the-badge&logo=googledrive&logoColor=white)](https://www.google.com/drive/)

---

Chào mọi người! 👋 Đây là **GameVault** - Đồ án môn học CDIO 4 của nhóm tụi mình. GameVault là một nền tảng phân phối game bản quyền kỹ thuật số dạng Web App lấy cảm hứng từ Steam, Epic Games và itch.io. Dự án tích hợp các công nghệ hiện đại như Chatbot AI tự dịch ngôn ngữ tự nhiên thành câu lệnh SQL, thanh toán quét mã VietQR tự động điền thông tin, đối soát số dư qua SePay Webhook, bảo mật đăng ký bằng bộ kiểm tra bản ghi DNS MX, và quản lý lưu trữ đám mây qua Google Drive.

[Xem Hướng dẫn chạy Local](#-hướng-dẫn-cài-đặt-và-khởi-chạy-chi-tiết) • [Kịch bản Demo cho Giáo viên](#-kịch-bản-kiểm-thử--demo-toàn-bộ-chức-năng-dành-cho-báo-cáo) • [Cấu hình SePay Webhook](#-cấu-hình-cổng-thanh-toán-sepay-webhook-và-vietqr-thật) • [Cấu hình Google Drive](#-cấu-hình-google-drive-cloud-storage) • [Trợ giúp lỗi thường gặp](#-troubleshooting-sửa-lỗi-thường-gặp)

</div>

---

## 🌟 Các tính năng nổi bật của dự án

### 1. 🤖 Trợ lý ảo AI thông minh (AI Chatbot)
- **Natural Language to SQL:** Chatbot tích hợp **Groq AI (Llama-3.1-8b-instant)** cho phép tìm kiếm game bằng giọng điệu giao tiếp tự nhiên. Ví dụ: *"Kiếm giúp tôi game hành động nào có đánh giá từ 4 sao trở lên"* hoặc *"Có game nào miễn phí chơi thử WebGL không"*.
- **Cơ chế FallbackSQL:** Hệ thống tự động biên dịch câu hỏi thành câu lệnh MySQL hợp lệ để truy vấn trực tiếp cơ sở dữ liệu và hiển thị danh sách game dạng Card trực quan cho người dùng ngay trong khung chat.

### 2. 💳 Cổng thanh toán quét mã VietQR tự động qua SEPAY Webhook
- **VietQR động tự điền:** Khi mua game, hệ thống tự động tạo mã QR ngân hàng chuẩn VietQR thông qua API của `img.vietqr.io`. Mã QR này tự động điền sẵn: **Ngân hàng đích**, **Số tài khoản**, **Tên chủ tài khoản**, **Số tiền** và **Nội dung chuyển khoản (chính là mã đơn hàng `GVXXXXXXXX`)**.
- **Xác thực bảo mật HMAC-SHA256:** Tích hợp SEPAY Webhook chạy qua tunnel `ngrok` ở local. Backend kiểm tra chữ ký HMAC-SHA256 gửi từ SEPAY để xác nhận nguồn gốc giao dịch.
- **Tự nhận diện mã đơn hàng:** Sử dụng Regex bóc tách mã đơn hàng trong nội dung giao dịch kể cả khi người dùng chuyển khoản có kèm thêm ký tự lạ. Hệ thống đối soát số tiền chuyển khoản thực tế với giá đơn hàng để tránh lỗ hổng khai thác trả thiếu tiền.
- **Tự động kích hoạt game:** Khi chuyển khoản thành công, hệ thống tự động cập nhật đơn hàng thành `Paid`, gửi email hóa đơn và lập tức đẩy game vào **Thư viện** của người dùng.

### 3. 📧 Tự động gửi Email hóa đơn qua Resend API
- **Xác nhận mua hàng:** Gửi email hóa đơn HTML chuyên nghiệp kèm game đã mua và giá tiền về email của người dùng ngay khi thanh toán thành công.
- **Thông báo hủy đơn:** Tự động gửi thư thông báo tới người dùng kèm lý do chi tiết từ Admin khi đơn hàng bị từ chối/hủy bỏ.

### 4. 🔒 Bảo mật đăng ký (DNS MX Verification)
- Khi người dùng đăng ký tài khoản mới, hệ thống sử dụng thư viện **DnsClient** để kiểm tra bản ghi **MX (Mail Exchange)** trực tuyến của tên miền email đó.
- Ngăn chặn hoàn toàn việc người dùng sử dụng email ảo không tồn tại (như `test@a.com`, `abc@123.com`) để spam tài khoản.

### 5. ☁️ Lưu trữ đám mây Google Drive & Local Fallback
- **Tải lên & Quản lý tài nguyên đám mây:** Toàn bộ ảnh bìa game, video trailer, tệp cài đặt (ZIP) và demo chơi thử WebGL được tải và lưu trữ trực tiếp lên Google Drive.
- **Cơ chế Local Fallback:** Nếu chưa cấu hình Google Drive hoặc kết nối cloud bị lỗi, hệ thống tự động chuyển sang chế độ dự phòng local, lưu tệp vào thư mục `wwwroot/uploads` của server để đảm bảo dịch vụ không bị gián đoạn.
- **Đồng bộ một chạm (Sync to Drive):** Quản trị viên có thể đồng bộ toàn bộ tệp local đang có sẵn trong `wwwroot/uploads` lên Google Drive và ngược lại với chỉ bằng một nút bấm tại trang quản trị **Admin Dashboard**.

---

## 🏗 Kiến trúc hệ thống

Dự án được triển khai theo mô hình **Clean Architecture** (Kiến trúc sạch) giúp dễ bảo trì, mở rộng và viết Unit Test:

```text
VaultGame (Root)
├── backend (C# .NET 9.0 Web API)
│   ├── src
│   │   ├── GameVault.Domain          # Định nghĩa Entity, Enum (Lớp lõi, không phụ thuộc)
│   │   ├── GameVault.Application     # DTO, Interfaces, Logic nghiệp vụ, Validators
│   │   ├── GameVault.Infrastructure  # Database Context, Migrations, Các dịch vụ ngoài (AI, Email, Payment, Drive)
│   │   └── GameVault.API             # Controllers, Endpoint, Middleware, Cấu hình khởi chạy
│   └── backend.sln
│
├── frontend (Next.js 15.x App Router + Turbopack)
│   ├── src
│   │   ├── app                       # Next.js Routing & Pages (Đa ngôn ngữ vi/en)
│   │   ├── components                # UI Components (AI Chat, Payment Modal, Game Card...)
│   │   ├── hooks                     # React Query Hooks
│   │   └── lib                       # API Client, Auth Store (Zustand)
│   └── .env.local                    # Cấu hình môi trường Frontend
│
├── database                          # Thư mục lưu trữ database thiết kế
│   ├── schema                        # File SQL tạo bảng (Init)
│   └── seeds                         # File SQL nạp dữ liệu mẫu ban đầu
│
├── docs                              # Thư mục tập trung chứa tài liệu & sơ đồ (.drawio, .xml, .md)
│
├── docker-compose.yml                # Docker Compose chạy MySQL container nhanh
└── .gitignore                        # File quy định bỏ qua các file nhạy cảm khi đẩy lên Git
```

---

## 🚀 Hướng dẫn cài đặt và khởi chạy chi tiết (Dành cho mọi đối tượng)

Dự án này đã được tối ưu hóa bằng các script tự động. Chỉ cần thực hiện theo các bước đơn giản dưới đây:

### 📋 Yêu cầu hệ thống trước khi chạy
1. **Docker Desktop** (Bắt buộc phải bật để chạy cơ sở dữ liệu MySQL).
   - Tải về và cài đặt từ trang chủ [Docker Desktop](https://www.docker.com/products/docker-desktop/). Đảm bảo Docker Desktop đã được mở và chạy ngầm (icon Docker ở khay hệ thống hiển thị màu xanh lá).
2. **.NET SDK 9.0** trở lên.
   - Tải về và cài đặt từ [Microsoft .NET SDK 9.0](https://dotnet.microsoft.com/en-us/download/dotnet/9.0).
3. **Node.js 18.x** trở lên.
   - Tải về từ [Node.js](https://nodejs.org/).

---

### 💻 KỊCH BẢN 1: Dành cho người nhận dự án (Máy B - Thầy cô / Bạn cùng lớp clone về chạy)

Khi bạn clone dự án này từ GitHub về máy mới, hãy làm theo đúng 4 bước cực kỳ đơn giản sau:

#### Bước 1: Sao chép các tệp cấu hình bảo mật
Do các tệp chứa khóa bảo mật (API keys) không được đẩy lên GitHub để đảm bảo an toàn, bạn cần tạo thủ công:
1. **Cấu hình Backend:**
   - Tạo file `appsettings.Development.json` nằm tại thư mục `backend/src/GameVault.API/`.
   - Copy nội dung cấu hình thực tế của bạn (bao gồm API Keys của Groq AI, Resend Email, SePay và Google Drive OAuth) dán vào file này. Xem cấu hình mẫu ở [Mục 🔑 Cấu hình file appsettings.Development.json](#-cấu-hình-file-appsettingsdevelopmentjson) phía dưới.
2. **Cấu hình Frontend:**
   - Tạo file `.env.local` nằm tại thư mục `frontend/`.
   - Dán cấu hình cổng Google OAuth và chế độ thanh toán thử nghiệm SePay:
     ```env
     # Google Client ID cho Google Login
     NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID

     # Đặt thành true để tự duyệt thanh toán sau 8 giây (không cần quét QR ngân hàng thật)
     NEXT_PUBLIC_SEPAY_SIMULATE=false
     ```

#### Bước 2: Khởi động Docker Desktop
- Hãy chắc chắn rằng phần mềm **Docker Desktop** đã được mở và đang chạy.

#### Bước 3: Chạy script tự động thiết lập cơ sở dữ liệu
Mở một cửa sổ PowerShell mới tại thư mục gốc của dự án (`VaultGame/`) và chạy lệnh sau:
```powershell
./pull_db.ps1
```
* **Script này sẽ tự động làm gì?**
  - Dọn dẹp sạch sẽ các container và Volume cũ (nếu có) để tránh xung đột dữ liệu.
  - Tự động tải và chạy MySQL container mới qua Docker.
  - Tự động nạp toàn bộ cấu trúc bảng (Schema) và toàn bộ dữ liệu mẫu mới nhất (Seed) được đồng bộ từ Máy A sang.
  - Tự động kiểm tra và báo khi cơ sở dữ liệu đã sẵn sàng 100%.

#### Bước 4: Khởi chạy dự án và trải nghiệm
Vẫn ở cửa sổ PowerShell đó, chạy lệnh sau để khởi chạy cả Backend và Frontend cùng lúc:
```powershell
./run.ps1
```
- Mở trình duyệt web của bạn và truy cập: `http://localhost:3000/vi`
- **Tận hưởng**: Toàn bộ dữ liệu game (Hitman 3, Racer, Survival...), ảnh bìa, video trailer, game file, avatar người dùng và chatbot đã được đồng bộ sẵn cục bộ (do thư mục `uploads/` đã được lưu trữ trong Git). Bạn có thể chơi thử game WebGL Demo, xem trailer và trò chuyện với trợ lý AI ngay lập tức mà không cần bấm thêm bất cứ nút đồng bộ nào!

---

### 💻 KỊCH BẢN 2: Dành cho người phát triển dự án (Máy A - Khi muốn đóng gói dữ liệu đẩy lên Git)

Khi bạn (Quản trị viên/Máy A) đã sửa đổi dữ liệu (tạo thêm game mới, thêm ảnh, thêm tài khoản...) và muốn đóng gói lại để Máy B tải về không bị lỗi hiển thị hay thiếu hụt dữ liệu:

#### Bước 1: Chạy script đóng gói dữ liệu
Đảm bảo Docker MySQL đang chạy, mở PowerShell ở thư mục gốc của dự án và chạy:
```powershell
./push_db.ps1
```
* **Script này sẽ tự động làm gì?**
  - Kết nối vào Docker MySQL và tự động xuất toàn bộ cấu trúc cơ sở dữ liệu mới nhất lưu vào `./database/schema/001_init.sql`.
  - Tự động xuất toàn bộ các bản ghi dữ liệu mẫu mới nhất lưu vào `./database/seeds/002_seed_data.sql`.
  - Thông báo hoàn tất đóng gói dữ liệu.

#### Bước 2: Đẩy lên Git thủ công
Sau khi script báo đóng gói thành công, chạy các lệnh Git sau để đẩy lên GitHub:
```bash
git add .
git commit -m "sync: cập nhật mã nguồn và dữ liệu database mới nhất"
git push origin main
```

---

### 🔑 Cấu hình file `appsettings.Development.json`
Nội dung mẫu chuẩn để copy vào file `backend/src/GameVault.API/appsettings.Development.json`:
```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Information"
    }
  },
  "Groq": {
    "Model": "llama-3.1-8b-instant",
    "ApiKeys": [
      "gsk_your_groq_api_key_1",
      "gsk_your_groq_api_key_2"
    ]
  },
  "Resend": {
    "ApiKey": "re_your_resend_api_key",
    "FromEmail": "onboarding@resend.dev",
    "FromName": "GameVault"
  },
  "SePay": {
    "WebhookSecret": "mat_khau_webhook_tu_dat_cua_ban",
    "BankCode": "your_bank_code",
    "AccountNumber": "your_bank_account_number",
    "AccountName": "YOUR BANK ACCOUNT NAME",
    "PaymentExpiryMinutes": "15"
  },
  "GoogleDrive": {
    "ServiceAccountJsonBase64": "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIKfQ==",
    "client_email": "gamevault-drive-uploader@gamevault-500501.iam.gserviceaccount.com",
    "client_id": "103757946439088075199",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/gamevault-drive-uploader%40gamevault-500501.iam.gserviceaccount.com",
    "universe_domain": "googleapis.com",
    "RootFolderId": "1HJa4N6DId6rWLIOEo6E8Qq1vqFgXi-nB",
    "UseLocalFallback": false,
    "OAuth": {
      "ClientId": "YOUR_OAUTH_CLIENT_ID",
      "ClientSecret": "YOUR_OAUTH_CLIENT_SECRET",
      "RefreshToken": "YOUR_OAUTH_REFRESH_TOKEN"
    }
  },
  "Authentication": {
    "Google": {
      "ClientId": "Your_Google_Client_Id"
    }
  }
}
```

---

## 🎯 Kịch bản kiểm thử & Demo toàn bộ chức năng (Dành cho báo cáo)

Để chứng minh phần mềm hoạt động chuẩn mực và thuyết phục, thực hiện demo theo kịch bản chi tiết dưới đây:

| STT | Tính năng kiểm thử | Thao tác thực hiện | Kết quả kỳ vọng (Thuyết trình) |
| :--- | :--- | :--- | :--- |
| **1** | **Trợ lý ảo AI thông minh** *(Natural Language to SQL)* | 1. Nhấp biểu tượng Chatbot AI ở góc dưới bên phải màn hình.<br>2. Nhập câu hỏi tự nhiên: `"Kiếm giúp mình game đua xe có đánh giá từ 4 sao trở lên"` hoặc `"Có game nào miễn phí chơi thử WebGL không?"` | - Chatbot trả về lời thoại chào mừng.<br>- Tự dịch câu chat thành SQL MySQL chuẩn xác, thực thi và xuất ra danh sách Card Game tương ứng ngay trong khung chat để người dùng click xem. |
| **2** | **Thanh toán VietQR & Webhook** *(Tự động kích hoạt game)* | 1. Chọn mua một game bất kỳ (ví dụ: *Racer*), nhấp **Thanh toán**.<br>2. Giao diện xuất hiện mã QR ngân hàng động.<br>3. **Chạy thử nhanh:** Bật `NEXT_PUBLIC_SEPAY_SIMULATE=true` ở file `.env.local` -> Đợi 8 giây hệ thống tự động báo thành công.<br>4. **Chạy thử thật:** Chuyển khoản thật vào mã QR đó bằng ứng dụng ngân hàng khi SePay chạy qua `ngrok` (Test Mode). | - Mã QR hiển thị đúng số tiền, số tài khoản nhận tiền và nội dung chuyển khoản là mã đơn hàng `GVXXXXXXXX`.<br>- Sau khi thanh toán thành công, giao diện tự đóng và thông báo mua game thành công.<br>- Game được kích hoạt tự động đưa vào **Thư viện** của người dùng. |
| **3** | **Email xác nhận & hóa đơn** *(Resend API)* | 1. Thực hiện thanh toán thành công ở bước 2.<br>2. Hoặc: Đăng nhập Admin (`admin@gamevault.com`/`password`), vào tab **Đơn hàng**, chọn một đơn nhấp **Hủy đơn** và điền lý do hủy. | - Ngay khi thanh toán thành công, một email hóa đơn định dạng HTML chuyên nghiệp được gửi về hòm thư người dùng.<br>- Khi Admin hủy đơn hàng, người dùng nhận được email thông báo thu hồi game kèm lý do chi tiết. |
| **4** | **Chơi thử WebGL Demo trực tiếp** *(Unity WebGL Player)* | 1. Vào trang chi tiết của game có bản chơi thử (ví dụ: *Survival On Earth* hoặc *Boomerang Aventure*).<br>2. Nhấp nút **Chơi thử (WebGL Demo)**. | - Trình phát Unity WebGL trực tiếp load trên trình duyệt web của bạn và chạy game bình thường mà không cần cài đặt thêm plugin nào. |
| **5** | **Đồng bộ đám mây một chạm** *(Google Drive Storage)* | 1. Đăng nhập tài khoản Admin, đi tới trang quản trị `/admin` (Tab **Tổng quan**).<br>2. Bấm nút **`Đồng bộ wwwroot lên Drive`** ở thẻ *Thao Tác & Đồng Bộ*. | - Hệ thống quét toàn bộ ảnh bìa, tệp cài đặt và WebGL Demo dưới local `wwwroot/uploads` đẩy lên Google Drive.<br>- Tự nén file demo thành zip nếu mất file gốc.<br>- Bản ghi database tự chuyển sang liên kết Google Drive, giải phóng bộ nhớ server local. |
| **6** | **Bảo mật Đăng ký** *(DNS MX Verification)* | 1. Vào trang Đăng ký tài khoản mới.<br>2. Nhập một email ảo không tồn tại (Ví dụ: `test@abcdefg.com`).<br>3. Nhập một email thật (Ví dụ: `nguyenvana@gmail.com`). | - Email ảo: Hệ thống báo lỗi *"Tên miền email không tồn tại hoặc không hỗ trợ nhận thư (Lỗi bản ghi MX)"*.<br>- Email thật: Đăng ký thành công, thông tin được ghi vào database. |

---

## 🔌 Cấu hình cổng thanh toán SePay Webhook và VietQR thật

Để kiểm thử quy trình nhận tiền từ tài khoản ngân hàng thật và tự động kích hoạt game:

1. **Khởi chạy ngrok tạo đường hầm:**
   ```bash
   ngrok http 5000
   ```
2. **Thiết lập trên SePay Dashboard:**
   - Chọn **Thêm Webhook** mới với cấu hình:
     - **URL nhận Webhook:** `https://<MÃ_NGROK_CỦA_BẠN>.ngrok-free.app/api/v1/webhooks/sepay`
     - **Phương thức xác thực:** Chọn **`HMAC-SHA256`**.
     - **Mã bí mật (Secret Key):** Nhập đúng mã `SePay:WebhookSecret` bạn đã đặt trong file `appsettings.Development.json`.

---

## 🛠 Troubleshooting (Sửa lỗi thường gặp)

### 1. Lỗi khóa tệp tin khi chạy `dotnet watch` (Mã lỗi CS2012)
Mở PowerShell (Admin) và chạy lệnh sau để giải phóng file bị khóa:
```powershell
Stop-Process -Name GameVault.API, VBCSCompiler, msbuild -Force -ErrorAction SilentlyContinue
```

### 2. Các tệp tin bảo mật cần tránh đẩy lên Git
Đảm bảo các tệp tin chứa thông tin nhạy cảm sau đây đã nằm trong file `.gitignore` và không được đẩy lên GitHub công khai:
* `backend/src/GameVault.API/appsettings.Development.json` (Chứa API key thật)
* `frontend/.env.local` (Chứa thông tin cấu hình Frontend local)

---

## 👥 Thành viên nhóm thực hiện
Đồ án môn học CDIO 4 được thiết kế và triển khai bởi tập thể nhóm sinh viên ngành Kỹ thuật phần mềm. 
Rất cảm ơn các thầy cô giáo bộ môn đã hướng dẫn nhóm hoàn thành dự án này!

*Chúc các bạn chạy thử dự án thành công!* ❤️

<div align="center">

# 🎮 GAMEVAULT
### Nền tảng phân phối game kỹ thuật số thế hệ mới
*Đồ án chuyên ngành phát triển ứng dụng web - COTS / CS 445*

[![Next.js](https://img.shields.io/badge/Next.js-15.x-black?style=for-the-badge&logo=next.js&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.x-blue?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![ASP.NET Core](https://img.shields.io/badge/ASP.NET_Core-9.0-512BD4?style=for-the-badge&logo=.net&logoColor=white)](https://dotnet.microsoft.com/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=for-the-badge&logo=mysql&logoColor=white)](https://www.mysql.com/)
[![Groq Cloud](https://img.shields.io/badge/Groq_AI-Llama_3.1-orange?style=for-the-badge&logo=openai&logoColor=white)](https://groq.com/)
[![SePay](https://img.shields.io/badge/SePay-VietQR_Payment-blue?style=for-the-badge&logo=checkmarx&logoColor=white)](https://sepay.vn/)
[![Google Drive](https://img.shields.io/badge/Google_Drive-Storage-yellow?style=for-the-badge&logo=googledrive&logoColor=white)](https://www.google.com/drive/)

---

Chào mừng bạn đến với **GameVault**! Đây là nền tảng phân phối game kỹ thuật số dạng Web App lấy cảm hứng từ Steam, Epic Games và itch.io. Hệ thống được trang bị đầy đủ các tính năng hiện đại: **Trợ lý ảo AI Vault Oracle tự động dịch ngôn ngữ tự nhiên thành câu lệnh SQL**, **Thanh toán quét mã VietQR tự động khớp giao dịch qua Webhook**, **Chơi thử bản WebGL Demo trực tiếp trên trình duyệt**, **Bảo vệ đăng ký bằng DNS MX Verification**, và **Hệ thống lưu trữ đám mây Google Drive tích hợp cơ chế chịu lỗi Local Fallback**.

</div>

---

## 📑 Mục lục
1. [Yêu cầu phần mềm trên máy tính mới](#-1-yêu-cầu-phần-mềm-cần-cài-đặt-trước)
2. [Cấu trúc thư mục dự án](#-2-cấu-trúc-thư-mục-dự-án)
3. [Hướng dẫn cài đặt & Khởi chạy từ A - Z (Cho máy mới)](#-3-hướng-dẫn-cài-đặt--khởi-chạy-chi-tiết-từ-a---z)
   - [Cách 1: Khởi động 1-Click bằng Script (Khuyên dùng)](#cách-1-khởi-động-siêu-tốc-bằng-script-1-click-khuyên-dùng)
   - [Cách 2: Khởi động thủ công theo từng bước](#cách-2-khởi-động-thủ-công-theo-từng-bước)
4. [Tài khoản kiểm thử mặc định](#-4-danh-sách-tài-khoản-mặc-định-sẵn-có)
5. [Kịch bản kiểm thử toàn bộ 100% tính năng](#-5-kịch-bản-kiểm-thử-đầy-đủ-100-chức-năng)
6. [Cấu hình Cổng thanh toán SePay Webhook thật](#-6-hướng-dẫn-cấu-hình-thanh-toán-thật-sepay--ngrok)
7. [Khắc phục sự cố thường gặp (Troubleshooting)](#-7-khắc-phục-sự-cố-thường-gặp-troubleshooting)

---

## 💻 1. Yêu cầu phần mềm cần cài đặt trước

Trước khi bắt đầu cài đặt GameVault, hãy đảm bảo máy tính của bạn đã được cài đặt các công cụ sau:

1. **Git**: Tải từ [git-scm.com](https://git-scm.com/downloads) (Dùng để clone dự án).
2. **Docker Desktop** *(Bắt buộc)*: Tải từ [docker.com](https://www.docker.com/products/docker-desktop/).
   > [!IMPORTANT]
   > Sau khi cài đặt, hãy **mở Docker Desktop lên** và đợi biểu tượng ở góc trái dưới chuyển sang màu xanh lá (*Engine running*).
3. **.NET SDK 9.0** trở lên: Tải từ [dotnet.microsoft.com](https://dotnet.microsoft.com/en-us/download/dotnet/9.0).
   - Kiểm tra bằng lệnh: `dotnet --version` (Kết quả trả về `9.x.x`).
4. **Node.js (LTS 18.x, 20.x hoặc 22.x)**: Tải từ [nodejs.org](https://nodejs.org/).
   - Kiểm tra bằng lệnh: `node -v` và `npm -v`.

---

## 🏗 2. Cấu trúc thư mục dự án

```text
VaultGame/
├── backend/                              # Backend ASP.NET Core 9.0 Web API
│   ├── src/
│   │   ├── GameVault.Domain/             # Thực thể (Entities), Enums lõi
│   │   ├── GameVault.Application/        # DTOs, Business Logic, Dịch vụ nội bộ
│   │   ├── GameVault.Infrastructure/     # EF Core MySQL, AI Groq, Drive, SePay, Resend
│   │   └── GameVault.API/                # REST Controllers, JWT Auth, wwwroot/uploads
│   └── GameVault.sln
│
├── frontend/                             # Frontend Next.js 15 (App Router + Turbopack)
│   ├── public/download/                  # Tệp GameVault-Launcher.exe đóng gói sẵn
│   ├── src/
│   │   ├── app/[locale]/                 # Routing đa ngôn ngữ (vi / en / zh)
│   │   │   ├── admin/                    # Trang quản trị dành cho Admin
│   │   │   ├── game/[slug]/              # Chi tiết game & Chơi thử WebGL Demo
│   │   │   ├── library/                  # Thư viện game cá nhân sau khi mua
│   │   │   └── ...
│   │   ├── components/                   # UI components (Vault Oracle, Modal, Game Card...)
│   │   └── lib/                          # Axios Client, Auth Store (Zustand)
│   ├── .env.example                      # File mẫu biến môi trường Frontend
│   └── package.json
│
├── launcher/                             # GameVault Desktop Launcher (.NET 9 WPF + DRM)
│   ├── Services/                         # ApiService, GameManagerService, StorageService
│   ├── Resources/GameVault_DRM/          # Mã nguồn DRM kiểm tra tiến trình Launcher
│   └── GameVault.Launcher.csproj
│
├── database/                             # Kịch bản cơ sở dữ liệu
│   ├── schema/001_init.sql               # File DDL tạo toàn bộ bảng và quan hệ mới nhất
│   └── seeds/002_seed_data.sql           # File nạp dữ liệu mẫu mới nhất (Game, User, Review...)
│
├── pull_db.ps1                           # Script 1-Click: Tự động khởi động DB & nạp dữ liệu mẫu
├── push_db.ps1                           # Script đóng gói dữ liệu DB mới nhất lên schema & seed
├── run.ps1                               # Script 1-Click: Khởi chạy Backend & Frontend (hỗ trợ Ngrok)
├── run_all.ps1                           # Script 1-Click: Khởi chạy Docker DB + Backend + Frontend + Launcher
├── run_launcher.ps1                      # Script 1-Click: Build và chạy GameVault Launcher (.exe)
├── docker-compose.yml                    # Cấu hình MySQL 8.0 Container
└── README.md                             # Hướng dẫn chi tiết này
```

---

## 🚀 3. Hướng dẫn cài đặt & Khởi chạy chi tiết từ A - Z

### Tải mã nguồn về máy
Mở **PowerShell** hoặc **Terminal** và điều hướng đến thư mục làm việc của bạn:
```bash
git clone https://github.com/1Adidas/VaultGame.git
cd VaultGame
```

---

### Cách 1: Khởi động siêu tốc bằng Script (1-Click - Khuyên dùng)

Nếu bạn sử dụng **Windows** và muốn chạy ngay lập tức mà không cần gõ nhiều lệnh:

1. **Khởi tạo Database tự động**:
   Mở PowerShell tại thư mục `VaultGame` và chạy:
   ```powershell
   .\pull_db.ps1
   ```
   *Script sẽ tự động dọn sạch volume cũ, kích hoạt container MySQL 8.0 và nạp 100% dữ liệu mẫu mới nhất.*

2. **Cấu hình file môi trường Frontend**:
   Chỉ cần copy file mẫu `.env.example`:
   ```powershell
   Copy-Item frontend\.env.example frontend\.env.local
   ```

3. **Khởi chạy đồng thời cả hệ thống**:
   - **Chỉ Web (Backend + Frontend, có tùy chọn Ngrok)**:
     ```powershell
     .\run.ps1
     ```
   - **Toàn bộ hệ thống (MySQL + Backend + Frontend + Desktop Launcher)**:
     ```powershell
     .\run_all.ps1
     ```
   - **Chỉ chạy Desktop Launcher**:
     ```powershell
     .\run_launcher.ps1
     ```
   *Mở trình duyệt truy cập `http://localhost:3000/vi`. Khi tải game qua Desktop Launcher, người dùng chọn thư mục/ổ đĩa đích trên hộp thoại (mặc định gợi ý `D:\` hoặc `%LocalAppData%\GameVault\Games`), game sẽ được giải nén vào `<Thư_mục_đã_chọn>\<slug-game>\`.*

---

### Cách 2: Khởi động thủ công theo từng bước

Nếu bạn muốn kiểm soát từng bước hoặc chạy trên macOS / Linux:

#### Bước 1: Cấu hình biến môi trường
1. **Frontend**: Sao chép file mẫu:
   ```bash
   cp frontend/.env.example frontend/.env.local
   ```
2. **Backend**: Tệp `backend/src/GameVault.API/appsettings.json` đã được cấu hình sẵn với `"UseLocalFallback": true` và kết nối MySQL Docker (port 3307), có thể chạy được ngay.
   *(Tùy chọn)* Nếu bạn muốn ghi đè API keys riêng (Groq, Resend...), bạn có thể tạo `backend/src/GameVault.API/appsettings.Development.json`:

```json
{
  "Logging": {
    "LogLevel": {
      "Default": "Information",
      "Microsoft.AspNetCore": "Warning",
      "Microsoft.EntityFrameworkCore": "Warning"
    }
  },
  "AllowedHosts": "*",
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3307;Database=gamevault;User=gamevault;Password=gamevault123;"
  },
  "JWT": {
    "Secret": "GameVault_2026_Super_Secret_Key_At_Least_32_Characters_Long",
    "Issuer": "GameVault",
    "Audience": "GameVault",
    "AccessTokenExpirationMinutes": "60",
    "RefreshTokenExpirationDays": "7"
  },
  "Groq": {
    "Model": "llama-3.1-8b-instant",
    "ApiKeys": [
      "gsk_your_groq_api_key_here"
    ]
  },
  "Resend": {
    "ApiKey": "re_your_resend_api_key_here",
    "FromEmail": "onboarding@resend.dev",
    "FromName": "GameVault"
  },
  "SePay": {
    "WebhookSecret": "gamevault_sepay_webhook_secret_key",
    "BankCode": "970422",
    "AccountNumber": "0123456789",
    "AccountName": "GAMEVAULT STORE",
    "PaymentExpiryMinutes": "15"
  },
  "GoogleDrive": {
    "RootFolderId": "YOUR_GOOGLE_DRIVE_FOLDER_ID",
    "UseLocalFallback": true,
    "OAuth": {
      "ClientId": "YOUR_OAUTH_CLIENT_ID",
      "ClientSecret": "YOUR_OAUTH_CLIENT_SECRET",
      "RefreshToken": "YOUR_OAUTH_REFRESH_TOKEN"
    }
  },
  "Authentication": {
    "Google": {
      "ClientId": "YOUR_GOOGLE_CLIENT_ID"
    }
  },
  "CORS": {
    "AllowedOrigins": "http://localhost:3000"
  }
}
```

> [!TIP]
> - Nếu bạn **chưa có Google Drive API**: Hệ thống đã bật sẵn `"UseLocalFallback": true`. Toàn bộ ảnh bìa, tệp cài đặt và WebGL Demo có sẵn trong thư mục `wwwroot/uploads` sẽ được đọc cục bộ và hoạt động 100% bình thường.
> - Nếu bạn **chưa có Groq API Key**: Bạn có thể đăng ký tài khoản miễn phí tại [console.groq.com](https://console.groq.com/) và lấy API Key trong 1 phút.

#### 2. Tạo tệp cấu hình Frontend: `frontend/.env.local`
Tạo file mới tại đường dẫn `frontend/.env.local` và dán nội dung sau:

```env
# URL trỏ đến Backend Web API
NEXT_PUBLIC_API_URL=http://localhost:5000

# Google OAuth Client ID (Dùng cho tính năng Đăng nhập bằng Google)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID

# Chế độ giả lập thanh toán SePay:
# Đặt 'true' để hệ thống tự động duyệt thanh toán thành công sau 8 giây (tiện lợi cho việc kiểm thử/chấm điểm nhanh)
# Đặt 'false' nếu muốn chuyển khoản ngân hàng thật qua mã VietQR
NEXT_PUBLIC_SEPAY_SIMULATE=true
```

---

### Bước 3: Khởi chạy Cơ sở dữ liệu MySQL bằng Docker

Dự án sử dụng Docker Compose để tạo container MySQL 8.0, đồng thời tự động nạp toàn bộ cấu trúc bảng và dữ liệu mẫu.

1. Đảm bảo **Docker Desktop đang chạy**.
2. Mở cửa sổ Terminal tại thư mục `VaultGame/` và thực thi:

```bash
# 1. Dọn dẹp container và volume cũ (nếu có)
docker compose down -v

# 2. Khởi tạo container và tự động nạp Schema & Seed data
docker compose up -d
```

3. **Kiểm tra trạng thái sẵn sàng**:
```bash
docker ps
```
Bạn sẽ thấy container `gamevault-mysql` hiển thị trạng thái `Up` và cổng `0.0.0.0:3307->3306/tcp`.
Cơ sở dữ liệu đã nạp sẵn danh sách game (ShootV1, ShootV2, Survival On Earth, Boomerang Aventure, Racer...), thể loại, tài khoản Admin và Customer.

---

### Bước 4: Cài đặt và Khởi chạy Backend (C# .NET 9.0)

1. Mở một cửa sổ Terminal mới và di chuyển vào thư mục API:
```bash
cd backend/src/GameVault.API
```

2. Tải các gói thư viện phụ thuộc:
```bash
dotnet restore
```

3. Khởi chạy Backend Server:
```bash
dotnet run
```
*(Hoặc dùng lệnh `dotnet watch run` để tự động reload khi sửa code).*

4. Khi Terminal xuất hiện dòng thông báo:
```text
info: Microsoft.Hosting.Lifetime[14]
      Now listening on: http://0.0.0.0:5000
```
👉 Backend đã sẵn sàng tại địa chỉ: **`http://localhost:5000`**.

---

### Bước 5: Cài đặt và Khởi chạy Frontend (Next.js 15)

1. Mở thêm một cửa sổ Terminal khác và di chuyển vào thư mục Frontend:
```bash
cd frontend
```

2. Cài đặt toàn bộ dependencies (chỉ cần chạy lần đầu):
```bash
npm install
```

3. Khởi chạy máy chủ phát triển Next.js:
```bash
npm run dev
```

4. Khi màn hình hiển thị:
```text
▲ Next.js 15.x.x (Turbopack)
- Local:        http://localhost:3000
```
👉 Mở trình duyệt web của bạn và truy cập: **`http://localhost:3000`** (Hệ thống sẽ tự động chuyển hướng về giao diện tiếng Việt: `http://localhost:3000/vi`).

---

## 🔑 4. Danh sách tài khoản mặc định sẵn có

Cơ sở dữ liệu đã chuẩn bị sẵn 2 tài khoản mẫu phục vụ cho việc kiểm thử mọi quyền hạn:

| Vai trò | Email đăng nhập | Mật khẩu mặc định | Quyền hạn nổi bật |
| :--- | :--- | :--- | :--- |
| **Quản trị viên (Admin)** | `admin@gamevault.com` | `password` | Quản trị toàn hệ thống, thêm/sửa/xóa game, upload file game, duyệt/hủy đơn hàng, xem báo cáo doanh thu, đồng bộ Drive. |
| **Khách hàng (Customer)** | `customer@example.com` | `password` | Mua game, thanh toán QR, sở hữu game trong Thư viện, chơi WebGL Demo, đánh giá game, trò chuyện cùng AI Chatbot. |

---

## 🎯 5. Kịch bản kiểm thử đầy đủ 100% chức năng

Dưới đây là kịch bản chi tiết từng bước để kiểm thử toàn diện mọi tính năng của hệ thống:

### 1. Trải nghiệm Duyệt Store & Chơi thử WebGL Demo trực tiếp
1. Truy cập `http://localhost:3000`.
2. Tại trang chủ hoặc trang **Cửa hàng (`/games`)**, chọn tựa game **Survival On Earth** hoặc **Boomerang Aventure**.
3. Tại trang chi tiết game, nhấp nút **"Chơi thử (WebGL Demo)"**.
4. **Kết quả kỳ vọng**: Trình phát Unity WebGL nhúng trực tiếp trên trình duyệt sẽ khởi động và cho phép bạn chơi game ngay lập tức mà không cần cài đặt thêm phần mềm nào.

---

### 2. Mua game & Thanh toán VietQR tự động
1. Đăng nhập tài khoản `customer@example.com` / `password`.
2. Chọn mua tựa game bất kỳ (Ví dụ: *ShootV1* hoặc *The Eternal Reef 3D*), nhấn nút **"Mua ngay"**.
3. Modal thanh toán hiện ra kèm mã **VietQR ngân hàng** với nội dung chuyển khoản là mã đơn hàng `GVXXXXXXXX`.
4. **Kiểm thử nhanh (Mô phỏng):** Do file `.env.local` đã bật `NEXT_PUBLIC_SEPAY_SIMULATE=true`, sau **8 giây**, hệ thống tự động giả lập tín hiệu chuyển khoản thành công.
5. **Kết quả kỳ vọng**:
   - Màn hình thông báo thanh toán thành công.
   - Tự động chuyển hướng về trang **Thư viện (`/library`)**.
   - Game vừa mua lập tức xuất hiện trong thư viện với nút **"Tải về"**.

---

### 3. Tải tệp cài đặt game (Game ZIP Download)
1. Trong trang **Thư viện cá nhân (`/library`)**, nhấp vào nút **"Tải về"** tại game bạn đã sở hữu.
2. **Kết quả kỳ vọng**: Trình duyệt kích hoạt tải tệp tin cài đặt của game (được phục vụ thông qua Local Storage fallback hoặc Google Drive link an toàn).

---

### 4. Trò chuyện & Tìm game bằng Trợ lý ảo AI (Vault Oracle - Groq Llama-3.1)
1. Nhấp vào thanh dock nổi **Vault Oracle** ở góc dưới bên phải màn hình tại bất kỳ trang nào.
2. Gõ câu hỏi bằng ngôn ngữ tự nhiên:
   - *"Kiếm giúp tôi các game hành động có đánh giá cao"*
   - *"Có game nào miễn phí chơi thử không?"*
   - *"Game của nhà phát triển Tân Khương Vỹ"*
3. **Kết quả kỳ vọng**:
   - AI phân tích câu hỏi, tự sinh truy vấn MySQL hợp lệ (Natural Language to SQL).
   - Chatbot phản hồi bằng văn bản tự nhiên kèm theo **các Card Game trực quan** (ảnh bìa, giá, đánh giá) ngay trong khung chat để người dùng nhấp vào xem.

---

### 5. Viết đánh giá & Bình luận (Reviews & Ratings)
1. Vào trang chi tiết của một game bạn đã sở hữu trong Thư viện.
2. Cuộn xuống phần **Đánh giá của cộng đồng**, chọn số sao (1 đến 5 sao) và nhập nhận xét.
3. Nhấn **Gửi đánh giá**.
4. **Kết quả kỳ vọng**: Đánh giá hiển thị ngay lập tức, điểm trung bình của game được cập nhật theo thời gian thực.

---

### 6. Thử nghiệm Cơ chế Bảo mật Đăng ký (DNS MX Verification)
1. Đăng xuất tài khoản hiện tại, vào trang **Đăng ký (`/register`)**.
2. **Trường hợp 1 (Email ảo):** Nhập email bừa bãi không tồn tại (Ví dụ: `admin@fakemaildomain123456.com`).
   - *Kết quả*: Hệ thống kiểm tra DNS MX trực tuyến và chặn lại: *"Tên miền email không tồn tại hoặc không hỗ trợ nhận thư"*.
3. **Trường hợp 2 (Email thật):** Nhập email có đuôi `@gmail.com` thật.
   - *Kết quả*: Đăng ký thành công và tự động chuyển về trang đăng nhập.

---

### 7. Bảng điều khiển Quản trị viên (Admin Dashboard)
1. Đăng nhập tài khoản `admin@gamevault.com` / `password`.
2. Truy cập trang **Quản trị (`/admin`)**:
   - **Tab Tổng quan**: Xem tổng doanh thu, số lượng thành viên, tổng số game và số đơn hàng.
   - **Tab Quản lý Game**: Thêm tựa game mới, chỉnh sửa giá tiền, cập nhật trạng thái *Published / Draft*, tải lên ảnh bìa và file game.
   - **Tab Đơn hàng**: Xem danh sách giao dịch, thực hiện **Hủy đơn hàng** kèm lý do (hệ thống sẽ tự động thu hồi quyền sở hữu game và gửi email thông báo qua Resend API).
   - **Tab Đồng bộ đám mây**: Bấm nút **"Đồng bộ wwwroot lên Drive"** để tự động đẩy media local lên Google Drive Cloud.

---

## 🔌 6. Hướng dẫn cấu hình thanh toán thật (SePay + ngrok)

Nếu bạn muốn trình diễn quét mã QR từ app ngân hàng thật trên điện thoại và nhận tiền thật:

1. **Khởi chạy đường hầm ngrok trỏ vào cổng Backend:**
   ```bash
   ngrok http 5000
   ```
2. **Cấu hình trên SePay Dashboard (my.sepay.vn):**
   - Vào mục **Tích hợp Webhook** -> **Thêm Webhook**.
   - **URL nhận Webhook:** `https://<DIA_CHI_NGROK_CỦA_BẠN>.ngrok-free.app/api/v1/webhooks/sepay`
   - **Kiểu xác thực:** Chọn `HMAC-SHA256`.
   - **Mã bí mật (Secret):** Nhập chuỗi giống hệt giá trị `SePay:WebhookSecret` trong `appsettings.Development.json`.
3. **Cấu hình Frontend:**
   - Trong `frontend/.env.local`, đổi thành: `NEXT_PUBLIC_SEPAY_SIMULATE=false`.
4. **Trải nghiệm:** Mua game trên web -> Quét mã VietQR bằng app ngân hàng -> Tiền về tài khoản -> SePay gọi webhook về Backend -> Game tự động mở khóa trong tích tắc!

---

## 🛠 7. Khắc phục sự cố thường gặp (Troubleshooting)

### ❓ 1. Cổng 3307 bị chiếm dụng khi bật Docker
* **Nguyên nhân**: Máy bạn đang có dịch vụ MySQL khác chạy cổng 3307.
* **Cách khắc phục**: Mở file `docker-compose.yml`, sửa dòng `3307:3306` thành cổng khác (ví dụ: `3308:3306`). Sau đó cập nhật dòng `"Server=localhost;Port=3308;..."` trong `appsettings.Development.json`.

### ❓ 2. Lỗi khóa tệp build khi chạy `dotnet run` (CS2012)
* **Khắc phục**: Mở PowerShell và chạy lệnh sau để đóng tiến trình đang chiếm file:
  ```powershell
  Stop-Process -Name GameVault.API, VBCSCompiler, msbuild -Force -ErrorAction SilentlyContinue
  ```

### ❓ 3. Muốn làm mới lại toàn bộ dữ liệu mẫu ban đầu (Reset Database)
* **Khắc phục**: Chạy 2 lệnh sau ở thư mục `VaultGame/`:
  ```bash
  docker compose down -v
  docker compose up -d
  ```
  *(Dữ liệu mẫu chuẩn từ `001_init.sql` và `002_seed_data.sql` sẽ được nạp lại mới tinh 100%).*

---

<div align="center">

### Chúc bạn cài đặt và chạy thử dự án GameVault thành công! 🎉
*Nếu có bất kỳ thắc mắc nào trong quá trình kiểm thử, vui lòng liên hệ nhóm phát triển để được hỗ trợ nhanh nhất.*

</div>

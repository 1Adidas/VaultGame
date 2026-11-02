# HƯỚNG DẪN: TÍNH NĂNG DEMO ROLE SWITCHER (XEM TRƯỚC VAI TRÒ GIAO DIỆN)

> **Mục đích:** Tính năng này tạo một thanh công cụ nổi nhỏ ở góc dưới màn hình (`ROLE PREVIEW`) giúp người thiết kế UI/UX hoặc bạn bè có thể chuyển đổi nhanh qua lại giữa 3 vai trò:
> - **Khách (Guest)**: Chưa đăng nhập, hiển thị nút Đăng nhập / Đăng ký trên Navbar, ẩn các menu cá nhân.
> - **Người dùng (User)**: Giả lập tài khoản Gamer với đầy đủ Avatar, Thông báo, Thư viện game (`/library`), Danh sách ước (`/wishlist`), Lịch sử đơn hàng (`/orders`).
> - **Admin**: Giả lập tài khoản Root Admin với huy hiệu Admin Console và mở khóa toàn bộ trang Quản trị (`/admin`).
>
> *(Không yêu cầu bật Backend hay Database, tự động lưu lựa chọn khi F5 tải lại trang)*.

---

## 1. Danh Sách Các File Đã Thay Đổi

Chỉ có đúng **2 vị trí** liên quan đến tính năng này:

1. **File tạo mới:**
   - [`frontend/src/components/demo/DemoRoleSwitcher.tsx`](./frontend/src/components/demo/DemoRoleSwitcher.tsx)
   *(Chứa toàn bộ component giao diện nút chuyển đổi vai trò)*

2. **File chỉnh sửa:**
   - [`frontend/src/components/layout/AppShell.tsx`](./frontend/src/components/layout/AppShell.tsx)
   *(Chỉ thêm 2 dòng code: import component và đặt thẻ `<DemoRoleSwitcher />`)*

---

## 2. Hướng Dẫn Cách Xóa Sạch Hoàn Toàn (Khi Không Cần Nữa)

Khi bạn đã kết nối Backend thật hoặc muốn đưa web vào giai đoạn triển khai chính thức, bạn chỉ cần thực hiện 2 bước đơn giản sau:

### Bước 1: Mở file `frontend/src/components/layout/AppShell.tsx`
Xóa 2 dòng code sau:
1. Dòng import ở đầu file:
   ```tsx
   import { DemoRoleSwitcher } from "@/components/demo/DemoRoleSwitcher";
   ```
2. Thẻ gọi component ở cuối:
   ```tsx
   {/* 4. Demo Role Switcher (Chế độ xem trước vai trò cho Designer - xem DEMO_ROLE_SWITCHER.md để xóa) */}
   <DemoRoleSwitcher />
   ```

### Bước 2: Xóa file component và file tài liệu này
Bạn chỉ cần xóa 2 file:
- `frontend/src/components/demo/DemoRoleSwitcher.tsx`
- `DEMO_ROLE_SWITCHER.md`

*(Hoặc chạy lệnh PowerShell 1 dòng sau trong thư mục gốc dự án để xóa tự động):*
```powershell
Remove-Item -Path "frontend\src\components\demo\DemoRoleSwitcher.tsx", "DEMO_ROLE_SWITCHER.md" -Force
```


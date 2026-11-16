export function generateSlug(text: string): string {
  if (!text) return "";
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Xóa toàn bộ dấu thanh tiếng Việt
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "") // Bỏ ký tự đặc biệt
    .replace(/[\s_]+/g, "-") // Thay khoảng trắng hoặc gạch dưới bằng gạch ngang
    .replace(/-+/g, "-") // Bỏ nhiều gạch ngang liên tiếp
    .replace(/^-+|-+$/g, ""); // Xóa gạch ngang thừa ở đầu và cuối
}

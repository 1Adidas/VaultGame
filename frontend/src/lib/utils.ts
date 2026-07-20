import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPrice(price: number, currency = "VND") {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency }).format(price);
}

export function formatDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  if (typeof dateInput === 'string') {
    const match = dateInput.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const [, year, month, day] = match;
      return `${day}/${month}/${year}`;
    }
  }
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  let dateStr = typeof dateInput === 'string' ? dateInput : new Date(dateInput).toISOString();
  if (typeof dateInput === 'string' && !dateStr.endsWith("Z") && !dateStr.includes("+")) {
    dateStr += "Z";
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`;
}

export function formatDateTimeShort(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "";
  let dateStr = typeof dateInput === 'string' ? dateInput : new Date(dateInput).toISOString();
  if (typeof dateInput === 'string' && !dateStr.endsWith("Z") && !dateStr.includes("+")) {
    dateStr += "Z";
  }
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

export function resolveImageUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http")) {
    if (url.includes("drive.google.com")) {
      const match = url.match(/[?&]id=([^&]+)/) || url.match(/\/d\/([^/]+)/);
      if (match && match[1]) {
        return `https://lh3.googleusercontent.com/d/${match[1]}`;
      }
    }
    return url;
  }
  const base = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
  return `${base}${url}`;
}

export function resolveVideoUrl(url?: string | null): string {
  if (!url) return "";
  if (url.startsWith("http")) {
    return url;
  }
  const base = typeof window !== "undefined" ? "" : (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000");
  return `${base}${url}`;
}

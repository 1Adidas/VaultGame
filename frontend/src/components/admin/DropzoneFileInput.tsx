"use client";

import { useState, useRef } from "react";

// Custom Dropzone File Input - Thay thế Choose File mặc định của trình duyệt
export function DropzoneFileInput({
  accept,
  multiple = false,
  files,
  onSelect,
  onClear,
  label = "Nhấp để chọn tệp hoặc kéo thả vào đây",
  formatHint = "",
  disabled = false,
  maxSize = 3 * 1024 * 1024 * 1024, // 3GB default limit
}: {
  accept: string;
  multiple?: boolean;
  files: File | File[] | null;
  onSelect: (f: FileList | null) => void;
  onClear?: () => void;
  label?: string;
  formatHint?: string;
  disabled?: boolean;
  maxSize?: number;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (bytes?: number) => {
    if (!bytes && bytes !== 0) return "";
    if (bytes >= 1024 * 1024 * 1024) {
      return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const validateAndSelect = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    for (let i = 0; i < fileList.length; i++) {
      if (fileList[i].size > maxSize) {
        const sizeGb = (maxSize / (1024 * 1024 * 1024)).toFixed(0);
        alert(`Tệp "${fileList[i].name}" (${formatFileSize(fileList[i].size)}) vượt quá dung lượng tối đa cho phép là ${sizeGb}GB! Vui lòng chọn tệp nhỏ hơn.`);
        if (inputRef.current) inputRef.current.value = "";
        return;
      }
    }
    onSelect(fileList);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (disabled) return;
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndSelect(e.dataTransfer.files);
    }
  };

  const hasFiles = Boolean(
    Array.isArray(files) ? files.length > 0 : files
  );

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => validateAndSelect(e.target.files)}
      />

      {!hasFiles ? (
        <div
          onClick={() => !disabled && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); if (!disabled) setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          className={`group rounded-xl border border-dashed transition p-3 text-center flex flex-col items-center justify-center cursor-pointer select-none ${
            isDragOver
              ? "border-cyan-400 bg-cyan-500/[0.08]"
              : "border-white/15 bg-white/[0.015] hover:border-cyan-400/50 hover:bg-white/[0.03]"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          <span className="text-xs font-medium text-zinc-300 group-hover:text-cyan-300 transition">
            {label}
          </span>
          {formatHint && (
            <span className="text-[10px] text-zinc-500 font-mono mt-0.5">
              {formatHint}
            </span>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {Array.isArray(files) ? (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-[11px] text-zinc-300 font-medium px-1">
                <span>Đã chọn {files.length} ảnh gameplay mới:</span>
                {onClear && (
                  <button
                    type="button"
                    onClick={onClear}
                    className="text-[10px] text-zinc-400 hover:text-red-400 transition cursor-pointer font-medium"
                  >
                    Hủy tất cả
                  </button>
                )}
              </div>
              <div className="max-h-28 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
                {files.map((f, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-[10px] text-cyan-300 font-mono bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-md"
                  >
                    <span className="truncate max-w-[200px]">{f.name}</span>
                    <span className="text-zinc-500 ml-2">{formatFileSize(f.size)}</span>
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="text-[10px] text-zinc-400 hover:text-cyan-300 transition cursor-pointer"
              >
                + Chọn thêm ảnh khác
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-cyan-300 font-mono bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1.5 rounded-lg">
              <div className="flex items-center gap-1.5 truncate">
                <span className="truncate max-w-[170px]">{files?.name}</span>
                <span className="text-zinc-500 text-[10px] font-sans">
                  {files?.size ? `(${formatFileSize(files.size)})` : ""}
                </span>
              </div>
              {onClear && (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-zinc-400 hover:text-red-400 ml-1.5 transition cursor-pointer text-xs font-semibold"
                >
                  Hủy
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

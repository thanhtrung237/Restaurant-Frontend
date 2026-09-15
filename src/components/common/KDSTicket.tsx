import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";

export type KDSTicketStatus =
  | "pending"
  | "cooking"
  | "served"
  | "weighing"
  | "custom";

export interface KDSTicketProps {
  tableName: string;
  timeAgo: string;
  dishName: string;
  quantity?: number;
  /** Ghi chú món (VD "Ít cay", "Không rau") — hiển thị màu cam như Figma */
  note?: string;
  /** Dòng hướng dẫn phụ (VD "Bán theo cân · cần cân trước khi gửi bếp") */
  hint?: string;
  /** Các tùy chọn đã chọn (size, topping, etc.) */
  options?: Array<{ id: number; optionItemId: number; optionItemName: string; priceSnapshot: number }>;
  /** Nhãn trạng thái phụ hiển thị phía trên header (VD "Chờ cân") */
  badgeLabel?: string;
  status?: KDSTicketStatus;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
}

/**
 * KDSTicket — khớp component "KDS Ticket" trong UI Component (Figma):
 * Phiếu hiển thị điều phối nhà bếp (Kitchen Display System) với các trạng thái:
 * 1. "Xác nhận" (Nút xanh dương info #2E90FA)
 * 2. "Đã phục vụ" (Nút vàng cam warning #F59E0B) — Phục vụ bấm khi đã mang món ra bàn
 * 4. "weighing" — món bán theo cân, cần "Nhập số cân" trước khi gửi bếp (Nút đỏ danger),
 *    có thêm badge cảnh báo phía trên header và viền/nền cam nhạt để nổi bật trong cột.
 */
export function KDSTicket({
  tableName,
  timeAgo,
  dishName,
  quantity,
  note,
  hint,
  options,
  badgeLabel,
  status = "pending",
  actionLabel,
  onAction,
  className,
}: KDSTicketProps) {
  // Tự động chọn nhãn và màu nút theo status nếu không chỉ định actionLabel
  let buttonLabel = actionLabel;
  let buttonClass = "";

  switch (status) {
    case "pending":
      buttonLabel = buttonLabel ?? "Xác nhận";
      buttonClass =
        "bg-status-info text-white hover:bg-status-info/90 active:bg-status-info/80";
      break;
    case "cooking":
      // Đặc tả: bếp KHÔNG thao tác trên hệ thống. Phục vụ là người chuyển
      // ĐANG CHẾ BIẾN → ĐÃ PHỤC VỤ, nên nhãn nút là "Đã phục vụ" (không phải
      // "Đánh dấu xong" — chữ đó ngụ ý bếp bấm báo nấu xong).
      buttonLabel = buttonLabel ?? "Đã phục vụ";
      buttonClass =
        "bg-status-warning text-white hover:bg-status-warning/90 active:bg-status-warning/80";
      break;
    case "served":
      buttonLabel = buttonLabel ?? "Đã phục vụ";
      buttonClass =
        "border border-status-success bg-transparent text-status-success hover:bg-status-success-subtle active:bg-status-success-subtle/80";
      break;
    case "weighing":
      buttonLabel = buttonLabel ?? "Nhập số cân";
      buttonClass =
        "bg-status-danger text-white hover:bg-status-danger/90 active:bg-status-danger/80";
      break;
    default:
      buttonLabel = buttonLabel ?? "Thao tác";
      buttonClass = "bg-brand-primary text-white hover:bg-brand-primary-hover";
  }

  return (
    <div
      className={cn(
        "flex flex-col justify-between rounded-card border border-border-default bg-surface-card p-4 transition-all min-h-40 shadow-xs",
        status === "weighing" &&
          "border-status-warning/50 bg-status-warning-subtle/40",
        className,
      )}
    >
      {/* Badge cảnh báo phụ (VD "Chờ cân") */}
      {badgeLabel ? (
        <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-status-warning">
          <span className="size-1.5 rounded-full bg-status-warning" />
          {badgeLabel}
        </div>
      ) : null}

      {/* Header phiếu: Tên bàn & Thời gian */}
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-md bg-surface-muted px-2.5 py-1 text-xs font-bold text-text-primary">
          {tableName}
        </span>
        <span className="text-xs text-text-tertiary">{timeAgo}</span>
      </div>

      {/* Nội dung món */}
      <div className="my-4 space-y-1">
        {/* Luôn hiển thị số lượng dạng "1× Tên món", kể cả khi số lượng = 1 (theo Figma) */}
        <h4 className="text-base font-bold text-text-primary">
          {quantity ?? 1}× {dishName}
        </h4>
        {/* Tuỳ chọn / ghi chú / hướng dẫn đều dùng màu cam thương hiệu như Figma,
            để bếp đọc lướt vẫn thấy ngay yêu cầu riêng của món. */}
        {options && options.length > 0 ? (
          <div className="space-y-0.5">
            {options.map((opt) => (
              <p key={opt.id} className="text-xs text-brand-primary">
                + {opt.optionItemName}
              </p>
            ))}
          </div>
        ) : null}
        {note ? <p className="text-xs text-brand-primary">{note}</p> : null}
        {hint ? (
          <p className="flex items-center gap-1 text-xs text-brand-primary">
            {status === "weighing" ? <Scale className="size-3" /> : null}
            {hint}
          </p>
        ) : null}
      </div>

      {/* Nút hành động trạng thái KDS */}
      <button
        type="button"
        onClick={onAction}
        className={cn(
          "flex h-10 w-full items-center justify-center rounded-button text-sm font-bold transition-colors outline-none",
          buttonClass,
        )}
      >
        {buttonLabel}
      </button>
    </div>
  );
}

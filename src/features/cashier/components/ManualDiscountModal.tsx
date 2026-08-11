import * as React from "react";
import { Info, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { DiscountType } from "@/types/enums";
import {
  MANUAL_DISCOUNT_APPROVAL_THRESHOLD_RATIO,
  type ManualDiscountInput,
} from "@/features/cashier/store/checkout.store";

export interface ManualDiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  sessionCode: string;
  /** Tạm tính SAU khuyến mãi tự động — nền để tính % / kiểm tra ngưỡng duyệt */
  baseAmount: number;
  onSubmit: (input: ManualDiscountInput) => void;
}

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

export function ManualDiscountModal({
  open,
  onOpenChange,
  tableName,
  sessionCode,
  baseAmount,
  onSubmit,
}: ManualDiscountModalProps) {
  const [scope, setScope] = React.useState<"INVOICE" | "ITEM">("INVOICE");
  const [type, setType] = React.useState<DiscountType>("PERCENTAGE");
  const [value, setValue] = React.useState<string>("15");
  const [reason, setReason] = React.useState<string>(
    "Khách quen · đền bù món ra chậm",
  );

  // Reset form mỗi lần mở modal (khởi tạo dữ liệu mẫu khớp 100% screenshot)
  React.useEffect(() => {
    if (open) {
      setScope("INVOICE");
      setType("PERCENTAGE");
      setValue("15");
      setReason("Khách quen · đền bù món ra chậm");
    }
  }, [open]);

  const numericValue = Number(value) || 0;
  const discountAmount =
    type === "PERCENTAGE"
      ? Math.round((baseAmount * numericValue) / 100)
      : Math.min(numericValue, baseAmount);
  const remaining = Math.max(0, baseAmount - discountAmount);
  const threshold = baseAmount * MANUAL_DISCOUNT_APPROVAL_THRESHOLD_RATIO;
  const requiresApproval = discountAmount > threshold;
  const canSubmit = numericValue > 0 && reason.trim().length > 0;

  function handleSubmit() {
    if (!canSubmit) return;
    onSubmit({ scope, type, value: numericValue, reason: reason.trim() });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[460px] rounded-2xl p-6 sm:p-7 gap-0 border border-border-default/60 bg-surface-card shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        {/* Nút đóng hình tròn góc trên bên phải */}
        <DialogClose asChild>
          <button
            type="button"
            className="absolute top-5 right-5 size-7 rounded-full bg-surface-muted flex items-center justify-center text-text-tertiary hover:bg-border-default hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Đóng"
          >
            <X className="size-3.5" />
          </button>
        </DialogClose>

        {/* Tiêu đề & phụ đề */}
        <DialogHeader className="gap-0.5 text-left pr-8">
          <DialogTitle className="text-xl font-bold text-text-primary">
            Chiết khấu thủ công
          </DialogTitle>
          <DialogDescription className="text-xs text-text-tertiary font-normal mt-0.5">
            {tableName} · Phiên {sessionCode}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4.5 mt-5">
          {/* 1. Áp dụng cho (radio dạng inline ngang không viền hộp) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary block">
              Áp dụng cho
            </label>
            <RadioGroup
              value={scope}
              onValueChange={(v) => setScope(v as "INVOICE" | "ITEM")}
              className="flex items-center gap-7"
            >
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer select-none">
                <RadioGroupItem
                  value="INVOICE"
                  className="size-4.5 text-brand-primary border-border-strong data-[state=checked]:border-brand-primary"
                />
                Toàn hóa đơn
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer select-none">
                <RadioGroupItem
                  value="ITEM"
                  className="size-4.5 text-brand-primary border-border-strong data-[state=checked]:border-brand-primary"
                />
                Từng dòng món
              </label>
            </RadioGroup>
          </div>

          {/* 2. Loại chiết khấu (radio dạng inline ngang) */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-text-secondary block">
              Loại chiết khấu
            </label>
            <RadioGroup
              value={type}
              onValueChange={(v) => setType(v as DiscountType)}
              className="flex items-center gap-7"
            >
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer select-none">
                <RadioGroupItem
                  value="PERCENTAGE"
                  className="size-4.5 text-brand-primary border-border-strong data-[state=checked]:border-brand-primary"
                />
                Theo %
              </label>
              <label className="flex items-center gap-2 text-sm font-medium text-text-primary cursor-pointer select-none">
                <RadioGroupItem
                  value="FIXED_AMOUNT"
                  className="size-4.5 text-brand-primary border-border-strong data-[state=checked]:border-brand-primary"
                />
                Số tiền
              </label>
            </RadioGroup>
          </div>

          {/* 3. Giá trị (hiển thị 15 % liền mạch như screenshot) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary block">
              Giá trị
            </label>
            <div className="flex items-center h-11 rounded-xl border border-border-strong/70 bg-surface-card px-3.5 focus-within:ring-2 focus-within:ring-brand-primary/20 focus-within:border-brand-primary transition-all">
              <input
                type="text"
                inputMode="numeric"
                value={value}
                onChange={(e) =>
                  setValue(e.target.value.replace(/[^0-9]/g, ""))
                }
                className="w-auto min-w-[20px] max-w-[120px] text-sm font-medium text-text-primary bg-transparent outline-none"
                style={{ width: `${Math.max(1, value.length)}ch` }}
              />
              <span className="ml-1 text-sm text-text-primary font-medium select-none">
                {type === "PERCENTAGE" ? "%" : "đ"}
              </span>
            </div>
          </div>

          {/* 4. Lý do (bắt buộc) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary block">
              Lý do (bắt buộc)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="VD: Khách quen · đền bù món ra chậm"
              className="w-full h-11 rounded-xl border border-border-strong/70 bg-surface-card px-3.5 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
            />
          </div>

          {/* 5. Cảnh báo vượt ngưỡng (icon tròn info, nền cam nhạt #fff7ed) */}
          {requiresApproval ? (
            <div className="flex items-start gap-2.5 rounded-xl bg-[#fff7ed] border border-orange-100/80 p-3.5">
              <Info className="mt-0.5 size-4 shrink-0 text-orange-600" />
              <p className="text-xs text-[#9a3412] leading-relaxed">
                Vượt ngưỡng{" "}
                {Math.round(MANUAL_DISCOUNT_APPROVAL_THRESHOLD_RATIO * 100)}%
                của chi nhánh — cần Quản lý chi nhánh duyệt trước khi áp
                (BR-10).
              </p>
            </div>
          ) : null}

          {/* 6. Tổng kết (nền xám nhạt, không divider) */}
          <div className="space-y-2 rounded-xl bg-[#f8fafc] p-4 border border-border-default/40">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-tertiary">
                Tạm tính (sau KM tự động)
              </span>
              <span className="font-bold text-text-primary">
                {formatVnd(baseAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-status-success font-medium">
                Chiết khấu tay ({numericValue}
                {type === "PERCENTAGE" ? "%" : "đ"})
              </span>
              <span className="font-bold text-status-success">
                -{formatVnd(discountAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-sm font-bold text-text-primary">
                Còn lại
              </span>
              <span className="text-base font-bold text-brand-primary">
                {formatVnd(remaining)}
              </span>
            </div>
          </div>

          {/* 7. Footer: 2 nút bấm rộng bằng nhau */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="h-11 rounded-xl border border-border-strong/80 bg-surface-card hover:bg-surface-muted text-sm font-semibold text-text-secondary transition-colors cursor-pointer"
            >
              Huỷ
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="h-11 rounded-xl bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.99] text-sm font-bold text-text-on-brand transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              Gửi duyệt &amp; áp dụng
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

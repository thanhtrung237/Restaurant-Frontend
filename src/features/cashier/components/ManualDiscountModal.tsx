import * as React from "react";
import type { InvoiceDiscountInput } from "@/api/manual-discounts.api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface ManualDiscountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableName: string;
  sessionCode: string;
  baseAmount: number;
  replacing: boolean;
  submitting: boolean;
  requiresApproval: boolean;
  onSubmit: (input: InvoiceDiscountInput) => void;
}

const formatVnd = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`;

export function ManualDiscountModal({
  open, onOpenChange, tableName, sessionCode, baseAmount, replacing, submitting, requiresApproval, onSubmit,
}: ManualDiscountModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !submitting && onOpenChange(nextOpen)}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{replacing ? "Thay chiết khấu tay" : "Nhập chiết khấu tay"}</DialogTitle>
          <DialogDescription>
            {tableName} · Phiên {sessionCode} · Toàn hóa đơn
          </DialogDescription>
        </DialogHeader>
        {open && <DiscountForm {...{ baseAmount, replacing, submitting, requiresApproval, onOpenChange, onSubmit }} />}
      </DialogContent>
    </Dialog>
  );
}

function DiscountForm({
  baseAmount, replacing, submitting, requiresApproval, onOpenChange, onSubmit,
}: Pick<ManualDiscountModalProps, "baseAmount" | "replacing" | "submitting" | "requiresApproval" | "onOpenChange" | "onSubmit">) {
  const [type, setType] = React.useState<InvoiceDiscountInput["type"]>("FIXED_AMOUNT");
  const [value, setValue] = React.useState("");
  const [reason, setReason] = React.useState("");
  const percent = type === "PERCENTAGE";
  const validFormat = /^\d+$/.test(value) || (!percent && /^\d{1,3}(\.\d{3})+$/.test(value));
  const numericValue = validFormat ? Number(value.replace(/\./g, "")) : NaN;
  const discountAmount = percent ? Math.round(baseAmount * numericValue / 100) : numericValue;
  const validAmount = Number.isSafeInteger(numericValue) && discountAmount > 0 && discountAmount < baseAmount
    && (percent ? numericValue < 100 : numericValue <= 99_999_999);
  const invalidAmount = value !== "" && !validAmount;

  return (
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault();
      if (validAmount && reason.trim() && !submitting) {
        onSubmit({ type, value: numericValue, reason: reason.trim() });
      }
    }}>
      <RadioGroup
        aria-label="Loại chiết khấu"
        className="flex flex-wrap gap-5"
        value={type}
        disabled={submitting}
        onValueChange={(next: InvoiceDiscountInput["type"]) => {
          setType(next);
          setValue("");
        }}
      >
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="FIXED_AMOUNT" /> Số tiền (đ)
        </label>
        <label className="flex items-center gap-2 text-sm">
          <RadioGroupItem value="PERCENTAGE" /> Phần trăm (%)
        </label>
      </RadioGroup>

      <div className="space-y-1.5">
        <label htmlFor="manual-discount-value" className="text-sm font-medium">
          {percent ? "Mức giảm (%)" : "Số tiền giảm (đ)"}
        </label>
        <Input
          id="manual-discount-value"
          type="text"
          inputMode="numeric"
          autoComplete="off"
          placeholder={percent ? "VD: 10" : "VD: 10.000"}
          value={value}
          aria-invalid={invalidAmount}
          aria-describedby={invalidAmount ? "manual-discount-value-error" : undefined}
          onChange={(event) => setValue(event.target.value.trim())}
          disabled={submitting}
        />
        {invalidAmount && (
          <p id="manual-discount-value-error" className="text-sm text-status-danger">
            {percent
              ? "Nhập phần trăm từ 1 đến 99 sao cho hóa đơn vẫn còn tiền phải thu."
              : `Nhập số tiền nguyên lớn hơn 0 và tối đa ${formatVnd(Math.max(0, Math.min(baseAmount - 1, 99_999_999)))}.`}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <label htmlFor="manual-discount-reason" className="text-sm font-medium">Lý do (bắt buộc)</label>
        <Input
          id="manual-discount-reason"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          maxLength={500}
          required
          disabled={submitting}
        />
      </div>

      <dl className="space-y-2 rounded-xl bg-surface-muted p-4 text-sm">
        <div className="flex justify-between gap-2">
          <dt>Tiền hàng sau khuyến mãi</dt>
          <dd className="font-semibold">{formatVnd(baseAmount)}</dd>
        </div>
        <div className="flex justify-between gap-2">
          <dt>Chiết khấu tay dự kiến</dt>
          <dd className="font-semibold">{validAmount ? `−${formatVnd(discountAmount)}` : "—"}</dd>
        </div>
      </dl>

      {requiresApproval && <p className="text-sm text-text-secondary">Tạm tính đã gửi khách. Quản lý cần duyệt khoản thay đổi này.</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={submitting} onClick={() => onOpenChange(false)}>
          Hủy
        </Button>
        <Button type="submit" disabled={submitting || !validAmount || !reason.trim()}>
          {submitting ? "Đang lưu…" : requiresApproval ? "Gửi duyệt" : replacing ? "Lưu chiết khấu mới" : "Áp dụng chiết khấu"}
        </Button>
      </div>
    </form>
  );
}

import type { BillPreview } from "@/hooks/useBill";

interface BillSummaryProps {
  bill: BillPreview;
  /** Hiển thị chi tiết từng dòng hay chỉ tổng cộng */
  mode?: "full" | "compact";
  /** Custom className cho container */
  className?: string;
}

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

/**
 * Component hiển thị thống nhất breakdown hóa đơn theo BR-13.
 * Dùng chung cho cả 6 trang: thu ngân + khách hàng.
 * 
 * Thứ tự hiển thị (theo mục 4 của phân tích):
 * 1. Tiền hàng (gốc) = grossSubTotal
 * 2. - KM món = itemPromotionDiscount
 * 3. - KM đơn = orderPromotionDiscount (kèm tên)
 * 4. - Chiết khấu tay = manualDiscount
 * 5. + Phí dịch vụ = serviceFee (hiển thị % từ serviceFeeRate)
 * 6. + VAT = vatAmount (hiển thị % từ vatRate)
 * 7. = Tổng cộng = grandTotal
 */
export function BillSummary({ bill, mode = "full", className = "" }: BillSummaryProps) {
  const {
    grossSubTotal,
    itemPromotionDiscount,
    orderPromotionDiscount,
    orderPromotionName,
    manualDiscount,
    serviceFeeRate,
    serviceFee,
    vatRate,
    vatAmount,
    grandTotal,
  } = bill;

  if (mode === "compact") {
    return (
      <div className={className}>
        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-text-primary">Tổng cộng</span>
          <span className="text-2xl font-bold text-brand-primary">
            {formatVnd(grandTotal)}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="space-y-3">
        {/* Tiền hàng gốc (trước mọi giảm giá) */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">Tiền hàng</span>
          <span className="font-medium text-text-primary">
            {formatVnd(grossSubTotal)}
          </span>
        </div>

        {/* KM món - chỉ hiện nếu > 0 */}
        {itemPromotionDiscount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-status-success">Khuyến mãi món</span>
            <span className="font-medium text-status-success">
              −{formatVnd(itemPromotionDiscount)}
            </span>
          </div>
        )}

        {/* KM đơn - chỉ hiện nếu > 0 */}
        {orderPromotionDiscount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-status-success">
              Khuyến mãi đơn{orderPromotionName ? ` (${orderPromotionName})` : ""}
            </span>
            <span className="font-medium text-status-success">
              −{formatVnd(orderPromotionDiscount)}
            </span>
          </div>
        )}

        {/* Chiết khấu tay - chỉ hiện nếu > 0 */}
        {manualDiscount > 0 && (
          <div className="flex items-center justify-between text-sm">
            <span className="text-status-success">Chiết khấu tay</span>
            <span className="font-medium text-status-success">
              −{formatVnd(manualDiscount)}
            </span>
          </div>
        )}

        {/* Phí dịch vụ */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            Phí dịch vụ ({serviceFeeRate.toFixed(0)}%)
          </span>
          <span className="font-medium text-text-primary">
            {formatVnd(serviceFee)}
          </span>
        </div>

        {/* VAT */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-text-secondary">
            VAT ({vatRate.toFixed(0)}%)
          </span>
          <span className="font-medium text-text-primary">
            {formatVnd(vatAmount)}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="my-4 border-t border-border-default/60" />

      {/* Tổng cộng */}
      <div className="flex items-center justify-between">
        <span className="text-base font-bold text-text-primary">Tổng cộng</span>
        <span className="text-2xl font-bold text-brand-primary">
          {formatVnd(grandTotal)}
        </span>
      </div>
    </div>
  );
}

import * as React from "react"
import { Tag, Check, Search, AlertCircle } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Promotion } from "@/types/models"
import { getPromotionByBranchAndCode } from "@/api/promotions.api"
import { getErrorMessage } from "@/lib/http"

export interface PromotionSelectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  branchId?: number
  subtotal: number
  activePromotions: Promotion[]
  currentPromotionId?: number | null
  onSelectPromotion: (promo: Promotion | null, discountAmount: number) => void
}

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`

export function calculatePromoDiscount(
  promo: Promotion,
  subtotal: number,
): { discount: number; isEligible: boolean; minOrderValue: number } {
  let discount = 0
  let minOrderValue = 0

  try {
    const condObj =
      typeof promo.condition === "string" ? JSON.parse(promo.condition) : promo.condition
    const actionObj = typeof promo.action === "string" ? JSON.parse(promo.action) : promo.action

    const rawMin = condObj?.minOrderValue ?? condObj?.minTotal
    if (rawMin != null) {
      minOrderValue = Number(rawMin) || 0
      if (subtotal < minOrderValue) {
        return { discount: 0, isEligible: false, minOrderValue }
      }
    }

    const type = actionObj?.type || actionObj?.actionType || "fixed_amount"
    const val = Number(
      actionObj?.value ?? actionObj?.discountPercent ?? actionObj?.discountAmount ?? 0,
    )

    if (type === "percentage") {
      const pct = Math.min(Math.max(val, 0), 100)
      discount = Math.round((subtotal * pct) / 100)
    } else if (type === "fixed_amount") {
      discount = Math.max(val, 0)
    } else {
      discount = Math.max(val, 0)
    }
  } catch (err) {
    console.error("Parse promo rule error:", err)
  }

  return {
    discount: Math.min(discount, subtotal),
    isEligible: true,
    minOrderValue,
  }
}

export function PromotionSelectModal({
  open,
  onOpenChange,
  branchId,
  subtotal,
  activePromotions,
  currentPromotionId,
  onSelectPromotion,
}: PromotionSelectModalProps) {
  const [inputCode, setInputCode] = React.useState("")
  const [isLoadingCode, setIsLoadingCode] = React.useState(false)
  const [codeError, setCodeError] = React.useState<string | null>(null)
  const [queriedPromo, setQueriedPromo] = React.useState<Promotion | null>(null)
  const [selectedPromo, setSelectedPromo] = React.useState<Promotion | null>(null)

  // Lọc khuyến mãi: ưu tiên cấp INVOICE, nếu không có thì hiện tất cả
  const invoicePromotions = React.useMemo(() => {
    const invoiceLevel = activePromotions.filter((p) => p.applyLevel === "INVOICE")
    // Nếu có KM tìm qua mã (queriedPromo) chưa có trong list → thêm vào đầu
    const baseList = invoiceLevel.length > 0 ? invoiceLevel : activePromotions // fallback: hiện tất cả nếu chi nhánh không có KM cấp INVOICE
    if (queriedPromo && !baseList.some((p) => p.id === queriedPromo.id)) {
      return [queriedPromo, ...baseList]
    }
    return baseList
  }, [activePromotions, queriedPromo])

  React.useEffect(() => {
    if (open) {
      setInputCode("")
      setCodeError(null)
      setQueriedPromo(null)
      const found = activePromotions.find((p) => p.id === currentPromotionId)
      // Chỉ restore nếu KM đó vẫn đủ điều kiện
      if (found) {
        const { isEligible } = calculatePromoDiscount(found, subtotal)
        setSelectedPromo(isEligible ? found : null)
      } else {
        setSelectedPromo(null)
      }
    }
  }, [open, currentPromotionId, activePromotions, subtotal])

  async function handleSearchCode() {
    const code = inputCode.trim().toUpperCase()
    if (!code) return
    if (!branchId) return

    setIsLoadingCode(true)
    setCodeError(null)

    try {
      const promo = await getPromotionByBranchAndCode(branchId, code)
      // Kiểm tra điều kiện ngay khi tìm mã
      const { isEligible, minOrderValue } = calculatePromoDiscount(promo, subtotal)
      if (!isEligible) {
        setCodeError(
          `Mã "${code}" chưa đủ điều kiện — đơn tối thiểu ${formatVnd(minOrderValue)} (hiện tại ${formatVnd(subtotal)})`,
        )
        setQueriedPromo(promo) // Vẫn hiện trong list để thấy thông tin
        setSelectedPromo(null) // Nhưng không chọn
      } else {
        setQueriedPromo(promo)
        setSelectedPromo(promo)
      }
      setInputCode("")
    } catch (err: any) {
      setCodeError(getErrorMessage(err))
    } finally {
      setIsLoadingCode(false)
    }
  }

  // KM được chọn có đủ điều kiện không
  const selectedPromoEligible = selectedPromo
    ? calculatePromoDiscount(selectedPromo, subtotal).isEligible
    : false

  function handleConfirm() {
    if (selectedPromo && selectedPromoEligible) {
      const { discount } = calculatePromoDiscount(selectedPromo, subtotal)
      onSelectPromotion(selectedPromo, discount)
    } else {
      onSelectPromotion(null, 0)
    }
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-text-primary">
            <Tag className="size-5 text-brand-primary" />
            <span>Khuyến mãi & Giảm giá đơn hàng</span>
          </DialogTitle>
          <DialogDescription className="text-xs text-text-tertiary">
            Chọn chương trình khuyến mãi hoặc nhập mã voucher của khách
          </DialogDescription>
        </DialogHeader>

        {/* Input nhập mã */}
        <div className="mt-4 space-y-2">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
              <Input
                placeholder="Nhập mã voucher / khuyến mãi..."
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    void handleSearchCode()
                  }
                }}
                className="pl-9 text-sm uppercase"
              />
            </div>
            <Button
              type="button"
              disabled={isLoadingCode || !inputCode.trim()}
              onClick={() => void handleSearchCode()}
              className="shrink-0 font-semibold"
            >
              {isLoadingCode ? "Đang tìm..." : "Tìm mã"}
            </Button>
          </div>
          {codeError ? (
            <p className="flex items-center gap-1 text-xs text-status-danger">
              <AlertCircle className="size-3.5 shrink-0" />
              <span>{codeError}</span>
            </p>
          ) : null}
        </div>

        {/* Danh sách khuyến mãi */}
        <div className="mt-4 max-h-[280px] space-y-2 overflow-y-auto pr-1">
          {invoicePromotions.length === 0 ? (
            <div className="py-8 text-center space-y-1.5">
              <p className="text-sm text-text-tertiary">
                Không có chương trình khuyến mãi nào đang chạy tại chi nhánh.
              </p>
              <p className="text-xs text-text-tertiary">
                Nhập mã voucher của khách ở ô tìm kiếm phía trên.
              </p>
            </div>
          ) : (
            invoicePromotions.map((promo) => {
              const isSelected = selectedPromo?.id === promo.id
              const { discount, isEligible, minOrderValue } = calculatePromoDiscount(
                promo,
                subtotal,
              )
              const isInvoiceLevel = promo.applyLevel === "INVOICE"
              // Không đủ điều kiện → không cho chọn
              const isDisabled = !isEligible

              return (
                <div
                  key={promo.id}
                  onClick={() => {
                    if (isDisabled) return
                    if (isSelected) {
                      setSelectedPromo(null)
                    } else {
                      setSelectedPromo(promo)
                    }
                  }}
                  className={`flex items-start justify-between rounded-xl border p-3 transition-all ${
                    isDisabled
                      ? "cursor-not-allowed border-border-default bg-surface-muted/40 opacity-60"
                      : isSelected
                        ? "cursor-pointer border-brand-primary bg-brand-primary-subtle/30 shadow-xs"
                        : "cursor-pointer border-border-default bg-surface-card hover:border-brand-primary/40 hover:bg-surface-muted/50"
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1 pr-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`truncate text-sm font-bold ${isDisabled ? "text-text-tertiary" : "text-text-primary"}`}
                      >
                        {promo.name}
                      </span>
                      {promo.code ? (
                        <span className="shrink-0 rounded bg-brand-primary-subtle px-1.5 py-0.2 text-[11px] font-bold text-brand-primary">
                          {promo.code}
                        </span>
                      ) : null}
                      {!isInvoiceLevel && (
                        <span className="shrink-0 rounded bg-status-warning-subtle px-1.5 py-0.5 text-[10px] font-semibold text-status-warning">
                          KM món
                        </span>
                      )}
                    </div>

                    {promo.description ? (
                      <p className="line-clamp-2 text-xs text-text-tertiary">{promo.description}</p>
                    ) : null}

                    {minOrderValue > 0 ? (
                      <p className="text-[11px] text-text-secondary">
                        Đơn tối thiểu:{" "}
                        <span className="font-semibold">{formatVnd(minOrderValue)}</span>
                        {isDisabled ? (
                          <span className="ml-1 font-semibold text-status-danger">
                            — Hiện tại {formatVnd(subtotal)} (thiếu{" "}
                            {formatVnd(minOrderValue - subtotal)})
                          </span>
                        ) : null}
                      </p>
                    ) : null}

                    {!isDisabled && isEligible && discount > 0 ? (
                      <p className="text-xs font-bold text-status-success">
                        Giảm: -{formatVnd(discount)}
                      </p>
                    ) : null}

                    {isDisabled ? (
                      <p className="text-[11px] font-semibold text-status-danger">
                        🔒 Chưa đủ điều kiện — không thể áp dụng
                      </p>
                    ) : null}
                  </div>

                  <div
                    className={`flex size-5 shrink-0 items-center justify-center rounded-full border mt-1 ${
                      isDisabled
                        ? "border-border-default bg-surface-muted"
                        : "border-border-default bg-white"
                    }`}
                  >
                    {isSelected && !isDisabled ? (
                      <div className="flex size-full items-center justify-center rounded-full bg-brand-primary text-white">
                        <Check className="size-3.5 stroke-[3]" />
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        {/* Cảnh báo nếu chọn KM cấp ITEM (không tự động áp vào hóa đơn) */}
        {selectedPromo && selectedPromo.applyLevel !== "INVOICE" && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-status-warning-subtle border border-status-warning/30 px-3 py-2.5">
            <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-status-warning" />
            <p className="text-xs text-status-warning leading-relaxed">
              <strong>{selectedPromo.name}</strong> là khuyến mãi cấp món — sẽ tự động áp theo số
              lượng món, không áp thêm vào hóa đơn. Chọn KM cấp <em>Hóa đơn</em> để giảm tổng tiền.
            </p>
          </div>
        )}
        <div className="mt-5 flex gap-2.5">
          {selectedPromo || currentPromotionId ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedPromo(null)
                onSelectPromotion(null, 0)
                onOpenChange(false)
              }}
              className="flex-1 text-status-danger border-status-danger/30 hover:bg-status-danger/10"
            >
              Bỏ chọn khuyến mãi
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 text-text-secondary"
            >
              Hủy
            </Button>
          )}
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={!selectedPromo || !selectedPromoEligible}
            className="flex-1 font-semibold"
          >
            {selectedPromo
              ? selectedPromoEligible
                ? "Áp dụng khuyến mãi"
                : "Chưa đủ điều kiện"
              : "Chọn khuyến mãi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

import React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { BranchAdminConfigData } from "../types"

interface BranchConfigAdminTabProps {
  config: BranchAdminConfigData
  onConfigChange: (config: BranchAdminConfigData) => void
  selectedBranch?: string
  onSave?: () => void
  isSaving?: boolean
  readOnly?: boolean
}

/**
 * Cấu hình Quản trị — Nhóm 2 (FR-BRN-02)
 * CHỈ Quản trị nhà hàng mới sửa được.
 * Quản lý chi nhánh chỉ xem (readOnly=true).
 */
export const BranchConfigAdminTab: React.FC<BranchConfigAdminTabProps> = ({
  config,
  onConfigChange,
  selectedBranch = "Chi nhánh Quận 1",
  onSave,
  isSaving = false,
  readOnly = false,
}) => {
  const { toast } = useToast()

  // Validation
  const vatError =
    config.vatRate < 0 || config.vatRate > 100 ? "Thuế VAT phải từ 0-100%." : undefined
  const feeError =
    config.serviceFeeRate < 0 || config.serviceFeeRate > 100
      ? "Phí dịch vụ phải từ 0-100%."
      : undefined
  const thresholdError =
    config.discountApprovalThreshold < 0 ? "Ngưỡng duyệt chiết khấu phải ≥ 0." : undefined

  const hasError = Boolean(vatError || feeError || thresholdError)

  const handleSaveClick = () => {
    if (hasError) {
      toast({
        title: "Chưa lưu được",
        description: vatError ?? feeError ?? thresholdError ?? "",
        variant: "danger",
      })
      return
    }

    if (onSave) {
      onSave()
    } else {
      toast({
        title: "Thành công",
        description: `Đã lưu cấu hình quản trị cho ${selectedBranch}!`,
        variant: "success",
      })
    }
  }

  return (
    <div className="grid min-w-0 gap-6 lg:row-span-3 lg:grid-rows-subgrid">
      {/* ================= CARD: CẤU HÌNH QUẢN TRỊ ================= */}
      <Card className="border-border-default bg-surface-card shadow-2xs lg:row-span-2">
        <CardHeader className="p-6 pb-4 space-y-0.5">
          <CardTitle className="text-base font-bold text-text-primary tracking-tight">
            Cấu hình Quản trị nhà hàng
          </CardTitle>
          <CardDescription className="text-xs text-text-tertiary">
            {readOnly
              ? "Nhóm 2 · Chỉ xem (CHỈ Quản trị nhà hàng mới sửa được)"
              : "Nhóm 2 · CHỈ Quản trị nhà hàng được sửa"}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-0 space-y-4">
          {/* Thuế VAT (%) */}
          <FormField
            label="Thuế VAT (%)"
            htmlFor="admin-vat-rate"
            error={!readOnly ? vatError : undefined}
          >
            <Input
              id="admin-vat-rate"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={config.vatRate}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  vatRate: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="10"
              disabled={readOnly}
            />
            <p className="mt-1.5 text-xs text-text-tertiary">
              Từ 0-100%. Áp dụng cho các phiên mới.
            </p>
          </FormField>

          {/* Phí dịch vụ (%) */}
          <FormField
            label="Phí dịch vụ (%)"
            htmlFor="admin-service-fee"
            error={!readOnly ? feeError : undefined}
          >
            <Input
              id="admin-service-fee"
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={config.serviceFeeRate}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  serviceFeeRate: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="5"
              disabled={readOnly}
            />
            <p className="mt-1.5 text-xs text-text-tertiary">
              Từ 0-100%. Áp dụng cho các phiên mới.
            </p>
          </FormField>

          {/* VAT áp dụng trên phí dịch vụ */}
          <FormField label="" htmlFor="admin-vat-on-fee">
            <div className="flex items-center gap-2">
              <Checkbox
                id="admin-vat-on-fee"
                checked={config.vatAppliedOnServiceFee}
                onCheckedChange={(checked) =>
                  onConfigChange({
                    ...config,
                    vatAppliedOnServiceFee: Boolean(checked),
                  })
                }
                disabled={readOnly}
              />
              <label
                htmlFor="admin-vat-on-fee"
                className="text-sm text-text-primary cursor-pointer"
              >
                VAT áp dụng trên phí dịch vụ
              </label>
            </div>
            <p className="mt-1.5 text-xs text-text-tertiary">
              Nếu bật, VAT sẽ tính trên (món + phí dịch vụ). Nếu tắt, VAT chỉ tính trên món.
            </p>
          </FormField>

          {/* Ngưỡng duyệt chiết khấu */}
          <FormField
            label="Ngưỡng duyệt chiết khấu (đ)"
            htmlFor="admin-discount-threshold"
            error={!readOnly ? thresholdError : undefined}
          >
            <Input
              id="admin-discount-threshold"
              type="number"
              min={0}
              step={1000}
              value={config.discountApprovalThreshold}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  discountApprovalThreshold: parseFloat(e.target.value) || 0,
                })
              }
              placeholder="100000"
              disabled={readOnly}
            />
            <p className="mt-1.5 text-xs text-text-tertiary">
              Chiết khấu tay &ge; ngưỡng này cần Quản lý chi nhánh duyệt.
            </p>
          </FormField>

          {/* Mã số thuế riêng */}
          <FormField label="Mã số thuế chi nhánh" htmlFor="admin-tax-code">
            <Input
              id="admin-tax-code"
              value={config.taxCode}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  taxCode: e.target.value,
                })
              }
              placeholder="0312123332132-01"
              disabled={readOnly}
            />
            <p className="mt-1.5 text-xs text-text-tertiary">
              Để trống để dùng MST nhà hàng. Gửi trống = xóa MST riêng.
            </p>
          </FormField>
        </CardContent>
      </Card>

      {/* Nút "Lưu thay đổi" chỉ hiện khi KHÔNG readOnly */}
      {!readOnly && onSave ? (
        <div className="flex justify-end self-start">
          <Button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving || hasError}
            className="h-11 px-6 rounded-xl font-semibold bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover shadow-2xs cursor-pointer"
          >
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

import React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { BranchConfigData } from "../types"
// Dùng chung: Quản lý chi nhánh (trang "Cấu hình" riêng, sửa chi nhánh mình) &
// Quản trị nhà hàng (nút "Cấu hình chi nhánh" trên trang chi tiết chi nhánh, sửa 1 chi nhánh bất kỳ).

interface BranchConfigTabProps {
  config: BranchConfigData
  onConfigChange: (config: BranchConfigData) => void
  selectedBranch?: string
  onSave?: () => void
  isSaving?: boolean
}

/**
 * Cấu hình thông tin và quy tắc vận hành chi nhánh
 * Nguồn: QuanLy/Cấu hình · Chi nhánh.png
 */
export const BranchConfigTab: React.FC<BranchConfigTabProps> = ({
  config,
  onConfigChange,
  selectedBranch = "Chi nhánh Quận 1",
  onSave,
  isSaving = false,
}) => {
  const { toast } = useToast()

  const handleSaveClick = () => {
    if (onSave) {
      onSave()
    } else {
      toast({
        title: "Thành công",
        description: `Đã lưu thay đổi cấu hình cho ${selectedBranch} thành công!`,
        variant: "success",
      })
    }
  }

  return (
    <div className="space-y-6 pt-2">
      {/* ================= CARD 1: THÔNG TIN CHI NHÁNH ================= */}
      <Card className="border-border-default bg-surface-card shadow-2xs">
        <CardHeader className="p-6 pb-4 space-y-0.5">
          <CardTitle className="text-base font-bold text-text-primary tracking-tight">
            Thông tin chi nhánh
          </CardTitle>
          <CardDescription className="text-xs text-text-tertiary">
            Cấp chi nhánh · riêng cho {selectedBranch}
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-0 space-y-4">
          {/* Hotline */}
          <FormField label="Hotline" htmlFor="branch-hotline">
            <Input
              id="branch-hotline"
              value={config.hotline}
              onChange={(e) =>
                onConfigChange({ ...config, hotline: e.target.value })
              }
              placeholder="1900 6868"
            />
          </FormField>

          {/* Địa chỉ */}
          <FormField label="Địa chỉ" htmlFor="branch-address">
            <Input
              id="branch-address"
              value={config.address}
              onChange={(e) =>
                onConfigChange({ ...config, address: e.target.value })
              }
              placeholder="12 Nguyễn Huệ, Quận 1, TP.HCM"
            />
          </FormField>

          {/* Giờ mở cửa */}
          <FormField label="Giờ mở cửa" htmlFor="branch-opening-hours">
            <Input
              id="branch-opening-hours"
              value={config.openingHours}
              onChange={(e) =>
                onConfigChange({ ...config, openingHours: e.target.value })
              }
              placeholder="08:00 – 22:00"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* ================= CARD 2: QUY TẮC VẬN HÀNH ================= */}
      <Card className="border-border-default bg-surface-card shadow-2xs">
        <CardHeader className="p-6 pb-4 space-y-0.5">
          <CardTitle className="text-base font-bold text-text-primary tracking-tight">
            Quy tắc vận hành
          </CardTitle>
          <CardDescription className="text-xs text-text-tertiary">
            Ngưỡng thời gian tự động · áp dụng cho chi nhánh này
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-0 space-y-4">
          {/* Thời gian tự huỷ CHỜ MỞ BÀN (phút) */}
          <FormField
            label="Thời gian tự huỷ CHỜ MỞ BÀN (phút)"
            htmlFor="auto-cancel-waiting"
          >
            <Input
              id="auto-cancel-waiting"
              type="number"
              min={1}
              value={config.autoCancelWaitingMinutes}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  autoCancelWaitingMinutes: e.target.value,
                })
              }
              placeholder="10"
            />
          </FormField>

          {/* Thời gian giữ chỗ đặt bàn (phút) */}
          <FormField
            label="Thời gian giữ chỗ đặt bàn (phút)"
            htmlFor="reservation-holding"
          >
            <Input
              id="reservation-holding"
              type="number"
              min={1}
              value={config.reservationHoldingMinutes}
              onChange={(e) =>
                onConfigChange({
                  ...config,
                  reservationHoldingMinutes: e.target.value,
                })
              }
              placeholder="15"
            />
          </FormField>
        </CardContent>
      </Card>

      {/* Nút "Lưu thay đổi" căn phải dưới cùng */}
      <div className="flex justify-end pt-2">
        <Button
          type="button"
          onClick={handleSaveClick}
          disabled={isSaving}
          className="h-11 px-6 rounded-xl font-semibold bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover shadow-2xs cursor-pointer"
        >
          {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
      </div>
    </div>
  )
}

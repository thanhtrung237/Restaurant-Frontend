import React from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { BANK_OPTIONS } from "@/config/banks"

/** Giá trị canh giữ cho mục "bỏ chọn" — Radix Select không nhận value rỗng. */
const NO_BANK_VALUE = "__none__"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import type { BranchConfigData } from "../types"
// Dùng chung: Quản lý chi nhánh (trang "Cấu hình" riêng, sửa chi nhánh mình) &
// Quản trị nhà hàng (nút "Cấu hình chi nhánh" trên trang chi tiết chi nhánh, sửa 1 chi nhánh bất kỳ).

interface BranchConfigManagerTabProps {
  config: BranchConfigData
  onConfigChange: (config: BranchConfigData) => void
  /**
   * Mã ngân hàng ĐANG LƯU TRÊN SERVER (khác `config.bankName` là giá trị đang sửa dở).
   *
   * Dùng để quyết định có chèn mục tạm cho giá trị lạ hay không. Phải bám theo dữ liệu
   * tải về chứ không phải state của form: nếu bám form thì người dùng chọn mã khác một
   * cái là mục tạm biến mất, không quay lại giá trị gốc được nữa.
   */
  loadedBankName?: string
  canEditBankAccount: boolean
  selectedBranch?: string
  onSave?: () => void
  isSaving?: boolean
}

/**
 * Cấu hình Quản lý chi nhánh — Nhóm 1 (FR-BRN-02)
 * Nguồn: QuanLy/Cấu hình · Chi nhánh.png
 */
export const BranchConfigManagerTab: React.FC<BranchConfigManagerTabProps> = ({
  config,
  onConfigChange,
  loadedBankName = "",
  canEditBankAccount,
  selectedBranch = "Chi nhánh Quận 1",
  onSave,
  isSaving = false,
}) => {
  const { toast } = useToast()

  // Số tài khoản chỉ gồm chữ số (ô nhập đã lọc, đây là chốt chặn cuối).
  const bankAccountError =
    canEditBankAccount && config.bankAccountNo && !/^[0-9]+$/.test(config.bankAccountNo)
      ? "Số tài khoản chỉ được chứa chữ số."
      : undefined

  // Giờ bắt đầu ngày kinh doanh phải đúng HH:mm (00:00–23:59).
  const businessDayStartError =
    config.businessDayStartTime &&
    !/^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(config.businessDayStartTime)
      ? "Giờ bắt đầu ngày kinh doanh phải theo định dạng HH:mm."
      : undefined

  // Ngân hàng và số tài khoản đi theo cặp — thiếu một nửa thì QR không sinh được.
  const bankPairError =
    canEditBankAccount && Boolean(config.bankAccountNo) !== Boolean(config.bankName)
      ? "Cần nhập ĐỦ cả ngân hàng và số tài khoản thì mới sinh được mã QR."
      : undefined

  const hasError = Boolean(bankAccountError || businessDayStartError || bankPairError)

  /**
   * Giá trị ngân hàng SERVER đang trả về mà không nằm trong 13 mã `BANK_OPTIONS`
   * (vd dữ liệu cũ lưu "Vietcombank" thay vì "VCB"). Rỗng nghĩa là không có giá trị lạ.
   *
   * Mục tạm tồn tại chừng nào server còn giữ giá trị lạ, nên người dùng chọn mã khác rồi
   * đổi ý vẫn quay lại được. Lưu thành công ⇒ React Query nạp lại chi nhánh ⇒ giá trị mới
   * là mã hợp lệ ⇒ mục tạm tự biến mất.
   */
  const legacyBankName =
    loadedBankName && !BANK_OPTIONS.some((bank) => bank.code === loadedBankName)
      ? loadedBankName
      : ""

  /** Ô đang chọn chính giá trị lạ đó — lúc này mới nhắc người dùng chuẩn hoá. */
  const isLegacyBankSelected = Boolean(legacyBankName) && config.bankName === legacyBankName

  const handleSaveClick = () => {
    if (hasError) {
      toast({
        title: "Chưa lưu được",
        description: bankAccountError ?? businessDayStartError ?? bankPairError ?? "",
        variant: "danger",
      })
      return
    }

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
    <div className="grid min-w-0 gap-6 lg:row-span-3 lg:grid-rows-subgrid">
      {/* ================= CARD: THÔNG TIN THỜI GIAN ================= */}
      <Card className="border-border-default bg-surface-card shadow-2xs">
        <CardHeader className="p-6 pb-4 space-y-0.5">
          <CardTitle className="text-base font-bold text-text-primary tracking-tight">
            Cấu hình Quản lý chi nhánh
          </CardTitle>
          <CardDescription className="text-xs text-text-tertiary">
            Nhóm 1 · Quản lý chi nhánh và Quản trị nhà hàng đều sửa được
          </CardDescription>
        </CardHeader>

        <CardContent className="p-6 pt-0 space-y-4">
          {/* Giờ bắt đầu ngày kinh doanh (BR-06) — FR-BRN-02 Nhóm 1 */}
          <FormField
            label="Giờ bắt đầu ngày kinh doanh"
            htmlFor="branch-business-day-start"
            error={businessDayStartError}
          >
            <Input
              id="branch-business-day-start"
              type="time"
              value={config.businessDayStartTime}
              onChange={(e) => onConfigChange({ ...config, businessDayStartTime: e.target.value })}
              placeholder="06:00"
            />
            <p className="mt-1.5 text-xs text-text-tertiary">
              Mốc cắt doanh thu theo ngày. Định dạng HH:mm. Để trống để xóa.
            </p>
          </FormField>
        </CardContent>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,14rem),1fr))] gap-4">
        {/* ================= CARD: TÀI KHOẢN NHẬN CHUYỂN KHOẢN ================= */}
        <Card className="border-border-default bg-surface-card shadow-2xs">
          <CardHeader className="p-6 pb-4 space-y-0.5">
            <CardTitle className="text-base font-bold text-text-primary tracking-tight">
              Tài khoản nhận chuyển khoản
            </CardTitle>
            <CardDescription className="text-xs text-text-tertiary">
              {canEditBankAccount
                ? "Mỗi chi nhánh dùng tài khoản riêng"
                : "Chỉ Quản trị nhà hàng được chỉnh sửa."}
            </CardDescription>
          </CardHeader>

          <CardContent className="p-6 pt-0 space-y-4">
            {/* Ngân hàng — BẮT BUỘC dropdown: backend chỉ map được 13 mã, giá trị lạ tạo ra
                ảnh QR hỏng mà không báo lỗi (xem config/banks.ts). */}
            <FormField label="Ngân hàng" htmlFor="branch-bank-name">
              <Select
                disabled={!canEditBankAccount}
                value={config.bankName || NO_BANK_VALUE}
                onValueChange={(value) =>
                  onConfigChange({
                    ...config,
                    bankName: value === NO_BANK_VALUE ? "" : value,
                  })
                }
              >
                <SelectTrigger id="branch-bank-name" className="w-full">
                  <SelectValue placeholder="Chọn ngân hàng" />
                </SelectTrigger>
                <SelectContent>
                  {/* Radix không cho SelectItem mang value rỗng, nên phải đi qua một giá trị
                      canh giữ. Thiếu mục này thì chọn rồi KHÔNG BỎ CHỌN ĐƯỢC — tức không gỡ
                      được cấu hình chuyển khoản của chi nhánh. */}
                  <SelectItem value={NO_BANK_VALUE} className="cursor-pointer">
                    — Chưa cấu hình —
                  </SelectItem>

                  {/* Dữ liệu cũ có thể lưu tên đầy đủ ("Vietcombank") thay vì mã. Radix chỉ
                      render text của mục KHỚP value, nên không có mục này thì ô hiện TRỐNG:
                      người dùng tưởng chưa cấu hình, chọn bừa một ngân hàng và ghi đè mất
                      cấu hình đang chạy. Mục tạm giữ nguyên giá trị gốc nên không mất dữ liệu. */}
                  {legacyBankName ? (
                    <SelectItem value={legacyBankName} className="cursor-pointer">
                      {legacyBankName} (giá trị cũ)
                    </SelectItem>
                  ) : null}

                  {BANK_OPTIONS.map((bank) => (
                    <SelectItem key={bank.code} value={bank.code} className="cursor-pointer">
                      {bank.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {canEditBankAccount && isLegacyBankSelected ? (
                <p className="mt-1.5 text-xs text-status-warning">
                  Giá trị này chưa theo danh sách chuẩn. Nên chọn lại ngân hàng tương ứng rồi Lưu.
                </p>
              ) : null}
            </FormField>

            {/* Số tài khoản — chỉ chữ số */}
            <FormField label="Số tài khoản" htmlFor="branch-bank-account" error={bankAccountError}>
              <Input
                id="branch-bank-account"
                disabled={!canEditBankAccount}
                inputMode="numeric"
                value={config.bankAccountNo}
                onChange={(e) =>
                  onConfigChange({
                    ...config,
                    // Chặn ngay khi gõ: số tài khoản chỉ gồm chữ số
                    bankAccountNo: e.target.value.replace(/[^0-9]/g, ""),
                  })
                }
                placeholder="0071000988888"
              />
              <p className="mt-1.5 text-xs text-text-tertiary">
                Dùng để sinh mã QR chuyển khoản cho hóa đơn của chi nhánh này.
              </p>
            </FormField>
          </CardContent>
        </Card>

        {/* ================= CARD: QUY TẮC VẬN HÀNH ================= */}
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
            <FormField label="Thời gian tự huỷ CHỜ MỞ BÀN (phút)" htmlFor="auto-cancel-waiting">
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
              <p className="mt-1.5 text-xs text-text-tertiary">Tối thiểu 1 phút</p>
            </FormField>

            {/* Thời gian giữ chỗ đặt bàn (phút) */}
            <FormField label="Thời gian giữ chỗ đặt bàn (phút)" htmlFor="reservation-holding">
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
              <p className="mt-1.5 text-xs text-text-tertiary">Tối thiểu 1 phút</p>
            </FormField>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {bankPairError ? (
          <p className="rounded-lg bg-status-warning-subtle px-3.5 py-2.5 text-xs font-medium text-status-warning">
            {bankPairError}
          </p>
        ) : null}
        <div className="flex justify-end">
          <Button
            type="button"
            onClick={handleSaveClick}
            disabled={isSaving || hasError}
            className="h-11 px-6 rounded-xl font-semibold bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover shadow-2xs cursor-pointer"
          >
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </div>
      </div>
    </div>
  )
}

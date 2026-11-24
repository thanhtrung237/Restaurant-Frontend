import * as React from "react"
import { useNavigate } from "react-router-dom"
import { ShieldCheck, ChevronRight, Loader2, AlertTriangle, Building2 } from "lucide-react"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/http"
import { useUploadRestaurantLogo } from "@/api/upload.api"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import { DEFAULT_BRANCH_TAX_AND_FEE } from "../mock-data"
import type { RestaurantInfoConfig } from "../types"

/** Logo in lên hoá đơn nên chỉ nhận 2 định dạng phổ biến, giới hạn 5MB như ảnh món (QĐ-24). */
const ACCEPTED_LOGO_TYPES = ["image/png", "image/jpeg"]
const MAX_LOGO_BYTES = 5 * 1024 * 1024

interface RestaurantConfigTabProps {
  info: RestaurantInfoConfig
  onInfoChange: (info: RestaurantInfoConfig) => void
  /** Logo đang lưu ở backend — dùng để bật nút "Huỷ đổi logo" và để khôi phục. */
  savedLogoUrl: string
  /** MST đang lưu ở backend — chỉ cảnh báo khi người dùng thực sự đổi nó (QĐ-25). */
  savedTaxCode: string
  disabled?: boolean
}

/**
 * Cấu hình cấp NHÀ HÀNG (FR-ADM-03): tên, mã số thuế, địa chỉ, điện thoại, logo.
 *
 * Bốn trường trên cùng logo đều được **in lên hoá đơn**, nên trang này không còn khối nào
 * chạy bằng dữ liệu giả: mọi ô đều đọc/ghi thẳng `GET/PUT /restaurants/{id}`.
 *
 * VAT / phí dịch vụ KHÔNG sửa ở đây — xem chú thích ở khối "Thuế & phí" (QĐ-20).
 */
export function RestaurantConfigTab({
  info,
  onInfoChange,
  savedLogoUrl,
  savedTaxCode,
  disabled = false,
}: RestaurantConfigTabProps) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const uploadLogo = useUploadRestaurantLogo()
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const logoChanged = info.logoUrl !== savedLogoUrl
  const taxCodeChanged = info.taxCode.trim() !== savedTaxCode.trim()

  /** Chữ cái đầu của tên nhà hàng — dùng khi chưa có logo, thay cho chữ "P" viết cứng trước đây. */
  const initial = (info.restaurantName.trim()[0] || "?").toUpperCase()

  async function handlePickLogo(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Cho chọn lại đúng file đó sau khi lỗi
    event.target.value = ""
    if (!file) return

    if (!ACCEPTED_LOGO_TYPES.includes(file.type)) {
      toast({
        title: "Ảnh không hợp lệ",
        description: "Logo chỉ nhận file PNG hoặc JPG.",
        variant: "danger",
      })
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      toast({
        title: "Ảnh quá lớn",
        description: `Logo không được vượt quá 5MB (file đang chọn ${(file.size / 1024 / 1024).toFixed(1)}MB).`,
        variant: "danger",
      })
      return
    }

    try {
      const url = await uploadLogo.mutateAsync(file)
      onInfoChange({ ...info, logoUrl: url })
      toast({
        title: "Đã tải logo lên",
        description: 'Bấm "Lưu cấu hình" để áp dụng.',
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Không tải được logo",
        description: getErrorMessage(error),
        variant: "danger",
      })
    }
  }

  return (
    <div className="space-y-6 pt-2">
      {/* ================= KHỐI 1: THÔNG TIN DOANH NGHIỆP ================= */}
      <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Thông tin doanh nghiệp
          </h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            Cấp toàn hệ thống · được in lên hoá đơn (FR-ADM-03)
          </p>
        </div>

        {/* ---- Logo ---- */}
        <div className="space-y-2">
          <span className="block text-xs font-semibold text-text-primary select-none">
            Logo nhà hàng
          </span>
          <div className="flex items-center gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-brand-primary shadow-xs select-none">
              {info.logoUrl ? (
                <img
                  src={info.logoUrl}
                  alt={`Logo ${info.restaurantName}`}
                  className="size-full object-cover"
                />
              ) : (
                <span className="text-2xl font-extrabold text-text-on-brand">{initial}</span>
              )}
            </div>

            <div className="space-y-1.5">
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_LOGO_TYPES.join(",")}
                onChange={handlePickLogo}
                className="hidden"
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={disabled || uploadLogo.isPending}
                  onClick={() => fileInputRef.current?.click()}
                  className="h-9 gap-2 rounded-xl px-4 text-xs font-semibold"
                >
                  {uploadLogo.isPending ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> Đang tải...
                    </>
                  ) : (
                    <>{info.logoUrl ? "Đổi logo" : "Tải logo lên"}</>
                  )}
                </Button>

                {/* Xem trước xong mà đổi ý thì trả về đúng logo đang lưu, chưa ghi gì vào backend */}
                {logoChanged ? (
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    disabled={disabled}
                    onClick={() => onInfoChange({ ...info, logoUrl: savedLogoUrl })}
                    className="h-auto p-0 text-xs text-status-danger"
                  >
                    Huỷ đổi logo
                  </Button>
                ) : null}
              </div>
              <p className="text-xs text-text-tertiary">
                {logoChanged
                  ? 'Đang xem trước — bấm "Lưu cấu hình" để áp dụng.'
                  : "PNG hoặc JPG, tối đa 5MB."}
              </p>
            </div>
          </div>
        </div>

        <FormField label="Tên nhà hàng" htmlFor="restaurant-name" required>
          <Input
            id="restaurant-name"
            value={info.restaurantName}
            disabled={disabled}
            onChange={(e) => onInfoChange({ ...info, restaurantName: e.target.value })}
            placeholder="Nhập tên nhà hàng"
          />
        </FormField>

        <FormField label="Mã số thuế" htmlFor="tax-code">
          <Input
            id="tax-code"
            value={info.taxCode}
            disabled={disabled}
            onChange={(e) => onInfoChange({ ...info, taxCode: e.target.value })}
            placeholder="Nhập mã số thuế"
          />
          {/* QĐ-25 (câu #28): cho sửa nhưng phải nói rõ hoá đơn đã phát hành là bất biến (BR-09) */}
          {taxCodeChanged ? (
            <p className="mt-1.5 flex items-start gap-1.5 text-xs text-status-warning">
              <AlertTriangle className="mt-px size-3.5 shrink-0" />
              <span>
                Đổi mã số thuế <strong>không sửa các hoá đơn đã phát hành</strong> — hoá đơn cũ giữ
                nguyên mã số thuế tại thời điểm phát hành (BR-09). Mã mới chỉ áp cho hoá đơn phát
                hành từ sau khi lưu.
              </span>
            </p>
          ) : null}
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Địa chỉ" htmlFor="restaurant-address">
            <Input
              id="restaurant-address"
              value={info.address}
              disabled={disabled}
              onChange={(e) => onInfoChange({ ...info, address: e.target.value })}
              placeholder="VD: 123 Nguyễn Huệ, Q1, TP.HCM"
            />
          </FormField>

          <FormField label="Điện thoại" htmlFor="restaurant-phone">
            <Input
              id="restaurant-phone"
              value={info.phone}
              disabled={disabled}
              onChange={(e) => onInfoChange({ ...info, phone: e.target.value })}
              placeholder="VD: 0901234567"
            />
          </FormField>
        </div>
      </div>

      {/* ================= KHỐI 2: THUẾ & PHÍ — CHỈ ĐỂ XEM ================= */}
      <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-4">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">Thuế & phí</h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            Mặc định cho <strong>chi nhánh mới</strong> · không phải số đang áp cho hoá đơn
          </p>
        </div>

        {/*
          QĐ-20 (câu #20): VAT và phí dịch vụ là cấu hình CỦA TỪNG CHI NHÁNH (FR-BRN-02 nhóm 2),
          và được sao cứng vào phiên lúc mở bàn (BR-08). Để ô sửa được ở đây là cái bẫy: người
          dùng đổi rồi tưởng mọi chi nhánh đã áp, trong khi hoá đơn vẫn lấy số của chi nhánh.
        */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            { label: "VAT", value: `${DEFAULT_BRANCH_TAX_AND_FEE.vatPercent}%` },
            { label: "Phí dịch vụ", value: `${DEFAULT_BRANCH_TAX_AND_FEE.serviceFeePercent}%` },
            {
              label: "Phí dịch vụ chịu VAT",
              value: DEFAULT_BRANCH_TAX_AND_FEE.vatAppliedOnServiceFee ? "Có" : "Không",
            },
          ].map((item) => (
            <div key={item.label} className="rounded-xl border border-border-default px-4 py-3">
              <p className="text-xs text-text-tertiary">{item.label}</p>
              <p className="mt-0.5 text-lg font-bold text-text-primary">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="flex items-start gap-2.5 rounded-xl bg-surface-muted px-4 py-3">
          <Building2 className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
          <p className="text-xs text-text-secondary">
            Số thực tế dùng khi tính tiền là số <strong>của từng chi nhánh</strong>, sao cứng vào
            phiên lúc mở bàn (BR-08). Sửa tại <strong>Chi nhánh → Cấu hình → Thuế &amp; phí</strong>
            .
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 rounded-xl px-4 text-xs font-semibold"
          onClick={() => navigate(RESTAURANT_ADMIN_PATHS.BRANCH)}
        >
          Mở danh sách chi nhánh
          <ChevronRight className="size-3.5" />
        </Button>
      </div>

      {/* ================= KHỐI 3: VAI TRÒ & PHÂN QUYỀN — LIÊN KẾT ================= */}
      {/*
        QĐ-23 (câu #24): bỏ bảng "Vai trò nhân viên" từng dựng bằng số người viết cứng. Ma trận
        quyền đầy đủ (Bảng 4.2 + 4.3) đã có trang riêng, số nhân sự đã có ở trang Nhân viên.
      */}
      <button
        type="button"
        onClick={() => navigate(RESTAURANT_ADMIN_PATHS.ROLES_PERMISSIONS)}
        className="flex w-full items-center gap-4 rounded-card border border-border-default bg-surface-card p-6 text-left shadow-2xs transition-colors hover:border-border-strong hover:bg-surface-muted/40"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-text-tertiary">
          <ShieldCheck className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold tracking-tight text-text-primary">
            Vai trò &amp; phân quyền
          </span>
          <span className="mt-0.5 block text-xs text-text-tertiary">
            6 vai trò cố định của đặc tả · xem ma trận quyền theo chức năng (FR-ADM-02)
          </span>
        </span>
        <ChevronRight className="size-5 shrink-0 text-text-tertiary" />
      </button>
    </div>
  )
}

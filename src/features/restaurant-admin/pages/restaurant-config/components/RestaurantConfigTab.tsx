import React from "react"
import { useNavigate } from "react-router-dom"
import { ShieldCheck } from "lucide-react"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import type {
  RestaurantInfoConfig,
  TaxAndFeeConfig,
  StaffRoleSummary,
} from "../types"

interface RestaurantConfigTabProps {
  info: RestaurantInfoConfig
  onInfoChange: (info: RestaurantInfoConfig) => void
  taxAndFee: TaxAndFeeConfig
  onTaxAndFeeChange: (taxAndFee: TaxAndFeeConfig) => void
  roles: StaffRoleSummary[]
}

/**
 * Tab "Nhà hàng" — Cấu hình cấp toàn hệ thống nhà hàng
 * Nguồn: QuanLy/Cấu hình.png
 */
export const RestaurantConfigTab: React.FC<RestaurantConfigTabProps> = ({
  info,
  onInfoChange,
  taxAndFee,
  onTaxAndFeeChange,
  roles,
}) => {
  const navigate = useNavigate()

  const handleNavigateRoles = () => {
    navigate(RESTAURANT_ADMIN_PATHS.ROLES_PERMISSIONS)
  }

  return (
    <div className="space-y-6 pt-2">
      {/* ================= CARD 1: THÔNG TIN DOANH NGHIỆP ================= */}
      <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Thông tin doanh nghiệp
          </h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            Cấp toàn hệ thống · áp dụng cho mọi chi nhánh
          </p>
        </div>

        {/* Logo nhà hàng */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-text-primary select-none">
            Logo nhà hàng
          </label>
          <div className="flex items-center gap-4">
            {/* Logo avatar vuông tròn chữ P */}
            <div className="size-14 rounded-2xl bg-brand-primary text-text-on-brand font-extrabold text-2xl flex items-center justify-center shadow-xs select-none shrink-0">
              {info.logoText || "P"}
            </div>

            <div className="space-y-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-xl h-9 px-4 text-xs font-semibold border-border-default hover:bg-surface-muted cursor-pointer"
                onClick={() => console.log("Mở dialog đổi logo")}
              >
                Đổi logo
              </Button>
              <p className="text-xs text-text-tertiary">
                {info.logoSubtext || "PNG nền trong suốt"}
              </p>
            </div>
          </div>
        </div>

        {/* Tên nhà hàng */}
        <FormField label="Tên nhà hàng" htmlFor="restaurant-name">
          <Input
            id="restaurant-name"
            value={info.restaurantName}
            onChange={(e) =>
              onInfoChange({ ...info, restaurantName: e.target.value })
            }
            placeholder="Nhập tên nhà hàng"
          />
        </FormField>

        {/* Mã số thuế */}
        <FormField label="Mã số thuế" htmlFor="tax-code">
          <Input
            id="tax-code"
            value={info.taxCode}
            onChange={(e) => onInfoChange({ ...info, taxCode: e.target.value })}
            placeholder="Nhập mã số thuế"
          />
        </FormField>
      </div>

      {/* ================= CARD 2: THUẾ & PHÍ ================= */}
      <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Thuế & phí
          </h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            Áp dụng khi tính tiền (snapshot theo phiên)
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="VAT (%)" htmlFor="vat-percent">
            <Input
              id="vat-percent"
              value={taxAndFee.vatPercent}
              onChange={(e) =>
                onTaxAndFeeChange({ ...taxAndFee, vatPercent: e.target.value })
              }
              placeholder="8"
            />
          </FormField>

          <FormField label="Phí dịch vụ (%)" htmlFor="service-fee-percent">
            <Input
              id="service-fee-percent"
              value={taxAndFee.serviceFeePercent}
              onChange={(e) =>
                onTaxAndFeeChange({
                  ...taxAndFee,
                  serviceFeePercent: e.target.value,
                })
              }
              placeholder="5"
            />
          </FormField>
        </div>

        {/* Switch Áp VAT lên cả phí dịch vụ */}
        <div className="flex items-center gap-3 pt-1">
          <Switch
            id="apply-vat-on-fee"
            checked={taxAndFee.applyVatOnServiceFee}
            onCheckedChange={(checked) =>
              onTaxAndFeeChange({ ...taxAndFee, applyVatOnServiceFee: checked })
            }
            className="cursor-pointer"
          />
          <label
            htmlFor="apply-vat-on-fee"
            className="text-sm font-medium text-text-primary cursor-pointer select-none"
          >
            Áp VAT lên cả phí dịch vụ
          </label>
        </div>
      </div>

      {/* ================= CARD 3: VAI TRÒ NHÂN VIÊN ================= */}
      <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-5">
        <div>
          <h2 className="text-base font-bold text-text-primary tracking-tight">
            Vai trò nhân viên
          </h2>
          <p className="text-xs text-text-tertiary mt-0.5">
            {roles.length} vai trò, phân quyền theo chức năng
          </p>
        </div>

        <div className="divide-y divide-border-default border border-border-default rounded-xl overflow-hidden">
          {roles.map((role) => (
            <div
              key={role.id}
              className="p-4 flex items-center justify-between gap-4 hover:bg-surface-muted/30 transition-colors"
            >
              {/* Cụm trái: Avatar / Icon + Tên vai trò */}
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="size-9 rounded-xl bg-surface-muted flex items-center justify-center text-text-secondary shrink-0">
                  <ShieldCheck className="size-4.5 text-text-tertiary" />
                </div>
                <span className="font-semibold text-sm text-text-primary tracking-tight truncate">
                  {role.name}
                </span>
              </div>

              {/* Cụm phải: Số người + Nút Phân quyền */}
              <div className="flex items-center gap-4 shrink-0">
                <span className="text-sm text-text-secondary">
                  {role.userCount} người
                </span>

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleNavigateRoles}
                  className="rounded-lg h-8 px-3 text-xs font-medium border-border-default hover:bg-surface-muted cursor-pointer"
                >
                  Phân quyền
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

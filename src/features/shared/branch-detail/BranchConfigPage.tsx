import { BranchGeofenceConfig } from "./components/BranchGeofenceConfig"
import { useEffect, useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { PageHeader } from "@/components/layout/PageHeader"
import {
  useBranch,
  useUpdateBranchManagerConfig,
  useUpdateBranchAdminConfig,
} from "@/api/branches.api"
import { useOpenSessionsByBranch } from "@/api/table-sessions.api"
import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE } from "@/config/roles"
import { getErrorMessage } from "@/lib/http"
import { BranchConfigManagerTab } from "./components/BranchConfigManagerTab"
import { BranchConfigAdminTab } from "./components/BranchConfigAdminTab"
import type { BranchConfigData, BranchAdminConfigData } from "./types"

interface BranchConfigPageProps {
  /** ID chi nhánh đang cấu hình. Quản lý chi nhánh: chi nhánh của mình. Quản trị NH: theo :branchId. */
  branchId: number
}

/** BE trả LocalTime dạng "HH:mm:ss" — ô <input type="time"> chỉ nhận "HH:mm". */
function toHhMm(value?: string | null): string {
  if (!value) return ""
  return value.slice(0, 5)
}

/**
 * Ngược lại: "HH:mm" -> "HH:mm:ss" cho BE.
 *
 * Rỗng thì trả `null` — KHÔNG phải `undefined`. Backend nay phân biệt "không gửi field"
 * với "gửi null để xoá trắng" (be-issues mục 7), nên gửi null là gỡ được giờ bắt đầu ngày
 * kinh doanh. Trước đây trường này KHÔNG xoá trắng được bằng bất kỳ cách nào.
 */
function toHhMmSs(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? `${trimmed}:00` : null
}

/** Ô để trống ⇒ `null` = xoá trắng cấu hình ở backend. */
function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

/**
 * Cấu hình chi nhánh (FR-BRN-02) — chia 2 nhóm:
 * - Nhóm 1 (Quản lý chi nhánh + Quản trị NH): giờ giấc, TK ngân hàng, thời gian tự huỷ
 * - Nhóm 2 (CHỈ Quản trị NH): VAT, phí DV, ngưỡng duyệt chiết khấu, MST chi nhánh
 *
 * Quản lý chi nhánh chỉ thấy Nhóm 1 (có nút Lưu) và Nhóm 2 dạng chỉ đọc (không có nút Lưu).
 * Quản trị nhà hàng thấy cả hai nhóm, mỗi nhóm có nút Lưu riêng.
 */
export function BranchConfigPage({ branchId }: BranchConfigPageProps) {
  const { toast } = useToast()
  const userRole = useAuthStore((state) => state.role)
  const isRestaurantAdmin = userRole === APP_ROLE.RESTAURANT_ADMIN

  const { data: branch } = useBranch(branchId)
  const { data: openSessions = [] } = useOpenSessionsByBranch(branchId)

  const updateManagerConfig = useUpdateBranchManagerConfig()
  const updateAdminConfig = useUpdateBranchAdminConfig()

  // State cho Nhóm 1 (Manager config)
  const [managerConfig, setManagerConfig] = useState<BranchConfigData>({
    openingHours: "",
    businessDayStartTime: "",
    bankAccountNo: "",
    bankName: "",
    autoCancelWaitingMinutes: 10,
    reservationHoldingMinutes: 15,
  })

  // State cho Nhóm 2 (Admin config)
  const [adminConfig, setAdminConfig] = useState<BranchAdminConfigData>({
    vatRate: 0,
    serviceFeeRate: 0,
    vatAppliedOnServiceFee: false,
    discountApprovalThreshold: 0,
    taxCode: "",
  })

  // Đổ dữ liệu thật của chi nhánh vào form khi tải xong / khi đổi chi nhánh.
  useEffect(() => {
    if (!branch) return

    // Nhóm 1
    setManagerConfig((prev) => ({
      ...prev,
      openingHours:
        branch.openingTime && branch.closingTime
          ? `${toHhMm(branch.openingTime)} – ${toHhMm(branch.closingTime)}`
          : prev.openingHours,
      businessDayStartTime: toHhMm(branch.businessDayStartTime),
      bankAccountNo: branch.bankAccountNo ?? "",
      bankName: branch.bankName ?? "",
      autoCancelWaitingMinutes:
        branch.pendingConfirmTimeoutMinutes ?? prev.autoCancelWaitingMinutes,
      reservationHoldingMinutes: branch.reservationHoldMinutes ?? prev.reservationHoldingMinutes,
    }))

    // Nhóm 2
    setAdminConfig({
      vatRate: branch.vatRate ?? 0,
      serviceFeeRate: branch.serviceFeeRate ?? 0,
      vatAppliedOnServiceFee: branch.vatAppliedOnServiceFee ?? false,
      discountApprovalThreshold: branch.discountApprovalThreshold ?? 0,
      taxCode: branch.taxCode ?? "",
    })
  }, [branch])

  const branchName = branch?.name ?? ""
  const branchAddress = branch?.address ?? ""

  async function handleSaveManagerConfig() {
    try {
      await updateManagerConfig.mutateAsync({
        id: branchId,
        body: {
          businessDayStartTime: toHhMmSs(managerConfig.businessDayStartTime),
          ...(isRestaurantAdmin
            ? {
                bankAccountNo: blankToNull(managerConfig.bankAccountNo),
                bankName: blankToNull(managerConfig.bankName),
              }
            : {}),
          pendingConfirmTimeoutMinutes: Number(managerConfig.autoCancelWaitingMinutes) || undefined,
          reservationHoldMinutes: Number(managerConfig.reservationHoldingMinutes) || undefined,
        },
      })
      toast({
        title: "Thành công",
        description: `Đã lưu cấu hình quản lý cho ${branchName}.`,
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Không lưu được cấu hình",
        description: getErrorMessage(error),
        variant: "danger",
      })
    }
  }

  async function handleSaveAdminConfig() {
    // BR-08: Cảnh báo nếu có phiên đang mở và đổi VAT/phí dịch vụ
    const vatChanged = branch?.vatRate !== adminConfig.vatRate
    const feeChanged = branch?.serviceFeeRate !== adminConfig.serviceFeeRate
    const hasOpenSessions =
      openSessions.filter((s) => s.status === "SERVING" || s.status === "WAITING_FOR_PAY").length >
      0

    if ((vatChanged || feeChanged) && hasOpenSessions) {
      const openCount = openSessions.filter(
        (s) => s.status === "SERVING" || s.status === "WAITING_FOR_PAY",
      ).length

      const confirmed = window.confirm(
        `Hiện có ${openCount} phiên đang mở sẽ vẫn dùng mức VAT/phí dịch vụ cũ.\n\n` +
          `Các phiên mới sẽ áp dụng mức mới. Xác nhận lưu?`,
      )

      if (!confirmed) return
    }

    try {
      const result = await updateAdminConfig.mutateAsync({
        id: branchId,
        body: {
          vatRate: adminConfig.vatRate,
          serviceFeeRate: adminConfig.serviceFeeRate,
          vatAppliedOnServiceFee: adminConfig.vatAppliedOnServiceFee,
          discountApprovalThreshold: adminConfig.discountApprovalThreshold,
          taxCode: blankToNull(adminConfig.taxCode) ?? undefined,
        },
      })

      // Kiểm tra số phiên BE báo với số phiên FE đếm được
      if (
        result.openSessionCount !== undefined &&
        result.openSessionCount !== openSessions.length
      ) {
        console.warn(
          `BE báo ${result.openSessionCount} phiên mở, FE đếm được ${openSessions.length}`,
        )
      }

      toast({
        title: "Thành công",
        description: `Đã lưu cấu hình quản trị cho ${branchName}.`,
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Không lưu được cấu hình",
        description: getErrorMessage(error),
        variant: "danger",
      })
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      <PageHeader
        title="Cấu hình chi nhánh"
        subtitle={`${branchName} · ${branchAddress}`}
        mobileSubtitle={branchName}
      />

      <div className="flex flex-col gap-6 p-6 lg:p-8">
        {isRestaurantAdmin && <BranchGeofenceConfig branchId={branchId} readOnly={false} />}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 lg:grid-rows-[auto_1fr_auto]">
          <BranchConfigManagerTab
            config={managerConfig}
            onConfigChange={setManagerConfig}
            loadedBankName={branch?.bankName ?? ""}
            canEditBankAccount={isRestaurantAdmin}
            selectedBranch={branchName}
            onSave={handleSaveManagerConfig}
            isSaving={updateManagerConfig.isPending}
          />
          <BranchConfigAdminTab
            config={adminConfig}
            onConfigChange={setAdminConfig}
            selectedBranch={branchName}
            onSave={isRestaurantAdmin ? handleSaveAdminConfig : undefined}
            isSaving={updateAdminConfig.isPending}
            readOnly={!isRestaurantAdmin}
          />
        </div>
      </div>
    </div>
  )
}

export default BranchConfigPage

import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { BranchConfigTab } from "./components/BranchConfigTab"
import { MOCK_BRANCH_DETAILS, MOCK_BRANCH_CONFIGS } from "./mock-data"
import type { BranchConfigData } from "./types"

interface BranchConfigPageProps {
  /** ID chi nhánh đang cấu hình. Quản lý chi nhánh: chi nhánh của mình. Quản trị NH: theo :branchId. */
  branchId: number
}

/**
 * Cấu hình chi nhánh (giờ giấc, TK ngân hàng, thời gian tự huỷ phiên — FR-BRN-02) — dùng chung bởi:
 *  - Quản lý chi nhánh: nav riêng "Cấu hình" (chỉ xem/sửa được cấu hình chi nhánh của mình).
 *  - Quản trị nhà hàng: nút "Cấu hình chi nhánh" trên trang chi tiết chi nhánh (sửa 1 chi nhánh bất kỳ).
 * Không liên quan tới trang "Cấu hình" cấp NHÀ HÀNG (VAT/phí DV/ngưỡng chiết khấu/MST) —
 * xem @/features/restaurant-admin/pages/restaurant-config, chỉ Quản trị NH mới có.
 * Nguồn: QuanLy/Cấu hình · Chi nhánh.png
 */
export function BranchConfigPage({ branchId }: BranchConfigPageProps) {
  const { toast } = useToast()
  const branch = MOCK_BRANCH_DETAILS[branchId] || MOCK_BRANCH_DETAILS[1]
  const initialConfig = MOCK_BRANCH_CONFIGS[branchId] || MOCK_BRANCH_CONFIGS[1]

  const [config, setConfig] = useState<BranchConfigData>(initialConfig)
  const [isSaving, setIsSaving] = useState(false)

  const handleSave = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: "Thành công",
        description: `Đã lưu thay đổi cấu hình cho ${branch.name} thành công!`,
        variant: "success",
      })
    }, 400)
  }

  return (
    <div className="flex flex-col min-h-full bg-surface-page p-6 lg:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Cấu hình chi nhánh</h1>
        <p className="text-sm text-text-tertiary mt-0.5">{branch.name} · {branch.address}</p>
      </div>

      <BranchConfigTab
        config={config}
        onConfigChange={setConfig}
        selectedBranch={branch.name}
        onSave={handleSave}
        isSaving={isSaving}
      />
    </div>
  )
}

export default BranchConfigPage

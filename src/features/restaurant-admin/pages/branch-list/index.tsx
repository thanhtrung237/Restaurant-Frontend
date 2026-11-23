import { useMemo, useState } from "react"
import { AlertTriangle, Building2, Plus } from "lucide-react"
import { FAB } from "@/components/common/FAB"
import { FAB_POSITION_CLASS } from "@/components/layout/StickyActionBar"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { EmptyState } from "@/components/common/EmptyState"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/auth.store"
import { ApiError, getErrorMessage } from "@/lib/http"
import { cn } from "@/lib/utils"
import {
  useBranchesByRestaurant,
  useChangeBranchStatus,
  useCopyBranchConfig,
  useCreateBranch,
  useUpdateBranch,
} from "@/features/restaurant-admin/api"
import type { BranchListItem } from "@/types/models"
import { BranchCard } from "./components/BranchCard"
import { BranchModal } from "./components/BranchModal"
import { BranchStatusDialog } from "./components/BranchStatusDialog"
import {
  BRANCH_FILTER_OPTIONS,
  type BranchSaveResult,
  type BranchStatusFilter,
  type BranchSubmitData,
} from "./types"

/**
 * Quản lý chi nhánh (FR-BRN-01) — chỉ Quản trị nhà hàng (MANAGER), route đã bọc `RequireRole`.
 *
 * Dữ liệu thật: `GET /branches/restaurant/{restaurantId}`. Endpoint này không trả số bàn
 * (`tableCount` luôn null) nên card không có cột số bàn.
 *
 * Không có nút "Xóa chi nhánh": chỉ Ngừng hoạt động / Kích hoạt lại (`PUT /branches/{id}/status`).
 */
export default function BranchListPage() {
  const { toast } = useToast()
  const restaurantId = useAuthStore((s) => s.account?.restaurantId)

  const branchesQuery = useBranchesByRestaurant(restaurantId)
  const createBranch = useCreateBranch()
  const updateBranch = useUpdateBranch()
  const copyConfig = useCopyBranchConfig()
  const changeStatus = useChangeBranchStatus()

  const [statusFilter, setStatusFilter] = useState<BranchStatusFilter>("ALL")
  const [modal, setModal] = useState<{ open: boolean; branch: BranchListItem | null }>({
    open: false,
    branch: null,
  })
  const [statusTarget, setStatusTarget] = useState<BranchListItem | null>(null)

  const branches = useMemo(() => branchesQuery.data ?? [], [branchesQuery.data])
  const activeCount = useMemo(() => branches.filter((b) => b.status === "ACTIVE").length, [branches])
  const filtered = useMemo(
    () => (statusFilter === "ALL" ? branches : branches.filter((b) => b.status === statusFilter)),
    [branches, statusFilter],
  )

  const isSaving = createBranch.isPending || updateBranch.isPending || copyConfig.isPending

  const openAddModal = () => setModal({ open: true, branch: null })
  const openEditModal = (branch: BranchListItem) => setModal({ open: true, branch })
  const closeModal = () => setModal({ open: false, branch: null })

  /** Trả `{ codeError }` để modal gắn lỗi vào ô mã; các lỗi khác toast và giữ modal để sửa lại. */
  async function handleSubmit(data: BranchSubmitData): Promise<BranchSaveResult> {
    const editing = modal.branch

    if (editing) {
      try {
        // PUT không nhận `code` → không gửi. Chuỗi rỗng để BE xóa trắng địa chỉ / SĐT.
        await updateBranch.mutateAsync({
          id: editing.id,
          body: { name: data.name, address: data.address, phone: data.phone },
        })
        toast({ title: `Đã cập nhật "${data.name}"`, variant: "success" })
        closeModal()
        return {}
      } catch (error) {
        toast({ title: "Không lưu được chi nhánh", description: getErrorMessage(error), variant: "danger" })
        return {}
      }
    }

    let created
    try {
      created = await createBranch.mutateAsync({
        restaurantId: restaurantId as number,
        code: data.code,
        name: data.name,
        address: data.address || undefined,
        phone: data.phone || undefined,
        vatRate: data.vatRate,
        serviceFeeRate: data.serviceFeeRate,
      })
    } catch (error) {
      // 409: trùng mã trong nhà hàng → hiện ngay cạnh ô mã.
      if (error instanceof ApiError && error.status === 409) return { codeError: error.message }
      toast({ title: "Không thêm được chi nhánh", description: getErrorMessage(error), variant: "danger" })
      return {}
    }

    if (data.copy) {
      try {
        await copyConfig.mutateAsync({ id: created.id, body: data.copy })
        toast({ title: `Đã thêm "${data.name}" và sao chép cấu hình`, variant: "success" })
      } catch (error) {
        // Chi nhánh đã được tạo; thử lại form sẽ báo trùng mã nên đóng modal và hướng dẫn cấu hình tay.
        toast({
          title: `Đã thêm "${data.name}" nhưng chưa sao chép được cấu hình`,
          description: `${getErrorMessage(error)} — vào trang cấu hình của chi nhánh để thiết lập.`,
          variant: "danger",
        })
      }
    } else {
      toast({ title: `Đã thêm chi nhánh "${data.name}"`, variant: "success" })
    }
    closeModal()
    return {}
  }

  async function handleConfirmStatus() {
    if (!statusTarget) return
    const next = statusTarget.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    try {
      await changeStatus.mutateAsync({ id: statusTarget.id, status: next })
      toast({
        title:
          next === "INACTIVE"
            ? `Đã ngừng hoạt động "${statusTarget.name}"`
            : `Đã kích hoạt lại "${statusTarget.name}"`,
        variant: "success",
      })
      setStatusTarget(null)
    } catch (error) {
      toast({ title: "Không đổi được trạng thái", description: getErrorMessage(error), variant: "danger" })
    }
  }

  const subtitle = branchesQuery.isLoading
    ? "Đang tải danh sách…"
    : `${branches.length} chi nhánh · ${activeCount} đang hoạt động`

  function renderBody() {
    if (!restaurantId) {
      return (
        <EmptyState
          icon={AlertTriangle}
          title="Không xác định được nhà hàng"
          description="Tài khoản chưa gắn với nhà hàng nào. Vui lòng đăng nhập lại."
        />
      )
    }
    if (branchesQuery.isLoading) {
      return (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="h-64 animate-pulse rounded-card border border-border-default bg-surface-card" />
          ))}
        </div>
      )
    }
    if (branchesQuery.isError) {
      return (
        <EmptyState
          icon={AlertTriangle}
          title="Không tải được danh sách chi nhánh"
          description={getErrorMessage(branchesQuery.error)}
          action={{ label: "Thử lại", onClick: () => void branchesQuery.refetch() }}
        />
      )
    }
    if (branches.length === 0) {
      return (
        <EmptyState
          icon={Building2}
          title="Chưa có chi nhánh nào"
          description="Thêm chi nhánh đầu tiên để bắt đầu khai báo bàn, menu và cấu hình riêng."
          action={{ label: "+ Thêm chi nhánh", onClick: openAddModal }}
        />
      )
    }
    if (filtered.length === 0) {
      return (
        <EmptyState
          icon={Building2}
          title="Không có chi nhánh phù hợp"
          description="Không có chi nhánh nào ở trạng thái đã chọn. Thử đổi bộ lọc."
        />
      )
    }
    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((branch) => (
          <BranchCard
            key={branch.id}
            branch={branch}
            onEdit={openEditModal}
            onToggleStatus={setStatusTarget}
          />
        ))}
      </div>
    )
  }

  const canAdd = Boolean(restaurantId)

  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      <PageHeader
        title="Chi nhánh"
        subtitle={`${subtitle} · mỗi chi nhánh có cấu hình, bàn và báo cáo riêng`}
        mobileSubtitle={subtitle}
        actions={
          <Button type="button" onClick={openAddModal} disabled={!canAdd} className="h-10 gap-1.5 px-4">
            <Plus className="size-4 stroke-[2.5]" />
            <span>Thêm chi nhánh</span>
          </Button>
        }
      />

      <div className="flex flex-col gap-6 p-6 lg:p-8">
        {branches.length > 0 ? (
          <div className="flex items-center gap-2" role="group" aria-label="Lọc theo trạng thái">
            {BRANCH_FILTER_OPTIONS.map((option) => {
              const isActive = statusFilter === option.id
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setStatusFilter(option.id)}
                  aria-pressed={isActive}
                  className={cn(
                    "cursor-pointer rounded-full px-4 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-[#EA4A2A] text-white shadow-xs"
                      : "border border-gray-200 bg-white text-gray-700 hover:bg-gray-50",
                  )}
                >
                  {option.label}
                </button>
              )
            })}
          </div>
        ) : null}

        {renderBody()}
      </div>

      <BranchModal
        isOpen={modal.open}
        onClose={closeModal}
        onSubmit={handleSubmit}
        initialData={modal.branch}
        branches={branches}
        isSaving={isSaving}
      />

      <BranchStatusDialog
        branch={statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={() => void handleConfirmStatus()}
        isSaving={changeStatus.isPending}
      />

      {/* "Thêm chi nhánh" (FR-BRN-01) — FAB ở <md */}
      {canAdd ? (
        <FAB
          variant="circle"
          aria-label="Thêm chi nhánh"
          title="Thêm chi nhánh"
          icon={<Plus className="size-6 text-white" strokeWidth={2.5} />}
          onClick={openAddModal}
          className={FAB_POSITION_CLASS}
        />
      ) : null}
    </div>
  )
}

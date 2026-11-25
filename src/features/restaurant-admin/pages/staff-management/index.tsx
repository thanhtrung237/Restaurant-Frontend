import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { FAB } from "@/components/common/FAB"
import { FAB_POSITION_CLASS } from "@/components/layout/StickyActionBar"
import { PageHeader } from "@/components/layout/PageHeader"
import { useToast } from "@/hooks/use-toast"
import { ApiError, getErrorMessage } from "@/lib/http"
import { useAuthStore } from "@/stores/auth.store"
import {
  useAccountsByRestaurant,
  useBranchesByRestaurant,
  useChangeAccountStatus,
  useCreateAccount,
  useCreateAssignment,
  useDeleteAssignment,
  useResetPassword,
  useRolesByRestaurant,
  useUpdateAccount,
} from "@/features/restaurant-admin/api"
import { StaffHeaderActions } from "./components/StaffHeader"
import { StaffTabs } from "./components/StaffTabs"
import {
  StaffFilterBar,
  type StaffFilterOption,
  type StaffFilterValue,
} from "./components/StaffFilterBar"
import { StaffTable } from "./components/StaffTable"
import { StaffFormModal, type StaffFormSubmitData } from "./components/StaffFormModal"
import { ResetPasswordModal } from "./components/ResetPasswordModal"
import { DisableAccountDialog } from "./components/DisableAccountDialog"
import { countDistinctRoles, matchesStaffSearch, toStaffRow } from "./lib"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import {
  ACCOUNT_STATUS_LABEL,
  type StaffRow,
  type StaffStatusFilter,
  type StaffTabType,
} from "./types"

/** Mã vai trò Quản trị nhà hàng — trùng `TenantGuard.ROLE_MANAGER` ở backend. */
const MANAGER_ROLE_CODE = "MANAGER"

/**
 * Quản lý nhân viên — Màn hình thuộc Quản trị nhà hàng (restaurant-admin)
 * Nguồn: Desktop / Quản lý nhân viên.png, Modal · Thêm nhân viên.png, Modal · Sửa nhân viên.png
 *
 * Dữ liệu thật: `GET /accounts/restaurant/{id}` (kèm `assignments`); chi nhánh và vai trò cho
 * hai dropdown lấy từ `GET /branches/restaurant/{id}` và `GET /roles/restaurant/{id}`.
 */
export default function StaffManagementPage() {
  const navigate = useNavigate()
  const { toast } = useToast()
  const restaurantId = useAuthStore((s) => s.account?.restaurantId)
  const currentAccountId = useAuthStore((s) => s.account?.id)

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>("ALL")
  const [selectedBranch, setSelectedBranch] = useState<StaffFilterValue>("ALL")
  const [selectedRole, setSelectedRole] = useState<StaffFilterValue>("ALL")

  const [formModal, setFormModal] = useState<{ open: boolean; staff: StaffRow | null }>({
    open: false,
    staff: null,
  })
  const [resetPasswordFor, setResetPasswordFor] = useState<StaffRow | null>(null)
  /** QĐ-12: vô hiệu hoá phải xác nhận; kích hoạt lại thì không. */
  const [disableTarget, setDisableTarget] = useState<StaffRow | null>(null)
  /** Lỗi 409 trùng tên đăng nhập — gắn ngay dưới ô trong modal, không chỉ toast. */
  const [usernameError, setUsernameError] = useState<string | null>(null)

  const accountsQuery = useAccountsByRestaurant(restaurantId)
  const branchesQuery = useBranchesByRestaurant(restaurantId)
  const rolesQuery = useRolesByRestaurant(restaurantId)

  const createAccount = useCreateAccount()
  const updateAccount = useUpdateAccount()
  const changeStatus = useChangeAccountStatus()
  const resetPassword = useResetPassword()
  const createAssignment = useCreateAssignment()
  const deleteAssignment = useDeleteAssignment()

  const isSaving =
    createAccount.isPending ||
    updateAccount.isPending ||
    createAssignment.isPending ||
    deleteAssignment.isPending

  function notifyError(title: string, error: unknown) {
    toast({ title, description: getErrorMessage(error), variant: "danger" })
  }

  const allRows = useMemo(() => (accountsQuery.data ?? []).map(toStaffRow), [accountsQuery.data])

  const branchOptions = useMemo<StaffFilterOption[]>(
    () => [
      { value: "ALL", label: "Tất cả chi nhánh" },
      ...(branchesQuery.data ?? []).map((branch) => ({ value: branch.id, label: branch.name })),
    ],
    [branchesQuery.data],
  )

  const roleOptions = useMemo<StaffFilterOption[]>(
    () => [
      { value: "ALL", label: "Tất cả vai trò" },
      ...(rolesQuery.data ?? []).map((role) => ({ value: role.id, label: role.name })),
    ],
    [rolesQuery.data],
  )

  const filteredStaff = useMemo(() => {
    return allRows.filter((row) => {
      if (!matchesStaffSearch(row, searchTerm)) return false
      if (statusFilter !== "ALL" && row.status !== statusFilter) return false
      // Khớp khi tài khoản có BẤT KỲ phân công nào ở chi nhánh đang chọn.
      if (selectedBranch !== "ALL" && !row.branchIds.includes(selectedBranch)) return false
      if (selectedRole !== "ALL" && !row.roleIds.includes(selectedRole)) return false
      return true
    })
  }, [allRows, searchTerm, statusFilter, selectedBranch, selectedRole])

  /**
   * Vì sao KHÔNG cho vô hiệu hoá tài khoản này (null = cho phép).
   *
   * Cả hai trường hợp đều không có đường quay lại: người vừa bị khoá không đăng nhập được để
   * tự mở, mà cũng không còn ai khác đủ quyền mở hộ. Backend chặn lần nữa bằng 409 — chốt ở
   * giao diện chỉ để người dùng biết TRƯỚC, không phải lớp bảo vệ duy nhất.
   */
  function disableReasonOf(row: StaffRow): string | null {
    if (row.id === currentAccountId) {
      return "Không thể vô hiệu hoá tài khoản của chính bạn"
    }
    const isManager = row.roleCodes.includes(MANAGER_ROLE_CODE)
    if (isManager) {
      const otherActiveManagers = allRows.filter(
        (other) =>
          other.id !== row.id &&
          other.status === "ACTIVE" &&
          other.roleCodes.includes(MANAGER_ROLE_CODE),
      )
      if (otherActiveManagers.length === 0) {
        return "Đây là Quản trị nhà hàng cuối cùng còn hoạt động — hãy cấp vai trò này cho người khác trước"
      }
    }
    return null
  }

  // ---------------------------------------------------------------- thao tác

  const handleAddStaff = () => {
    setUsernameError(null)
    setFormModal({ open: true, staff: null })
  }

  const handleEditStaff = (staff: StaffRow) => {
    setUsernameError(null)
    setFormModal({ open: true, staff })
  }

  const closeFormModal = () => setFormModal({ open: false, staff: null })

  async function handleSaveStaff(data: StaffFormSubmitData) {
    if (!restaurantId) return
    const editing = formModal.staff
    setUsernameError(null)

    try {
      if (editing) {
        const infoChanged =
          data.fullName !== editing.fullName || (data.email ?? "") !== (editing.email ?? "")
        if (infoChanged) {
          await updateAccount.mutateAsync({
            id: editing.id,
            // Email gửi CHUỖI RỖNG chứ không phải undefined khi người dùng xoá trắng:
            // `AccountMapper.updateEntity` bỏ qua giá trị null (field không gửi = giữ nguyên),
            // nên undefined sẽ không xoá được email đang có.
            body: { fullName: data.fullName, email: data.email ?? "" },
          })
        }
        for (const assignmentId of data.assignmentIdsToRemove) {
          await deleteAssignment.mutateAsync(assignmentId)
        }
        for (const assignment of data.assignmentsToAdd) {
          await createAssignment.mutateAsync({
            accountId: editing.id,
            roleId: assignment.roleId,
            branchId: assignment.branchId,
          })
        }
        toast({ title: `Đã lưu thay đổi cho "${data.fullName}"`, variant: "success" })
        closeFormModal()
        return
      }

      // --- Tạo mới: BE không có endpoint gộp, phải gọi 2 lần ---
      // QĐ-03: không gửi `employeeCode` — backend tự sinh và trả về trong response.
      const created = await createAccount.mutateAsync({
        restaurantId,
        fullName: data.fullName,
        username: data.username,
        email: data.email,
        password: data.password ?? "",
      })

      try {
        for (const assignment of data.assignmentsToAdd) {
          await createAssignment.mutateAsync({
            accountId: created.id,
            roleId: assignment.roleId,
            branchId: assignment.branchId,
          })
        }
        toast({
          title: `Đã thêm nhân viên "${data.fullName}"`,
          description: `Mã nhân viên: ${created.employeeCode}`,
          variant: "success",
        })
        closeFormModal()
      } catch (assignmentError) {
        /*
         * Bước 2 lỗi — KHÔNG tự xoá tài khoản vừa tạo.
         *
         * Xoá là mất luôn tên đăng nhập và mã nhân viên người dùng vừa đặt, mà lỗi ở đây
         * thường chỉ là tạm thời. Đóng modal để thấy dòng mới trong bảng: dòng đó hiện
         * "Chưa gán vai trò" kèm nút "Gán vai trò".
         */
        toast({
          title: "Đã tạo tài khoản, chưa gán vai trò",
          description: `${getErrorMessage(assignmentError)} — bấm "Gán vai trò" ở dòng "${data.fullName}" để gán lại.`,
          variant: "danger",
        })
        closeFormModal()
      }
    } catch (error) {
      // 409 trùng tên đăng nhập: gắn lỗi vào đúng ô thay vì chỉ toast.
      if (error instanceof ApiError && error.status === 409 && /đăng nhập/i.test(error.message)) {
        setUsernameError(error.message)
      } else {
        notifyError(editing ? "Không lưu được nhân viên" : "Không thêm được nhân viên", error)
      }
      // KHÔNG đóng modal: giữ nguyên dữ liệu đã nhập để sửa và thử lại.
    }
  }

  /**
   * QĐ-12 — vô hiệu hoá phải qua hộp xác nhận (nhân viên mất quyền đăng nhập NGAY);
   * kích hoạt lại làm luôn, không hỏi.
   */
  function handleToggleStatus(staff: StaffRow) {
    if (staff.status === "ACTIVE") {
      setDisableTarget(staff)
      return
    }
    void changeAccountStatus(staff, "ACTIVE")
  }

  async function changeAccountStatus(staff: StaffRow, nextStatus: "ACTIVE" | "INACTIVE") {
    try {
      await changeStatus.mutateAsync({ id: staff.id, status: nextStatus })
      toast({
        title: `${ACCOUNT_STATUS_LABEL[nextStatus]}: "${staff.fullName}"`,
        variant: "success",
      })
      setDisableTarget(null)
    } catch (error) {
      notifyError("Không đổi được trạng thái tài khoản", error)
    }
  }

  async function handleResetPassword(newPassword: string) {
    const target = resetPasswordFor
    if (!target) return
    try {
      await resetPassword.mutateAsync({ id: target.id, newPassword })
      toast({ title: `Đã đặt lại mật khẩu cho "${target.fullName}"`, variant: "success" })
      setResetPasswordFor(null)
    } catch (error) {
      notifyError("Không đặt lại được mật khẩu", error)
    }
  }

  // Dòng phụ đếm trên dữ liệu thật: tổng tài khoản của nhà hàng và số vai trò đang được dùng.
  const subtitle = accountsQuery.isLoading
    ? "Đang tải danh sách…"
    : `${allRows.length} tài khoản · ${countDistinctRoles(allRows)} vai trò`

  const [activeTab, setActiveTab] = useState<StaffTabType>("staff")

  const handleTabChange = (tab: StaffTabType) => {
    setActiveTab(tab)
    if (tab === "roles") {
      navigate(RESTAURANT_ADMIN_PATHS.ROLES_PERMISSIONS)
    } else if (tab === "audit-log") {
      navigate(RESTAURANT_ADMIN_PATHS.AUDIT_LOG)
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-surface-ground">
      <PageHeader
        title="Nhân viên"
        subtitle={subtitle}
        actions={
          <StaffHeaderActions
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onAddStaff={handleAddStaff}
          />
        }
        tabs={<StaffTabs activeTab={activeTab} onTabChange={handleTabChange} />}
      />

      <div className="flex flex-col gap-6 p-6 lg:p-8">
        {/* <md: PageHeader ẩn nên tab và ô tìm phải hiện lại ở đây */}
        <div className="space-y-4 md:hidden">
          <StaffTabs activeTab={activeTab} onTabChange={handleTabChange} />
          <StaffHeaderActions
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            onAddStaff={handleAddStaff}
          />
        </div>

        <div className="space-y-4">
          <StaffFilterBar
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            branchOptions={branchOptions}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            roleOptions={roleOptions}
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
          />

          <StaffTable
            staffMembers={filteredStaff}
            isLoading={accountsQuery.isLoading}
            onEdit={handleEditStaff}
            onAssignRole={handleEditStaff}
            onToggleStatus={handleToggleStatus}
            onResetPassword={setResetPasswordFor}
            disableReasonOf={disableReasonOf}
          />
        </div>
      </div>

      {/* "Thêm nhân viên" (FR-ADM-01) — FAB ở <md */}
      <FAB
        variant="circle"
        aria-label="Thêm nhân viên"
        title="Thêm nhân viên"
        icon={<Plus className="size-6 text-white" strokeWidth={2.5} />}
        onClick={handleAddStaff}
        className={FAB_POSITION_CLASS}
      />

      <StaffFormModal
        isOpen={formModal.open}
        onClose={closeFormModal}
        onSave={handleSaveStaff}
        initialData={formModal.staff}
        initialAssignments={formModal.staff?.assignments}
        roles={rolesQuery.data ?? []}
        branches={branchesQuery.data ?? []}
        isSaving={isSaving}
        serverErrors={{ username: usernameError ?? undefined }}
        onResetPassword={() => {
          const target = formModal.staff
          closeFormModal()
          setResetPasswordFor(target)
        }}
      />

      <DisableAccountDialog
        staff={disableTarget}
        onClose={() => setDisableTarget(null)}
        onConfirm={() => {
          if (disableTarget) void changeAccountStatus(disableTarget, "INACTIVE")
        }}
        isSaving={changeStatus.isPending}
      />

      <ResetPasswordModal
        isOpen={resetPasswordFor !== null}
        onClose={() => setResetPasswordFor(null)}
        onSubmit={handleResetPassword}
        staffName={resetPasswordFor?.fullName}
        isSaving={resetPassword.isPending}
      />
    </div>
  )
}

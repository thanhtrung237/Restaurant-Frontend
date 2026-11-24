import { useRef, useState } from "react"
import { Plus, Search } from "lucide-react"
import { branchStaffRoles, useBranchStaff, type BranchStaffMember } from "@/api/branch-staff.api"
import { useBranch } from "@/api/branches.api"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StaffNavigationTabs } from "@/features/restaurant-admin/pages/staff-management/components/StaffTabs"
import { getErrorMessage } from "@/lib/http"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth.store"
import { BranchStaffDialog } from "./BranchStaffDialog"

const roleNames: Record<string, string> = {
  ...branchStaffRoles,
  BRANCH_MANAGER: "Quản lý chi nhánh",
  MANAGER: "Quản trị nhà hàng",
}

export default function BranchStaffPage() {
  const branchId = useAuthStore((state) => state.branchId)
  const accountId = useAuthStore((state) => state.account?.id)
  if (branchId == null)
    return <PageHeader title="Nhân viên chi nhánh" subtitle="Chọn chi nhánh để tiếp tục." />
  return <BranchStaff key={`${accountId}:${branchId}`} branchId={branchId} />
}

function BranchStaff({ branchId }: { branchId: number }) {
  const branch = useBranch(branchId)
  const staff = useBranchStaff(branchId)
  const [search, setSearch] = useState("")
  const [dialog, setDialog] = useState<"create" | BranchStaffMember | null>(null)
  const opener = useRef<HTMLButtonElement>(null)
  const branchName = branch.data?.name ?? "chi nhánh này"
  const term = search.trim().toLocaleLowerCase("vi")
  const rows = (staff.data ?? []).filter((employee) =>
    [employee.fullName, employee.username, employee.employeeCode].some((value) =>
      value.toLocaleLowerCase("vi").includes(term),
    ),
  )
  const tabs = <StaffNavigationTabs activeTab="staff" />
  const add = (
    <Button
      disabled={branch.data?.status !== "ACTIVE" || !staff.isSuccess}
      onClick={(event) => {
        opener.current = event.currentTarget
        setDialog("create")
      }}
    >
      <Plus className="size-4" /> Thêm nhân viên
    </Button>
  )

  return (
    <div className="flex min-h-full flex-col bg-surface-ground">
      <PageHeader
        title="Nhân viên chi nhánh"
        subtitle={branch.data?.name}
        actions={add}
        tabs={tabs}
      />
      <div className="space-y-4 p-4 sm:p-6 lg:p-8">
        <div className="md:hidden">{tabs}</div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <label className="relative w-full sm:max-w-xs">
            <Search
              aria-hidden
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-tertiary"
            />
            <Input
              aria-label="Tìm nhân viên"
              className="bg-surface-card pl-9"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên, mã hoặc tên đăng nhập…"
            />
          </label>
          <div className="md:hidden">{add}</div>
        </div>
        {branch.data?.status === "INACTIVE" && (
          <p role="status" className="text-sm text-text-secondary">
            Chi nhánh đang ngừng hoạt động. Danh sách chỉ để xem.
          </p>
        )}
        {branch.isError && (
          <p role="alert" className="text-sm text-status-danger">
            Chưa tải được thông tin chi nhánh.
          </p>
        )}
        {staff.isError ? (
          <div
            role="alert"
            className="space-y-2 rounded-card border border-border-default bg-surface-card p-5"
          >
            <p>{getErrorMessage(staff.error)}</p>
            <Button
              variant="outline"
              onClick={() => {
                void staff.refetch()
                void branch.refetch()
              }}
            >
              Thử lại
            </Button>
          </div>
        ) : staff.isPending ? (
          <p role="status" className="text-sm text-text-secondary">
            Đang tải nhân viên…
          </p>
        ) : rows.length === 0 ? (
          <p className="rounded-card border border-border-default bg-surface-card p-6 text-sm text-text-secondary">
            {term
              ? "Không tìm thấy nhân viên phù hợp."
              : "Chi nhánh chưa có nhân viên được phân công."}
          </p>
        ) : (
          <section
            aria-label="Danh sách nhân viên chi nhánh"
            className="overflow-hidden rounded-card border border-border-default bg-surface-card"
          >
            <div
              aria-hidden
              className="hidden grid-cols-[2fr_1.4fr_1fr_8.5rem] gap-4 border-b border-border-default bg-surface-muted px-5 py-3 text-xs font-semibold text-text-secondary lg:grid"
            >
              <span>Nhân viên</span>
              <span>Vai trò tại chi nhánh</span>
              <span>Trạng thái</span>
              <span />
            </div>
            <ul className="divide-y divide-border-default">
              {rows.map((employee) => (
                <li
                  key={employee.id}
                  className="grid gap-2 px-5 py-3 lg:grid-cols-[2fr_1.4fr_1fr_8.5rem] lg:items-center lg:gap-4"
                >
                  <div className="min-w-0 break-words">
                    <p className="font-semibold">{employee.fullName}</p>
                    <p className="text-sm text-text-secondary">
                      {employee.employeeCode} · {employee.username}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {employee.roles.map((role) => (
                      <span
                        key={role}
                        className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium"
                      >
                        {roleNames[role] ?? role}
                      </span>
                    ))}
                  </div>
                  <div>
                    <span
                      className={cn(
                        "rounded-full px-2.5 py-1 text-xs font-medium",
                        employee.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-surface-muted text-text-secondary",
                      )}
                    >
                      {employee.status === "ACTIVE" ? "Đang hoạt động" : "Đã vô hiệu hóa"}
                    </span>
                  </div>
                  {employee.editable && branch.data?.status === "ACTIVE" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="justify-self-start lg:justify-self-end"
                      aria-label={`Đổi vai trò cho ${employee.fullName}`}
                      onClick={(event) => {
                        opener.current = event.currentTarget
                        setDialog(employee)
                      }}
                    >
                      Đổi vai trò
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
      {dialog && (
        <BranchStaffDialog
          branchId={branchId}
          branchName={branchName}
          restoreFocus={() => opener.current?.focus()}
          employee={dialog === "create" ? undefined : dialog}
          onClose={() => setDialog(null)}
          onReload={() => {
            setDialog(null)
            void staff.refetch()
          }}
        />
      )}
    </div>
  )
}

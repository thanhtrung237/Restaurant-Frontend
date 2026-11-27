import { useState, type FormEvent } from "react"
import {
  branchStaffRoles,
  useSaveBranchStaff,
  type BranchStaffMember,
  type BranchStaffRole,
} from "@/api/branch-staff.api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage, isApiStatus } from "@/lib/http"
import { isStaffPhone, STAFF_PHONE_ERROR } from "@/lib/staff-phone"

const roleOptions = Object.keys(branchStaffRoles) as BranchStaffRole[]

interface BranchStaffDialogProps {
  branchId: number
  branchName: string
  employee?: BranchStaffMember
  onClose: () => void
  onReload: () => void
  restoreFocus: () => void
}

export function BranchStaffDialog({
  branchId,
  branchName,
  employee,
  onClose,
  onReload,
  restoreFocus,
}: BranchStaffDialogProps) {
  const [roles, setRoles] = useState(() =>
    roleOptions.filter((role) => employee?.roles.includes(role)),
  )
  const [validation, setValidation] = useState("")
  const save = useSaveBranchStaff(branchId)
  const { toast } = useToast()
  const changed =
    !employee ||
    roles.length !== employee.roles.length ||
    roles.some((role) => !employee.roles.includes(role))
  const stale = save.isError && isApiStatus(save.error, 409) && Boolean(employee)

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!roles.length || !changed || save.isPending || stale) return
    const form = new FormData(event.currentTarget)
    const text = (field: string) => String(form.get(field) ?? "").trim()
    const password = String(form.get("password") ?? "")
    if (!employee && !isStaffPhone(text("phone"))) {
      setValidation(STAFF_PHONE_ERROR)
      return
    }
    if (!employee && (!text("fullName") || !text("username") || !password.trim())) {
      setValidation("Vui lòng nhập họ tên, tên đăng nhập và mật khẩu.")
      return
    }
    if (!employee && new TextEncoder().encode(password).length > 72) {
      setValidation("Mật khẩu không được vượt quá 72 byte.")
      return
    }
    setValidation("")
    save.mutate(
      employee
        ? { accountId: employee.id, expected: employee.roles, roles }
        : {
            create: {
              fullName: text("fullName"),
              username: text("username"),
              phone: text("phone"),
              hireDate: text("hireDate"),
              password,
              roles,
            },
          },
      {
        onSuccess: () => {
          toast({
            title: employee ? "Đã lưu vai trò" : "Đã tạo tài khoản nhân viên",
            variant: "success",
          })
          onClose()
        },
      },
    )
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !save.isPending) onClose()
      }}
    >
      <DialogContent
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto"
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          restoreFocus()
        }}
      >
        <DialogHeader>
          <DialogTitle>{employee ? "Đổi vai trò" : "Thêm nhân viên"}</DialogTitle>
          <DialogDescription>
            {employee
              ? `${employee.fullName} · ${branchName}`
              : `Tài khoản mới sẽ được phân công tại ${branchName}.`}
          </DialogDescription>
        </DialogHeader>
        <form className="space-y-4" onSubmit={submit}>
          <fieldset disabled={save.isPending || stale} className="space-y-4">
            {!employee && (
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="space-y-1.5 text-sm font-medium">
                  Họ và tên
                  <Input name="fullName" autoComplete="name" required maxLength={100} />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Tên đăng nhập
                  <Input
                    name="username"
                    autoComplete="off"
                    autoCapitalize="none"
                    required
                    maxLength={50}
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Số điện thoại
                  <Input
                    name="phone"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    required
                  />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Ngày vào làm
                  <Input name="hireDate" type="date" required />
                </label>
                <label className="space-y-1.5 text-sm font-medium">
                  Mật khẩu ban đầu
                  <Input
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={72}
                  />
                </label>
              </div>
            )}
            <fieldset>
              <legend className="text-sm font-semibold">Vai trò tại chi nhánh</legend>
              <p className="mt-1 text-sm text-text-secondary">Chọn ít nhất một vai trò.</p>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {roleOptions.map((role) => (
                  <label
                    key={role}
                    className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-border-default px-3 text-sm"
                  >
                    <input
                      type="checkbox"
                      className="size-4 accent-brand-primary"
                      checked={roles.includes(role)}
                      onChange={(event) => {
                        const checked = event.target.checked
                        setRoles((current) =>
                          checked ? [...current, role] : current.filter((value) => value !== role),
                        )
                      }}
                    />
                    {branchStaffRoles[role]}
                  </label>
                ))}
              </div>
            </fieldset>
          </fieldset>
          {validation && (
            <p role="alert" className="text-sm text-status-danger">
              {validation}
            </p>
          )}
          {save.isError && (
            <p role="alert" className="text-sm text-status-danger">
              {getErrorMessage(save.error)}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>
              Hủy
            </Button>
            {stale ? (
              <Button type="button" onClick={onReload}>
                Tải lại danh sách
              </Button>
            ) : (
              <Button type="submit" disabled={!roles.length || !changed || save.isPending}>
                {save.isPending ? "Đang lưu…" : employee ? "Lưu vai trò" : "Tạo tài khoản"}
              </Button>
            )}
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

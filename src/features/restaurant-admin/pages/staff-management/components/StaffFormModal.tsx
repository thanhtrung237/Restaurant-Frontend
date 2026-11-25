import * as React from "react"
import { Controller, useFieldArray, useForm, useWatch, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IconButton } from "@/components/ui/icon-button"
import { FormField } from "@/components/common/FormField"
import type { Assignment } from "@/types/models"
import type { RoleScope } from "@/types/enums"
import type { StaffRow } from "../types"

/**
 * Chỉ cần đúng ba trường này để dựng hai ô chọn, nên nhận cả `Role` lẫn `RoleListItem`
 * (`GET /roles/restaurant/{id}` trả bản rút gọn).
 */
export interface RoleOption {
  id: number
  name: string
  scope: RoleScope
}

/** Tương tự cho chi nhánh: `Branch` hay `BranchListItem` đều dùng được. */
export interface BranchOption {
  id: number
  name: string
}

/** Vai trò cấp nhà hàng / nền tảng KHÔNG gắn chi nhánh (Bảng thuật ngữ của đặc tả). */
const NO_BRANCH = "NONE"

/**
 * Ràng buộc bám đúng `AccountAddRequest` của backend: họ tên ≤ 100, mã NV ≤ 20,
 * tên đăng nhập ≤ 50, email hợp lệ và ≤ 100, mật khẩu ≥ 8 ký tự.
 *
 * Quy tắc phạm vi vai trò không nằm trong schema tĩnh được (phải tra `scope` của vai trò vừa
 * chọn), nên nằm ở `superRefine` của schema dựng theo danh sách vai trò — xem `buildSchema`.
 */
function buildSchema(roles: RoleOption[], isEdit: boolean) {
  /**
   * ⚠️ KHÔNG đặt tên trường là `id`: `useFieldArray` của react-hook-form dùng chính khoá `id`
   * làm key nội bộ và ghi đè giá trị của mình bằng một chuỗi uuid. Khi đó zod `z.number()`
   * báo lỗi ở một trường KHÔNG hiển thị ở đâu cả — bấm "Lưu" không có chuyện gì xảy ra.
   */
  const assignmentSchema = z.object({
    assignmentId: z.number().optional(),
    roleId: z.string().min(1, "Vui lòng chọn vai trò"),
    branchId: z.string(),
  })

  return z
    .object({
      fullName: z
        .string()
        .trim()
        .min(1, "Vui lòng nhập họ và tên")
        .max(100, "Họ tên không được vượt quá 100 ký tự"),
      username: z
        .string()
        .trim()
        .min(1, "Vui lòng nhập tên đăng nhập")
        .max(50, "Tên đăng nhập không được vượt quá 50 ký tự"),
      email: z
        .string()
        .trim()
        .max(100, "Email không được vượt quá 100 ký tự")
        .refine((v) => v === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), "Email không hợp lệ"),
      password: z.string(),
      assignments: z.array(assignmentSchema),
      /**
       * id của phân công ĐÃ CÓ mà người dùng vừa gỡ khỏi bảng.
       *
       * Để trong form state chứ không để ở `useRef`: ref đọc trong lúc render là thứ ESLint
       * cảnh báo, mà ở đây không cần lách — RHF giữ giá trị này y như mọi trường khác.
       */
      removedAssignmentIds: z.array(z.number()),
    })
    .superRefine((values, ctx) => {
      // Mật khẩu chỉ bắt buộc khi TẠO MỚI — sửa nhân viên dùng "Đặt lại mật khẩu" riêng.
      if (!isEdit && values.password.length < 8) {
        ctx.addIssue({
          path: ["password"],
          code: z.ZodIssueCode.custom,
          message: "Mật khẩu phải có ít nhất 8 ký tự",
        })
      }

      if (!isEdit && values.assignments.length === 0) {
        ctx.addIssue({
          path: ["assignments"],
          code: z.ZodIssueCode.custom,
          message: "Cần ít nhất một phân công (vai trò + chi nhánh)",
        })
      }

      const seen = new Set<string>()
      values.assignments.forEach((assignment, index) => {
        const role = roles.find((r) => String(r.id) === assignment.roleId)
        const needsBranch = role?.scope === "BRANCH"

        if (needsBranch && (!assignment.branchId || assignment.branchId === NO_BRANCH)) {
          ctx.addIssue({
            path: ["assignments", index, "branchId"],
            code: z.ZodIssueCode.custom,
            message: "Vai trò cấp chi nhánh phải chọn chi nhánh",
          })
        }

        const key = `${assignment.roleId}@${needsBranch ? assignment.branchId : NO_BRANCH}`
        if (seen.has(key)) {
          ctx.addIssue({
            path: ["assignments", index, "roleId"],
            code: z.ZodIssueCode.custom,
            message: "Phân công này đã có ở dòng trên",
          })
        }
        seen.add(key)
      })
    })
}

type StaffFormValues = z.infer<ReturnType<typeof buildSchema>>

export interface StaffAssignmentDraft {
  /** id của Assignment đã có ở BE; bỏ trống = dòng mới, cần `POST /assignments`. */
  id?: number
  roleId: number
  branchId?: number
}

export interface StaffFormSubmitData {
  fullName: string
  username: string
  email?: string
  /** Chỉ có khi tạo mới. */
  password?: string
  /** Phân công cần TẠO (dòng chưa có id). */
  assignmentsToAdd: StaffAssignmentDraft[]
  /** Phân công cần GỠ (id của dòng người dùng vừa xoá khỏi bảng). */
  assignmentIdsToRemove: number[]
}

interface StaffFormModalProps {
  isOpen: boolean
  onClose: () => void
  /**
   * PHẢI trả Promise khi có gọi API: `handleSubmit` chỉ giữ `isSubmitting` = true trong lúc
   * còn chờ promise này. Trả về void là nút "Lưu" mở lại ngay lập tức và double-click gửi
   * đi hai request.
   */
  onSave: (data: StaffFormSubmitData) => void | Promise<void>
  /** Có giá trị = sửa; bỏ trống = tạo mới. */
  initialData?: StaffRow | null
  /** Phân công hiện có của tài khoản đang sửa. */
  initialAssignments?: Assignment[]
  roles: RoleOption[]
  branches: BranchOption[]
  isSaving?: boolean
  /** Lỗi do backend trả về, gắn vào đúng ô (ví dụ 409 trùng tên đăng nhập). */
  serverErrors?: { username?: string }
  /** Mở modal đặt lại mật khẩu (chỉ ở chế độ sửa). */
  onResetPassword?: () => void
}

/**
 * Modal thêm / sửa nhân viên (FR-ADM-01).
 *
 * Theo mẫu `CategoryModal` / `DishModal`: Dialog + FormField + RHF/zod, phần form tách ra
 * component con để mỗi lần mở là mount mới, không giữ giá trị của lần mở trước.
 *
 * Khác Figma ở hai chỗ, có lý do:
 * - Figma chỉ có MỘT ô "Vai trò" và MỘT ô "Chi nhánh". Thực tế một nhân viên có NHIỀU phân
 *   công (đặc tả, Bảng thuật ngữ: *"Một nhân viên có nhiều phân công"*; `waiter01` đang làm ở
 *   2 chi nhánh), nên đây là DANH SÁCH phân công.
 * - Figma ghi *"Nhân viên sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu"*. Backend
 *   không có cờ nào làm việc đó (`resetPassword` chỉ đổi hash), nên không hứa điều đó.
 */
export function StaffFormModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  initialAssignments,
  roles,
  branches,
  isSaving = false,
  serverErrors,
  onResetPassword,
}: StaffFormModalProps) {
  const isEdit = Boolean(initialData)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa nhân viên" : "Thêm nhân viên"}</DialogTitle>
          <DialogDescription>
            {isEdit ? "Cập nhật thông tin nhân viên" : "Tạo tài khoản nhân viên mới"}
          </DialogDescription>
        </DialogHeader>

        {isOpen ? (
          <StaffForm
            key={initialData?.id ?? "new"}
            initialData={initialData}
            initialAssignments={initialAssignments}
            roles={roles}
            branches={branches}
            onSave={onSave}
            onClose={onClose}
            isSaving={isSaving}
            serverErrors={serverErrors}
            onResetPassword={onResetPassword}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

/** Mật khẩu tạm thời gợi ý — đủ dài và có đủ loại ký tự để không vướng ràng buộc của BE. */
function generatePassword(): string {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower = "abcdefghijkmnopqrstuvwxyz"
  const digits = "23456789"
  const symbols = "!@#$%"
  const all = upper + lower + digits + symbols
  const pick = (pool: string) => pool[Math.floor(Math.random() * pool.length)]
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)]
  while (chars.length < 10) chars.push(pick(all))
  return chars.sort(() => Math.random() - 0.5).join("")
}

function StaffForm({
  initialData,
  initialAssignments,
  roles,
  branches,
  onSave,
  onClose,
  isSaving,
  serverErrors,
  onResetPassword,
}: Omit<StaffFormModalProps, "isOpen"> & { isSaving: boolean }) {
  const isEdit = Boolean(initialData)
  const schema = React.useMemo(() => buildSchema(roles, isEdit), [roles, isEdit])

  const {
    register,
    control,
    handleSubmit,
    setValue,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      fullName: initialData?.fullName ?? "",
      username: initialData?.username ?? "",
      email: initialData?.email ?? "",
      password: "",
      removedAssignmentIds: [],
      assignments: (initialAssignments ?? []).map((assignment) => ({
        assignmentId: assignment.id,
        roleId: String(assignment.roleId),
        branchId: assignment.branchId != null ? String(assignment.branchId) : NO_BRANCH,
      })),
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: "assignments" })

  const busy = isSaving || isSubmitting

  const submit = handleSubmit(async (values) => {
    const assignmentsToAdd: StaffAssignmentDraft[] = values.assignments
      .filter((assignment) => assignment.assignmentId == null)
      .map((assignment) => {
        const role = roles.find((r) => String(r.id) === assignment.roleId)
        return {
          roleId: Number(assignment.roleId),
          branchId:
            role?.scope === "BRANCH" && assignment.branchId !== NO_BRANCH
              ? Number(assignment.branchId)
              : undefined,
        }
      })

    await onSave({
      fullName: values.fullName.trim(),
      username: values.username.trim(),
      email: values.email.trim() === "" ? undefined : values.email.trim(),
      password: isEdit ? undefined : values.password,
      assignmentsToAdd,
      assignmentIdsToRemove: values.removedAssignmentIds,
    })
  })

  return (
    <form onSubmit={submit} className="space-y-4 py-2">
      <FormField
        label="Họ và tên"
        htmlFor="staff-full-name"
        required
        error={errors.fullName?.message}
      >
        <Input id="staff-full-name" {...register("fullName")} placeholder="Nhập..." autoFocus />
      </FormField>

      {/*
        QĐ-03: mã nhân viên do BACKEND sinh (NV + số tăng dần theo nhà hàng), không ai gõ tay.
        Tạo mới: chỉ báo là sẽ tự sinh. Sửa: hiện mã đang có, không cho đổi — nó là mã định
        danh đã đi vào nhật ký và hoá đơn.
      */}
      <FormField label="Mã nhân viên" htmlFor="staff-employee-code">
        <div
          id="staff-employee-code"
          className="flex h-11 items-center rounded-md bg-surface-muted px-3 text-sm text-text-tertiary"
        >
          {isEdit ? initialData?.employeeCode : "Tự sinh khi lưu (NV005, NV006…)"}
        </div>
      </FormField>

      <FormField
        label="Tên đăng nhập"
        htmlFor="staff-username"
        required={!isEdit}
        error={serverErrors?.username ?? errors.username?.message}
        helperText={isEdit ? "Không sửa được sau khi đã tạo" : undefined}
      >
        <Input
          id="staff-username"
          {...register("username")}
          placeholder="Nhập..."
          disabled={isEdit}
          readOnly={isEdit}
          autoComplete="off"
        />
      </FormField>

      <FormField label="Email" htmlFor="staff-email" error={errors.email?.message}>
        <Input id="staff-email" {...register("email")} placeholder="Tuỳ chọn" autoComplete="off" />
      </FormField>

      {isEdit ? (
        <FormField label="Mật khẩu">
          <div className="flex items-center justify-between gap-3 rounded-md bg-surface-muted px-3 py-2">
            <span className="text-sm text-text-tertiary">•••••••• · đã thiết lập</span>
            <Button type="button" variant="outline" size="sm" onClick={onResetPassword}>
              Đặt lại mật khẩu
            </Button>
          </div>
        </FormField>
      ) : (
        <FormField
          label={
            <span className="flex items-center justify-between gap-3">
              <span>Mật khẩu tạm thời</span>
              <button
                type="button"
                onClick={() => setValue("password", generatePassword(), { shouldValidate: true })}
                className="cursor-pointer text-xs font-semibold text-brand-primary hover:underline"
              >
                Tạo tự động
              </button>
            </span>
          }
          htmlFor="staff-password"
          required
          error={errors.password?.message}
        >
          <Input
            id="staff-password"
            {...register("password")}
            placeholder="Ít nhất 8 ký tự"
            autoComplete="new-password"
          />
          {/*
            Figma ghi "Nhân viên sẽ được yêu cầu đổi mật khẩu khi đăng nhập lần đầu" — backend
            KHÔNG có cờ đó, nên không hứa. Nói đúng việc hệ thống làm được.
          */}
          <p className="mt-1.5 text-xs text-text-tertiary">
            Đưa mật khẩu này cho nhân viên để đăng nhập lần đầu. Hệ thống chưa tự bắt đổi mật khẩu,
            nên hãy nhắc nhân viên tự đổi.
          </p>
        </FormField>
      )}

      {/* ---------------- Phân công: vai trò + chi nhánh ---------------- */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-text-primary">
            Phân công <span className="text-status-danger">*</span>
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => append({ roleId: "", branchId: NO_BRANCH })}
            disabled={busy}
          >
            <Plus className="size-3.5 stroke-[2.5]" />
            Thêm phân công
          </Button>
        </div>

        {fields.length === 0 ? (
          <p className="rounded-md border border-dashed border-border-default px-3 py-3 text-xs text-text-tertiary">
            Chưa có phân công nào. Nhân viên chưa được gán vai trò sẽ không vào được màn nào.
          </p>
        ) : null}

        {fields.map((field, index) => (
          <AssignmentRow
            key={field.id}
            index={index}
            control={control}
            roles={roles}
            branches={branches}
            disabled={busy}
            error={{
              roleId: errors.assignments?.[index]?.roleId?.message,
              branchId: errors.assignments?.[index]?.branchId?.message,
            }}
            onRemove={() => remove(index)}
            onRemoveExisting={(assignmentId) =>
              setValue("removedAssignmentIds", [...getValues("removedAssignmentIds"), assignmentId])
            }
          />
        ))}

        {errors.assignments?.message ? (
          <p className="text-xs text-status-danger">{errors.assignments.message}</p>
        ) : null}
      </div>

      {/*
        Lưới an toàn: nếu zod báo lỗi ở một trường không có chỗ hiển thị, bấm "Lưu" sẽ trông
        như không có chuyện gì xảy ra. Dòng này bảo đảm luôn có phản hồi.
      */}
      {Object.keys(errors).length > 0 ? (
        <p className="text-xs text-status-danger">
          Còn ô chưa hợp lệ — xem các ô được đánh dấu đỏ ở trên.
        </p>
      ) : null}

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Huỷ
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Lưu nhân viên"}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface AssignmentRowProps {
  index: number
  control: Control<StaffFormValues>
  roles: RoleOption[]
  branches: BranchOption[]
  disabled: boolean
  error: { roleId?: string; branchId?: string }
  onRemove: () => void
  onRemoveExisting: (assignmentId: number) => void
}

/** Một dòng phân công: vai trò + chi nhánh. Vai trò cấp nhà hàng thì khoá ô chi nhánh. */
function AssignmentRow({
  index,
  control,
  roles,
  branches,
  disabled,
  error,
  onRemove,
  onRemoveExisting,
}: AssignmentRowProps) {
  const roleId = useWatch({ control, name: `assignments.${index}.roleId` })
  const existingId = useWatch({ control, name: `assignments.${index}.assignmentId` })
  const role = roles.find((r) => String(r.id) === roleId)
  const needsBranch = role?.scope === "BRANCH"

  return (
    <div className="rounded-md border border-border-default p-3">
      <div className="flex items-start gap-2">
        <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-2">
          <div>
            <Controller
              control={control}
              name={`assignments.${index}.roleId`}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange} disabled={disabled}>
                  <SelectTrigger id={`assignment-role-${index}`} className="w-full" size="sm">
                    <SelectValue placeholder="Chọn vai trò" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((r) => (
                      <SelectItem key={r.id} value={String(r.id)} className="cursor-pointer">
                        {r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {error.roleId ? (
              <p className="mt-1 text-xs text-status-danger">{error.roleId}</p>
            ) : null}
          </div>

          <div>
            <Controller
              control={control}
              name={`assignments.${index}.branchId`}
              render={({ field }) => (
                <Select
                  value={needsBranch ? field.value : NO_BRANCH}
                  onValueChange={field.onChange}
                  disabled={disabled || !needsBranch}
                >
                  <SelectTrigger id={`assignment-branch-${index}`} className="w-full" size="sm">
                    <SelectValue placeholder="Chọn chi nhánh" />
                  </SelectTrigger>
                  <SelectContent>
                    {needsBranch ? (
                      branches.map((b) => (
                        <SelectItem key={b.id} value={String(b.id)} className="cursor-pointer">
                          {b.name}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value={NO_BRANCH} className="cursor-pointer">
                        Toàn nhà hàng
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
            {error.branchId ? (
              <p className="mt-1 text-xs text-status-danger">{error.branchId}</p>
            ) : null}
          </div>
        </div>

        <IconButton
          type="button"
          variant="row-danger"
          size="row"
          disabled={disabled}
          title="Gỡ phân công"
          aria-label={`Gỡ phân công dòng ${index + 1}`}
          onClick={() => {
            if (typeof existingId === "number") onRemoveExisting(existingId)
            onRemove()
          }}
        >
          <Trash2 />
        </IconButton>
      </div>

      {role && !needsBranch ? (
        <p className="mt-2 text-xs text-text-tertiary">
          Vai trò cấp nhà hàng — không gắn chi nhánh.
        </p>
      ) : null}
    </div>
  )
}

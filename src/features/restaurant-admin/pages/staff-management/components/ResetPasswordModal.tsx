import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { KeyRound } from "lucide-react"
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
import { FormField } from "@/components/common/FormField"

/** Giống ràng buộc của `AccountServiceImpl.resetPassword`: tối thiểu 8 ký tự. */
const resetSchema = z
  .object({
    newPassword: z.string().min(8, "Mật khẩu phải có ít nhất 8 ký tự"),
    confirmPassword: z.string(),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Hai lần nhập chưa khớp",
  })

type ResetFormValues = z.infer<typeof resetSchema>

interface ResetPasswordModalProps {
  isOpen: boolean
  onClose: () => void
  /** Trả Promise để `isSubmitting` giữ nút khoá suốt lúc gọi API (chặn double-click). */
  onSubmit: (newPassword: string) => void | Promise<void>
  staffName?: string
  isSaving?: boolean
}

/**
 * Đặt lại mật khẩu hộ nhân viên (FR-ADM-01).
 *
 * ⚠️ Đặc tả nói *"Đặt lại mật khẩu ⇒ buộc đổi ở lần đăng nhập kế tiếp"*, nhưng backend không
 * có cờ nào cho việc đó — `resetPassword` chỉ đổi hash (xem `docs/be-issues.md`). Ghi chú
 * trong modal nói đúng hiện trạng thay vì hứa suông.
 */
export function ResetPasswordModal({
  isOpen,
  onClose,
  onSubmit,
  staffName,
  isSaving = false,
}: ResetPasswordModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5 text-brand-primary" />
            Đặt lại mật khẩu
          </DialogTitle>
          <DialogDescription>
            Đặt mật khẩu mới cho <strong className="text-text-primary">{staffName}</strong>.
          </DialogDescription>
        </DialogHeader>

        {isOpen ? (
          <ResetPasswordForm onSubmit={onSubmit} onClose={onClose} isSaving={isSaving} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function ResetPasswordForm({
  onSubmit,
  onClose,
  isSaving,
}: Pick<ResetPasswordModalProps, "onSubmit" | "onClose"> & { isSaving: boolean }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormValues>({
    resolver: zodResolver(resetSchema),
    defaultValues: { newPassword: "", confirmPassword: "" },
  })

  const busy = isSaving || isSubmitting

  return (
    <form
      onSubmit={handleSubmit(async (values) => {
        await onSubmit(values.newPassword)
      })}
      className="space-y-4 py-2"
    >
      <FormField
        label="Mật khẩu mới"
        htmlFor="reset-new-password"
        required
        error={errors.newPassword?.message}
      >
        <Input
          id="reset-new-password"
          type="password"
          {...register("newPassword")}
          placeholder="Ít nhất 8 ký tự"
          autoComplete="new-password"
          autoFocus
        />
      </FormField>

      <FormField
        label="Nhập lại mật khẩu mới"
        htmlFor="reset-confirm-password"
        required
        error={errors.confirmPassword?.message}
      >
        <Input
          id="reset-confirm-password"
          type="password"
          {...register("confirmPassword")}
          placeholder="Nhập lại"
          autoComplete="new-password"
        />
      </FormField>

      <p className="rounded-md bg-surface-muted px-3 py-2 text-xs text-text-tertiary">
        Hệ thống <strong>chưa</strong> buộc đổi mật khẩu ở lần đăng nhập kế tiếp. Hãy đưa mật khẩu
        này cho nhân viên và nhắc họ tự đổi.
      </p>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Huỷ
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Đang lưu..." : "Đặt lại mật khẩu"}
        </Button>
      </DialogFooter>
    </form>
  )
}

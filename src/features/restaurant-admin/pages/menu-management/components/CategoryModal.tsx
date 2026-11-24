import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/common/FormField"
import type { Category } from "@/types/models"

/**
 * Ràng buộc bám đúng `CategoryAddRequest` / `CategoryUpdateRequest` của backend:
 * `name` bắt buộc, tối đa 200 ký tự; `displayOrder` là số nguyên tuỳ chọn.
 *
 * KHÔNG có trường mô tả: `CategoryResponse` của BE không trả về — xem `docs/todo.md`.
 */
const categorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên danh mục")
    .max(200, "Tên danh mục không được vượt quá 200 ký tự"),
  displayOrder: z
    .string()
    .trim()
    .refine((v) => v === "" || /^\d+$/.test(v), "Thứ tự phải là số nguyên không âm"),
})

export type CategoryFormValues = z.infer<typeof categorySchema>

export interface CategorySubmitData {
  name: string
  displayOrder?: number
}

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: CategorySubmitData) => void
  /** Có giá trị = sửa; bỏ trống = tạo mới. */
  initialData?: Category | null
  /**
   * Thứ tự gợi ý cho danh mục MỚI = `max(displayOrder) + 1`, để danh mục vừa tạo nằm cuối
   * danh sách. Người dùng vẫn sửa lại được. Khi SỬA thì bỏ qua, giữ nguyên giá trị đang có.
   */
  nextDisplayOrder?: number
  isSaving?: boolean
}

/**
 * Modal tạo / sửa danh mục món (FR-MNU-01).
 * Theo mẫu `BranchModal`: Dialog + FormField + Input, form tách ra component con để mỗi
 * lần mở là mount mới, không giữ lại giá trị của lần mở trước.
 */
export function CategoryModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  nextDisplayOrder,
  isSaving = false,
}: CategoryModalProps) {
  const isEdit = Boolean(initialData)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa danh mục" : "Thêm danh mục"}</DialogTitle>
          <DialogDescription>
            Danh mục khai báo ở cấp nhà hàng, dùng chung mọi chi nhánh (FR-MNU-01).
          </DialogDescription>
        </DialogHeader>

        {isOpen ? (
          <CategoryForm
            key={initialData?.id ?? "new"}
            initialData={initialData}
            nextDisplayOrder={nextDisplayOrder}
            onSave={onSave}
            onClose={onClose}
            isSaving={isSaving}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CategoryForm({
  initialData,
  nextDisplayOrder,
  onSave,
  onClose,
  isSaving,
}: Omit<CategoryModalProps, "isOpen"> & { isSaving: boolean }) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: initialData?.name ?? "",
      // Sửa: giữ đúng giá trị đang có (kể cả khi đang là null ⇒ để trống).
      // Tạo mới: điền sẵn max + 1 để danh mục nằm cuối danh sách.
      displayOrder: initialData
        ? initialData.displayOrder != null
          ? String(initialData.displayOrder)
          : ""
        : nextDisplayOrder != null
          ? String(nextDisplayOrder)
          : "",
    },
  })

  // `isSubmitting` chặn double-click ngay trong form; `isSaving` là trạng thái mutation.
  const busy = isSaving || isSubmitting

  const submit = handleSubmit((values) => {
    onSave({
      name: values.name.trim(),
      displayOrder: values.displayOrder === "" ? undefined : Number(values.displayOrder),
    })
  })

  return (
    <form onSubmit={submit} className="space-y-4 py-2">
      <FormField label="Tên danh mục" htmlFor="category-name" required error={errors.name?.message}>
        <Input id="category-name" {...register("name")} placeholder="VD: Khai vị" autoFocus />
      </FormField>

      <FormField
        label="Thứ tự hiển thị"
        htmlFor="category-display-order"
        error={errors.displayOrder?.message}
      >
        <Input
          id="category-display-order"
          {...register("displayOrder")}
          inputMode="numeric"
          placeholder="VD: 1"
        />
        <p className="mt-1.5 text-xs text-text-tertiary">
          Số nhỏ hiện trước. Sửa lại được nếu muốn chèn vào giữa.
        </p>
      </FormField>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Huỷ
        </Button>
        <Button type="submit" disabled={busy}>
          {busy ? "Đang lưu..." : initialData ? "Lưu thay đổi" : "Thêm danh mục"}
        </Button>
      </DialogFooter>
    </form>
  )
}

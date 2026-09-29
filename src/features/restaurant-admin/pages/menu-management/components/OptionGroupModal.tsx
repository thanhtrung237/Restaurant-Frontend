import * as React from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Plus, Trash2, Layers, AlertCircle } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useOptionItemsByGroup } from "@/api/option-items.api"
import type { OptionGroup, OptionItem } from "@/types/models"

/**
 * Ràng buộc khớp đúng Backend OptionGroupServiceImpl:
 * - REQUIRED thì minSelect >= 1
 * - minSelect <= maxSelect
 * - maxSelect >= 1
 * - minSelect >= 0
 */
const optionGroupSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập tên nhóm tùy chọn")
      .max(200, "Tên không được vượt quá 200 ký tự"),
    selectionType: z.enum(["REQUIRED", "OPTIONAL"]),
    minSelect: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập số lượng tối thiểu")
      .refine((v) => /^\d+$/.test(v), "Phải là số nguyên không âm"),
    maxSelect: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập số lượng tối đa")
      .refine((v) => /^\d+$/.test(v), "Phải là số nguyên không âm"),
  })
  .superRefine((data, ctx) => {
    const min = Number(data.minSelect)
    const max = Number(data.maxSelect)

    if (max < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["maxSelect"],
        message: "Số lượng tối đa phải >= 1",
      })
    }

    if (data.selectionType === "REQUIRED" && min < 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minSelect"],
        message: "Nhóm Bắt buộc phải có số lượng chọn tối thiểu >= 1",
      })
    }

    if (min > max) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["minSelect"],
        message: "Số lượng tối thiểu không được lớn hơn số lượng tối đa",
      })
    }
  })

export type OptionGroupFormValues = z.infer<typeof optionGroupSchema>

export interface EditableOptionItem {
  id?: number
  name: string
  extraPrice: number
  isDeleted?: boolean
}

export interface OptionGroupSubmitData {
  name: string
  selectionType: "REQUIRED" | "OPTIONAL"
  minSelect: number
  maxSelect: number
  items: EditableOptionItem[]
}

interface OptionGroupModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: OptionGroupSubmitData) => Promise<void>
  initialData?: OptionGroup | null
  isSaving?: boolean
}

export function OptionGroupModal({
  isOpen,
  onClose,
  onSave,
  initialData,
  isSaving = false,
}: OptionGroupModalProps) {
  const isEdit = Boolean(initialData)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[580px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layers className="size-5 text-brand-primary" />
            <span>{isEdit ? "Sửa nhóm tùy chọn" : "Thêm nhóm tùy chọn"}</span>
          </DialogTitle>
          <DialogDescription>
            Nhóm tùy chọn gồm các lựa chọn (topping, kích cỡ, mức đường...) áp dụng cho món ăn.
          </DialogDescription>
        </DialogHeader>

        {isOpen ? (
          <OptionGroupForm
            key={initialData?.id ?? "new"}
            initialData={initialData}
            onSave={onSave}
            onClose={onClose}
            isSaving={isSaving}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function OptionGroupForm({
  initialData,
  onSave,
  onClose,
  isSaving,
}: Omit<OptionGroupModalProps, "isOpen">) {
  const isEdit = Boolean(initialData)

  // Fetch option items nếu là sửa
  const { data: existingItems = [], isLoading: itemsLoading } = useOptionItemsByGroup(
    initialData?.id
  )

  const [items, setItems] = React.useState<EditableOptionItem[]>([])
  const [newItemName, setNewItemName] = React.useState("")
  const [newItemPrice, setNewItemPrice] = React.useState("")
  const [itemError, setItemError] = React.useState<string | null>(null)

  // Đồng bộ items khi fetch xong
  React.useEffect(() => {
    if (existingItems.length > 0) {
      setItems(
        existingItems.map((item: OptionItem) => ({
          id: item.id,
          name: item.name,
          extraPrice: Number(item.extraPrice ?? 0),
        }))
      )
    }
  }, [existingItems])

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<OptionGroupFormValues>({
    resolver: zodResolver(optionGroupSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      selectionType: (initialData?.selectionType as "REQUIRED" | "OPTIONAL") ?? "OPTIONAL",
      minSelect: String(initialData?.minSelect ?? 0),
      maxSelect: String(initialData?.maxSelect ?? 1),
    },
  })

  const selectionType = useWatch({ control, name: "selectionType" })

  // Tự động điều chỉnh minSelect khi đổi sang REQUIRED hoặc OPTIONAL
  React.useEffect(() => {
    if (selectionType === "REQUIRED") {
      setValue("minSelect", "1", { shouldValidate: true })
    } else {
      setValue("minSelect", "0", { shouldValidate: true })
    }
  }, [selectionType, setValue])

  function handleAddItem() {
    setItemError(null)
    const trimmedName = newItemName.trim()
    if (!trimmedName) {
      setItemError("Vui lòng nhập tên lựa chọn")
      return
    }

    if (items.some((i) => !i.isDeleted && i.name.toLowerCase() === trimmedName.toLowerCase())) {
      setItemError("Tên lựa chọn này đã tồn tại trong nhóm")
      return
    }

    const priceNum = Number(newItemPrice.trim() || "0")
    if (isNaN(priceNum) || priceNum < 0) {
      setItemError("Giá cộng thêm phải >= 0")
      return
    }

    setItems((prev) => [
      ...prev,
      {
        name: trimmedName,
        extraPrice: priceNum,
      },
    ])
    setNewItemName("")
    setNewItemPrice("")
  }

  function handleRemoveItem(index: number) {
    setItems((prev) => {
      const target = prev[index]
      if (target.id) {
        // Đã có trên BE: đánh dấu isDeleted để xóa khi submit
        return prev.map((item, idx) => (idx === index ? { ...item, isDeleted: true } : item))
      }
      // Chưa lưu lên BE: bỏ khỏi mảng trực tiếp
      return prev.filter((_, idx) => idx !== index)
    })
  }

  const activeItems = items.filter((i) => !i.isDeleted)

  const submit = handleSubmit(async (values) => {
    if (activeItems.length === 0) {
      setItemError("Nhóm tùy chọn phải có ít nhất 1 lựa chọn")
      return
    }

    await onSave({
      name: values.name.trim(),
      selectionType: values.selectionType,
      minSelect: Number(values.minSelect),
      maxSelect: Number(values.maxSelect),
      items,
    })
  })

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 pt-1">
      {/* 1. Tên nhóm tùy chọn */}
      <FormField label="Tên nhóm tùy chọn" required error={errors.name?.message}>
        <Input
          {...register("name")}
          placeholder="VD: Kích cỡ, Topping thêm, Mức cay..."
          className="h-10 rounded-xl"
        />
      </FormField>

      {/* 2. Kiểu chọn + Min/Max */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <FormField label="Kiểu chọn" required error={errors.selectionType?.message}>
          <Controller
            control={control}
            name="selectionType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger className="h-10 rounded-xl">
                  <SelectValue placeholder="Chọn kiểu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OPTIONAL">Tùy chọn</SelectItem>
                  <SelectItem value="REQUIRED">Bắt buộc</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        <FormField
          label="Chọn tối thiểu"
          required
          error={errors.minSelect?.message}
        >
          <Input
            {...register("minSelect")}
            type="number"
            min={selectionType === "REQUIRED" ? 1 : 0}
            className="h-10 rounded-xl"
          />
          <p className="mt-1 text-[11px] text-text-tertiary">
            {selectionType === "REQUIRED" ? "Bắt buộc: tối thiểu ≥ 1" : "Tùy chọn: thường là 0"}
          </p>
        </FormField>

        <FormField
          label="Chọn tối đa"
          required
          error={errors.maxSelect?.message}
        >
          <Input
            {...register("maxSelect")}
            type="number"
            min={1}
            className="h-10 rounded-xl"
          />
          <p className="mt-1 text-[11px] text-text-tertiary">
            Số lượng tối đa ≥ 1
          </p>
        </FormField>
      </div>

      {/* 3. Bảng các lựa chọn (Option Items) */}
      <div className="flex flex-col gap-2 rounded-2xl border border-border-default/80 bg-surface-page/60 p-4">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-text-secondary">
            Danh sách lựa chọn trong nhóm ({activeItems.length})
          </label>
        </div>

        {itemsLoading ? (
          <p className="py-4 text-center text-xs text-text-tertiary">Đang tải các lựa chọn...</p>
        ) : activeItems.length === 0 ? (
          <div className="rounded-xl border border-dashed border-border-strong p-4 text-center">
            <p className="text-xs text-text-tertiary">Chưa có lựa chọn nào trong nhóm.</p>
            <p className="text-[11px] text-text-tertiary mt-0.5">
              Thêm các lựa chọn bằng form bên dưới (VD: Size L - 10.000đ).
            </p>
          </div>
        ) : (
          <div className="max-h-48 overflow-y-auto divide-y divide-border-default rounded-xl border border-border-default bg-surface-card shadow-2xs">
            {items.map((item, index) => {
              if (item.isDeleted) return null
              return (
                <div
                  key={item.id ?? `temp-${index}`}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-surface-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="truncate text-xs font-semibold text-text-primary">
                      {item.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-xs font-bold text-brand-primary">
                      {item.extraPrice > 0
                        ? `+${item.extraPrice.toLocaleString("vi-VN")}đ`
                        : "Miễn phí (0đ)"}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveItem(index)}
                      className="flex size-7 items-center justify-center rounded-lg text-text-tertiary hover:bg-status-danger-subtle hover:text-status-danger transition-colors cursor-pointer"
                      title="Xóa lựa chọn"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Form thêm lựa chọn nhanh */}
        <div className="mt-2 flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              value={newItemName}
              onChange={(e) => {
                setNewItemName(e.target.value)
                if (itemError) setItemError(null)
              }}
              placeholder="Tên lựa chọn (VD: Trứng chần, Size vừa...)"
              className="h-9 flex-1 text-xs rounded-xl bg-surface-card"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddItem()
                }
              }}
            />
            <Input
              value={newItemPrice}
              onChange={(e) => {
                setNewItemPrice(e.target.value)
                if (itemError) setItemError(null)
              }}
              type="number"
              min={0}
              placeholder="Giá thêm (đ)"
              className="h-9 w-28 text-xs rounded-xl bg-surface-card"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleAddItem()
                }
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              className="h-9 shrink-0 gap-1 rounded-xl px-3 text-xs font-semibold border-brand-primary text-brand-primary hover:bg-brand-primary-subtle cursor-pointer"
            >
              <Plus className="size-3.5" />
              <span>Thêm</span>
            </Button>
          </div>

          {itemError && (
            <p className="flex items-center gap-1 text-[11px] text-status-danger">
              <AlertCircle className="size-3 shrink-0" />
              <span>{itemError}</span>
            </p>
          )}
        </div>
      </div>

      <DialogFooter className="gap-2 sm:gap-0 pt-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSaving}
          className="h-10 rounded-xl"
        >
          Hủy
        </Button>
        <Button
          type="submit"
          disabled={isSaving}
          className="h-10 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold"
        >
          {isSaving ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Tạo nhóm tùy chọn"}
        </Button>
      </DialogFooter>
    </form>
  )
}

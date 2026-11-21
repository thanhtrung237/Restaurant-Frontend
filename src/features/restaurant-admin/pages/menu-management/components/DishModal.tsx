import * as React from "react"
import { useForm, useWatch, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { ImagePlus, Loader2, X, Layers } from "lucide-react"
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
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { FormField } from "@/components/common/FormField"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { KITCHEN_STATION_OPTIONS } from "@/config/kitchen-stations"
import { useUploadDishImage } from "@/api/upload.api"
import { useOptionGroupsByRestaurant } from "@/api/option-groups.api"
import { useDishOptionGroups } from "@/api/dish-option-groups.api"
import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE } from "@/config/roles"
import { getErrorMessage } from "@/lib/http"
import { useToast } from "@/hooks/use-toast"
import type { Category, Dish, OptionGroup } from "@/types/models"

/** Giới hạn của `CloudinaryServiceImpl` ở backend — kiểm trước ở FE cho đỡ tốn lượt gọi. */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"]

/**
 * Ràng buộc bám đúng `DishAddRequest` / `DishUpdateRequest` của backend.
 *
 * `kitchenStationType` BẮT BUỘC chọn: backend gom phiếu bếp theo đúng chuỗi này và dồn
 * `null` vào nhóm `"DEFAULT"`, nên để trống sẽ khiến đồ uống bị in chung phiếu với bếp
 * (FR-SRV-07). Không đặt giá trị mặc định vì không có khu nào đúng cho mọi món.
 * 
 * BRANCH_MANAGER tạo món luôn bắt buộc có branchId (FE enforce - BE có lỗ hổng theo QĐ-27).
 */
const dishSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập tên món")
    .max(200, "Tên món không được vượt quá 200 ký tự"),
  categoryId: z.string().min(1, "Vui lòng chọn danh mục"),
  basePrice: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập giá")
    .refine((v) => /^\d+$/.test(v), "Giá chỉ được chứa chữ số")
    .refine((v) => Number(v) > 0, "Giá phải lớn hơn 0"),
  kitchenStationType: z.string().min(1, "Vui lòng chọn khu chế biến"),
  soldByWeight: z.boolean(),
  description: z.string().trim().max(1000, "Mô tả quá dài"),
  imageUrl: z.string().trim().max(500, "Đường dẫn ảnh quá dài"),
})

export type DishFormValues = z.infer<typeof dishSchema>

export interface DishSubmitData {
  name: string
  categoryId: number
  basePrice: number
  kitchenStationType: string
  soldByWeight: boolean
  description?: string
  imageUrl?: string
  /** ID chi nhánh nếu tạo món riêng cho chi nhánh. Undefined = toàn nhà hàng */
  branchId?: number
  /** Danh sách ID nhóm tùy chọn áp dụng cho món (Requirement 5) */
  optionGroupIds?: number[]
}

interface DishModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: DishSubmitData) => Promise<void>
  categories: Category[]
  /** Có giá trị = sửa; bỏ trống = tạo mới. */
  initialData?: Dish | null
  isSaving?: boolean
  /** ID chi nhánh hiện tại - bắt buộc khi BRANCH_MANAGER tạo món (GĐ3) */
  currentBranchId?: number
  branchName?: string
  saleStatus?: { isSelling: boolean; isUpdating: boolean; onChange: () => void }
}

/** Modal tạo / sửa món cấp NHÀ HÀNG hoặc RIÊNG CHI NHÁNH (FR-MNU-02, GĐ3). */
export function DishModal({
  isOpen,
  onClose,
  onSave,
  categories,
  initialData,
  isSaving = false,
  currentBranchId,
  branchName,
  saleStatus,
}: DishModalProps) {
  const isEdit = Boolean(initialData)

  const branchId = initialData ? initialData.branchId ?? undefined : currentBranchId

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSaving && onClose()}>
      {/* <md: gần như toàn màn hình, cuộn được — form này khá dài */}
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Sửa món" : branchId ? "Thêm món riêng" : "Thêm món"}</DialogTitle>
          <DialogDescription>
            {branchId
              ? `Phạm vi áp dụng · ${branchName ?? "Chi nhánh này"}`
              : "Phạm vi áp dụng · Toàn nhà hàng"}
          </DialogDescription>
        </DialogHeader>

        {isOpen ? (
          <DishForm
            key={initialData?.id ?? "new"}
            categories={categories}
            initialData={initialData}
            onSave={onSave}
            onClose={onClose}
            isSaving={isSaving}
            currentBranchId={branchId}
            saleStatus={saleStatus}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function DishForm({
  categories,
  initialData,
  onSave,
  onClose,
  isSaving,
  currentBranchId,
  saleStatus,
}: Omit<DishModalProps, "isOpen"> & { isSaving: boolean }) {
  const { toast } = useToast()
  const uploadImage = useUploadDishImage()
  const fileInputRef = React.useRef<HTMLInputElement | null>(null)

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<DishFormValues>({
    resolver: zodResolver(dishSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      categoryId: initialData?.categoryId != null ? String(initialData.categoryId) : "",
      basePrice: initialData?.basePrice != null ? String(initialData.basePrice) : "",
      kitchenStationType: initialData?.kitchenStationType ?? "",
      soldByWeight: initialData?.soldByWeight ?? false,
      description: initialData?.description ?? "",
      imageUrl: initialData?.imageUrl ?? "",
    },
  })

  // Dùng `useWatch` thay cho `watch()`: `watch` trả về hàm mà React Compiler không memo
  // hoá được (cảnh báo react(incompatible-library)), `useWatch` là hook đăng ký theo tên.
  const soldByWeight = useWatch({ control, name: "soldByWeight" })
  const imageUrl = useWatch({ control, name: "imageUrl" })
  const stationValue = useWatch({ control, name: "kitchenStationType" })

  /**
   * Khu chế biến đang lưu nhưng không nằm trong danh sách chuẩn (dữ liệu cũ, hoặc ghi
   * thẳng qua API). Chèn mục tạm mang đúng giá trị gốc để ô không trống và người dùng
   * không vô tình ghi đè — cùng cách xử lý với dropdown ngân hàng.
   */
  const loadedStation = initialData?.kitchenStationType ?? ""
  const legacyStation =
    loadedStation &&
    !KITCHEN_STATION_OPTIONS.some((s) => s.code === loadedStation)
      ? loadedStation
      : ""

  const restaurantId = useAuthStore((s) => s.account?.restaurantId)
  const isBranchManager = useAuthStore((s) => s.role === APP_ROLE.BRANCH_MANAGER)
  const availableGroupsQuery = useOptionGroupsByRestaurant(restaurantId)
  const linkedGroupsQuery = useDishOptionGroups(initialData?.id)
  const [draftGroupIds, setDraftGroupIds] = React.useState<number[] | null>(null)
  const linkedGroupIds = linkedGroupsQuery.data?.map((link) => link.optionGroupId) ?? []
  const selectedOptionGroupIds = draftGroupIds ?? linkedGroupIds
  const availableOptionGroups = availableGroupsQuery.data ?? []
  const optionGroupsLoading = availableGroupsQuery.isPending || (Boolean(initialData) && linkedGroupsQuery.isPending)
  const optionGroupsError = availableGroupsQuery.isError || linkedGroupsQuery.isError

  function toggleOptionGroup(groupId: number) {
    setDraftGroupIds((previous) => {
      const selected = previous ?? linkedGroupIds
      return selected.includes(groupId) ? selected.filter((id) => id !== groupId) : [...selected, groupId]
    })
  }

  const busy = isSaving || isSubmitting || uploadImage.isPending

  async function handlePickImage(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    // Cho chọn lại cùng một file sau khi lỗi
    event.target.value = ""
    if (!file) return

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      toast({
        title: "Ảnh không hợp lệ",
        description: "Chỉ chấp nhận file ảnh JPEG, PNG, WebP hoặc GIF.",
        variant: "danger",
      })
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      toast({
        title: "Ảnh quá lớn",
        description: "Ảnh không được vượt quá 5MB.",
        variant: "danger",
      })
      return
    }

    try {
      const url = await uploadImage.mutateAsync(file)
      setValue("imageUrl", url, { shouldDirty: true })
      toast({ title: "Đã tải ảnh lên", variant: "success" })
    } catch (error) {
      toast({
        title: "Không tải được ảnh",
        description: getErrorMessage(error),
        variant: "danger",
      })
    }
  }

  const submit = handleSubmit(async (values) => {
    if (optionGroupsLoading || optionGroupsError || isSaving) return
    await onSave({
      name: values.name.trim(),
      categoryId: Number(values.categoryId),
      basePrice: Number(values.basePrice),
      kitchenStationType: values.kitchenStationType,
      soldByWeight: values.soldByWeight,
      description: values.description.trim() || undefined,
      imageUrl: values.imageUrl.trim() || undefined,
      branchId: currentBranchId,
      optionGroupIds: draftGroupIds ?? undefined,
    })
  })

  return (
    <form onSubmit={submit} className="space-y-4 py-2">
      <FormField label="Tên món" htmlFor="dish-name" required error={errors.name?.message}>
        <Input id="dish-name" {...register("name")} placeholder="VD: Phở bò tái nạm" autoFocus />
      </FormField>

      {saleStatus ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-surface-muted px-3 py-2">
          <div>
            <p className="text-xs text-text-tertiary">{currentBranchId ? "Trạng thái tại chi nhánh" : "Trạng thái toàn nhà hàng"}</p>
            <p className="text-sm font-medium">{saleStatus.isSelling ? "Đang bán" : "Ngừng bán"}</p>
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={saleStatus.onChange} disabled={busy || saleStatus.isUpdating}>
            {saleStatus.isSelling ? "Ngừng bán món" : "Bán lại món"}
          </Button>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <FormField label="Danh mục" htmlFor="dish-category" required error={errors.categoryId?.message}>
          <Controller
            control={control}
            name="categoryId"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="dish-category" className="w-full">
                  <SelectValue placeholder="Chọn danh mục" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)} className="cursor-pointer">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        </FormField>

        {/* Bắt buộc chọn, KHÔNG có giá trị mặc định — xem chú thích ở dishSchema */}
        <FormField
          label="Khu chế biến"
          htmlFor="dish-station"
          required
          error={errors.kitchenStationType?.message}
        >
          <Controller
            control={control}
            name="kitchenStationType"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger id="dish-station" className="w-full">
                  <SelectValue placeholder="Chưa chọn" />
                </SelectTrigger>
                <SelectContent>
                  {legacyStation ? (
                    <SelectItem value={legacyStation} className="cursor-pointer">
                      {legacyStation} (giá trị cũ)
                    </SelectItem>
                  ) : null}
                  {KITCHEN_STATION_OPTIONS.map((s) => (
                    <SelectItem key={s.code} value={s.code} className="cursor-pointer">
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {legacyStation && stationValue === legacyStation ? (
            <p className="mt-1.5 text-xs text-status-warning">
              Giá trị này chưa theo danh sách chuẩn. Nên chọn lại khu chế biến tương ứng
              rồi Lưu.
            </p>
          ) : null}
        </FormField>
      </div>

      <FormField
        label={soldByWeight ? "Giá gốc (đ/kg)" : "Giá gốc (đ)"}
        htmlFor="dish-base-price"
        required
        error={errors.basePrice?.message}
      >
        <Input
          id="dish-base-price"
          {...register("basePrice")}
          inputMode="numeric"
          placeholder="65000"
        />
        {soldByWeight ? (
          <p className="mt-1.5 text-xs text-text-tertiary">
            Đơn giá/kg được chốt ngay khi gửi order; thành tiền chỉ tính sau khi có số cân
            thật (BR-07).
          </p>
        ) : null}
      </FormField>

      <div className="flex items-center justify-between rounded-card border border-border-default px-4 py-3">
        <div className="min-w-0 pr-3">
          <p className="text-sm font-semibold text-text-primary">Bán theo cân</p>
          <p className="mt-0.5 text-xs text-text-tertiary">
            Món tính tiền theo số cân thật, phải cân trước khi chế biến.
          </p>
        </div>
        <Controller
          control={control}
          name="soldByWeight"
          render={({ field }) => (
            <Switch
              checked={field.value}
              onCheckedChange={field.onChange}
              aria-label="Bán theo cân"
            />
          )}
        />
      </div>

      {/* Mục "Tùy chọn" trong DishModal (Requirement 5) */}
      <div className="space-y-2 rounded-2xl border border-border-default/80 bg-surface-page/50 p-3.5">
        <div className="flex items-center justify-between">
          <label className="text-xs font-bold uppercase tracking-wider text-text-secondary flex items-center gap-1.5">
            <Layers className="size-4 text-brand-primary" />
            <span>{isBranchManager ? "Topping dùng chung" : "Nhóm tùy chọn / Topping áp dụng"} ({selectedOptionGroupIds.length})</span>
          </label>
        </div>

        {optionGroupsError ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-sm text-text-secondary">
            <span>Không tải được nhóm tùy chọn của món.</span>
            <Button type="button" variant="outline" size="sm" onClick={() => {
              if (availableGroupsQuery.isError) void availableGroupsQuery.refetch()
              if (linkedGroupsQuery.isError) void linkedGroupsQuery.refetch()
            }}>
              Thử lại
            </Button>
          </div>
        ) : optionGroupsLoading ? (
          <p role="status" className="text-sm text-text-secondary">Đang tải nhóm tùy chọn…</p>
        ) : availableOptionGroups.length === 0 ? (
          <p className="text-xs text-text-tertiary italic">
            {isBranchManager
              ? "Chưa có nhóm topping dùng chung. Quản trị nhà hàng có thể tạo nhóm."
              : 'Chưa có nhóm tùy chọn nào trong nhà hàng. Bạn có thể tạo thêm ở tab "Tùy chọn món".'}
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
            {availableOptionGroups.map((group: OptionGroup) => {
              const isChecked = selectedOptionGroupIds.includes(group.id)
              return (
                <label
                  key={group.id}
                  className={`flex items-center gap-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isChecked
                      ? "border-brand-primary bg-brand-primary-subtle/30 shadow-2xs"
                      : "border-border-default bg-surface-card hover:bg-surface-muted/60"
                  }`}
                >
                  <Checkbox
                    aria-label={group.name}
                    checked={isChecked}
                    disabled={busy}
                    onCheckedChange={() => toggleOptionGroup(group.id)}
                    className="data-[state=checked]:bg-brand-primary data-[state=checked]:border-brand-primary cursor-pointer"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold text-text-primary truncate">{group.name}</p>
                    <p className="text-[10px] text-text-tertiary">
                      {group.selectionType === "REQUIRED" ? "Bắt buộc" : "Tùy chọn"} · Tối đa {group.maxSelect}
                    </p>
                  </div>
                </label>
              )
            })}
          </div>
        )}
      </div>

      <FormField label="Mô tả" htmlFor="dish-description" error={errors.description?.message}>
        <Input
          id="dish-description"
          {...register("description")}
          placeholder="VD: Nước dùng ninh 12 tiếng"
        />
      </FormField>

      <FormField label="Ảnh món" error={errors.imageUrl?.message}>
        <div className="flex items-center gap-3">
          <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-card border border-border-default bg-surface-muted">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt="Ảnh món"
                className="size-full object-cover"
              />
            ) : (
              <ImagePlus className="size-6 text-text-tertiary" />
            )}
          </div>

          <div className="flex flex-col gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_IMAGE_TYPES.join(",")}
              onChange={handlePickImage}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={uploadImage.isPending}
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              {uploadImage.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Đang tải...
                </>
              ) : (
                <>{imageUrl ? "Đổi ảnh" : "Tải ảnh lên"}</>
              )}
            </Button>
            {imageUrl ? (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto justify-start p-0 text-xs text-status-danger"
                onClick={() => setValue("imageUrl", "", { shouldDirty: true })}
              >
                <X className="size-3.5" /> Gỡ ảnh
              </Button>
            ) : null}
            <p className="text-xs text-text-tertiary">JPEG · PNG · WebP · GIF, tối đa 5MB</p>
          </div>
        </div>
      </FormField>

      <DialogFooter className="gap-2 sm:gap-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
          Huỷ
        </Button>
        <Button type="submit" disabled={busy || optionGroupsLoading || optionGroupsError}>
          {busy ? "Đang lưu..." : initialData ? "Lưu thay đổi" : currentBranchId ? "Thêm món riêng" : "Thêm món"}
        </Button>
      </DialogFooter>
    </form>
  )
}

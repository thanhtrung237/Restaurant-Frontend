import React, { useState, useEffect, useMemo } from "react"
import { Sparkles, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StickyActionBar } from "@/components/layout/StickyActionBar"
import { PageHeader } from "@/components/layout/PageHeader"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/auth.store"
import { useBranchesByRestaurant } from "@/api/branches.api"
import { useCategoriesByRestaurant } from "@/api/categories.api"
import { useDishesByRestaurant } from "@/api/dishes.api"
import { PromotionInfoCard } from "./PromotionInfoCard"
import { PromotionConditionCard } from "./PromotionConditionCard"
import { PromotionActionCard } from "./PromotionActionCard"
import { PromotionTimeCard } from "./PromotionTimeCard"
import { PromotionScopeCard } from "./PromotionScopeCard"
import { buildPromotionPreview } from "../promotion-mapper"
import type { PromotionFormData } from "../types"
import {
  isValidDateFormat,
  isEndDateAfterStartDate,
  formatMoneyForApi,
} from "@/lib/promotion-format"
import type { BranchListItem } from "@/types/models"

interface PromotionFormProps {
  initialData?: PromotionFormData
  onSubmit: (data: PromotionFormData) => Promise<void>
  isSubmitting: boolean
  onCancel: () => void
  title: string
  subtitle?: string
  submitText?: string
  currentUsageCount?: number
}

const DEFAULT_FORM_DATA: PromotionFormData = {
  name: "",
  customerDescription: "",
  applyLevel: "order",
  code: "",
  usageLimit: "",
  applyTarget: "all_order",
  selectedCategories: [],
  selectedDishes: [],
  minOrderValue: "",
  minQuantity: "1",
  actionType: "percentage",
  discountValue: "10",
  buyQty: "2",
  getQty: "1",
  startDate: "",
  endDate: "",
  startTime: "",
  endTime: "",
  daysOfWeek: [],
  isAllBranches: true,
  selectedBranchIds: [],
  priority: "0",
  isActiveNow: true,
}

export const PromotionForm: React.FC<PromotionFormProps> = ({
  initialData,
  onSubmit,
  isSubmitting,
  onCancel,
  title,
  subtitle = "Cấu hình điều kiện và hành động · hệ thống tự áp khi thoả (BR-22)",
  submitText = "Lưu chương trình",
  currentUsageCount,
}) => {
  const { toast } = useToast()
  const user = useAuthStore((s) => s.account)
  const restaurantId = user?.restaurantId

  const { data: branchesData, isLoading: isLoadingBranches } = useBranchesByRestaurant(restaurantId)
  const branches: BranchListItem[] = useMemo(() => branchesData ?? [], [branchesData])

  const { data: categoriesData, isLoading: isLoadingCategories } = useCategoriesByRestaurant(restaurantId)
  const categories = useMemo(() => categoriesData ?? [], [categoriesData])

  const { data: dishesData, isLoading: isLoadingDishes } = useDishesByRestaurant(restaurantId, { size: 500 })
  const dishes = useMemo(() => dishesData?.content ?? [], [dishesData])

  const [formData, setFormData] = useState<PromotionFormData>(initialData ?? DEFAULT_FORM_DATA)
  // Dùng ref để chỉ sync initialData vào form đúng 1 lần khi dữ liệu từ API về lần đầu
  const initializedRef = React.useRef(false)

  // Cập nhật khi initialData thay đổi (ví dụ khi fetch Promotion chi tiết xong)
  // Chỉ chạy 1 lần duy nhất khi initialData được load lần đầu, tránh reset form khi user đang nhập
  useEffect(() => {
    if (initialData && !initializedRef.current) {
      initializedRef.current = true
      setFormData(initialData)
    }
  }, [initialData])

  // Auto-select tất cả chi nhánh nếu tạo mới (không có initialData) và chưa chọn chi nhánh nào
  useEffect(() => {
    if (!initialData && !initializedRef.current && branches.length > 0 && formData.selectedBranchIds.length === 0 && formData.isAllBranches) {
      setFormData((prev) => ({
        ...prev,
        selectedBranchIds: branches.map((b) => b.id),
      }))
    }
  }, [branches, initialData, formData.isAllBranches, formData.selectedBranchIds.length])

  // Cập nhật từng trường
  const updateField = <K extends keyof PromotionFormData>(
    field: K,
    val: PromotionFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: val }))
  }

  // Toggle ngày trong tuần
  const handleToggleDay = (day: string) => {
    setFormData((prev) => {
      const exists = prev.daysOfWeek.includes(day)
      const nextDays = exists
        ? prev.daysOfWeek.filter((d) => d !== day)
        : [...prev.daysOfWeek, day]
      return { ...prev, daysOfWeek: nextDays }
    })
  }

  // Toggle toàn hệ thống
  const handleToggleAllBranches = (checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      isAllBranches: checked,
      selectedBranchIds: checked ? branches.map((b) => b.id) : [],
    }))
  }

  // Toggle từng chi nhánh
  const handleToggleBranch = (branchId: number, checked: boolean) => {
    setFormData((prev) => {
      const next = checked
        ? [...prev.selectedBranchIds, branchId]
        : prev.selectedBranchIds.filter((id) => id !== branchId)
      return {
        ...prev,
        selectedBranchIds: next,
        isAllBranches: next.length === branches.length && branches.length > 0,
      }
    })
  }

  // Preview câu tóm tắt
  const previewSummary = useMemo(() => {
    return buildPromotionPreview(formData, categories, dishes, branches)
  }, [formData, categories, dishes, branches])

  // Validation
  const validate = (): string | null => {
    if (!formData.name.trim()) {
      return "Vui lòng nhập tên chương trình khuyến mãi"
    }

    if (!formData.startDate) {
      return "Vui lòng chọn ngày bắt đầu"
    }
    if (!formData.endDate) {
      return "Vui lòng chọn ngày kết thúc"
    }
    if (!isValidDateFormat(formData.startDate)) {
      return "Ngày bắt đầu không hợp lệ (định dạng: dd/MM/yyyy)"
    }
    if (!isValidDateFormat(formData.endDate)) {
      return "Ngày kết thúc không hợp lệ (định dạng: dd/MM/yyyy)"
    }
    if (!isEndDateAfterStartDate(formData.startDate, formData.endDate)) {
      return "Ngày kết thúc phải sau hoặc bằng ngày bắt đầu"
    }

    if (formData.startTime && formData.endTime && formData.startTime === formData.endTime) {
      return "Giờ bắt đầu phải khác giờ kết thúc"
    }

    if (!formData.isAllBranches && formData.selectedBranchIds.length === 0) {
      return "Vui lòng chọn ít nhất một chi nhánh"
    }

    if (formData.usageLimit) {
      const limit = Number.parseInt(formData.usageLimit, 10)
      if (limit < 0) {
        return "Giới hạn lượt không được âm"
      }
      if (currentUsageCount != null && limit < currentUsageCount) {
        return `Giới hạn lượt không được nhỏ hơn số lượt đã sử dụng (${currentUsageCount})`
      }
    }

    // Validate theo Cấp
    if (formData.applyLevel === "dish") {
      if (formData.applyTarget === "category" && formData.selectedCategories.length === 0) {
        return "Vui lòng chọn ít nhất một danh mục món ăn"
      }
      if (formData.applyTarget === "specific_dish" && formData.selectedDishes.length === 0) {
        return "Vui lòng chọn ít nhất một món ăn"
      }

      if (formData.actionType === "gift_dish") {
        const buy = Number.parseInt(formData.buyQty, 10)
        const get = Number.parseInt(formData.getQty, 10)
        if (!buy || buy < 1) return "Số lượng mua (X) phải từ 1 trở lên"
        if (!get || get < 1) return "Số lượng tặng (Y) phải từ 1 trở lên"
      } else if (formData.actionType === "percentage") {
        const pct = Number.parseFloat(formData.discountValue.replace(/[^\d.]/g, ""))
        if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
          return "Tỷ lệ giảm giá (%) phải từ 1 đến 100"
        }
      } else {
        const val = formatMoneyForApi(formData.discountValue)
        if (val <= 0) {
          return "Số tiền giảm phải lớn hơn 0đ"
        }
      }
    } else {
      // Cấp hóa đơn
      if (formData.actionType === "percentage") {
        const pct = Number.parseFloat(formData.discountValue.replace(/[^\d.]/g, ""))
        if (Number.isNaN(pct) || pct <= 0 || pct > 100) {
          return "Tỷ lệ giảm giá (%) phải từ 1 đến 100"
        }
      } else {
        const val = formatMoneyForApi(formData.discountValue)
        if (val <= 0) {
          return "Số tiền giảm phải lớn hơn 0đ"
        }
      }
    }

    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const error = validate()
    if (error) {
      toast({
        title: "Chưa đủ điều kiện lưu",
        description: error,
        variant: "danger",
      })
      return
    }

    await onSubmit(formData)
  }

  return (
    <form onSubmit={handleSubmit} className="flex min-h-full flex-col bg-surface-page">
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            className="h-10 gap-1.5 px-4 cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span>Quay lại</span>
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-6 lg:p-8">
        {/* Khung Xem trước quy tắc (Tóm tắt 1 câu) */}
        <div className="rounded-xl border border-brand-primary/30 bg-gradient-to-r from-brand-primary-subtle/40 via-brand-primary-subtle/20 to-surface-card p-4 shadow-xs">
          <div className="flex items-start gap-3">
            <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-brand-primary text-white shadow-2xs">
              <Sparkles className="size-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-bold tracking-wider uppercase text-brand-primary">
                Xem trước quy tắc tự động áp dụng (BR-22)
              </span>
              <p className="mt-0.5 text-sm font-semibold text-text-primary leading-snug">
                {previewSummary}
              </p>
            </div>
          </div>
        </div>

        {/* Bố cục 2 cột */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Cột trái (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Card 1: Cấp & Thông tin cơ bản */}
            <PromotionInfoCard
              name={formData.name}
              onNameChange={(val) => updateField("name", val)}
              customerDescription={formData.customerDescription}
              onCustomerDescriptionChange={(val) => updateField("customerDescription", val)}
              applyLevel={formData.applyLevel}
              onApplyLevelChange={(val) => updateField("applyLevel", val)}
              code={formData.code}
              onCodeChange={(val) => updateField("code", val)}
              usageLimit={formData.usageLimit}
              onUsageLimitChange={(val) => updateField("usageLimit", val)}
            />

            {/* Card 2: Điều kiện áp dụng */}
            <PromotionConditionCard
              applyLevel={formData.applyLevel}
              applyTarget={formData.applyTarget}
              onApplyTargetChange={(val) => updateField("applyTarget", val)}
              selectedCategories={formData.selectedCategories}
              onSelectedCategoriesChange={(ids) => updateField("selectedCategories", ids)}
              selectedDishes={formData.selectedDishes}
              onSelectedDishesChange={(ids) => updateField("selectedDishes", ids)}
              minOrderValue={formData.minOrderValue}
              onMinOrderValueChange={(val) => updateField("minOrderValue", val)}
              minQuantity={formData.minQuantity}
              onMinQuantityChange={(val) => updateField("minQuantity", val)}
              categories={categories}
              isLoadingCategories={isLoadingCategories}
              dishes={dishes}
              isLoadingDishes={isLoadingDishes}
            />

            {/* Card 3: Hành động */}
            <PromotionActionCard
              applyLevel={formData.applyLevel}
              actionType={formData.actionType}
              onActionTypeChange={(val) => updateField("actionType", val)}
              discountValue={formData.discountValue}
              onDiscountValueChange={(val) => updateField("discountValue", val)}
              buyQty={formData.buyQty}
              onBuyQtyChange={(val) => updateField("buyQty", val)}
              getQty={formData.getQty}
              onGetQtyChange={(val) => updateField("getQty", val)}
            />
          </div>

          {/* Cột phải (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 4: Thời gian */}
            <PromotionTimeCard
              startDate={formData.startDate}
              onStartDateChange={(val) => updateField("startDate", val)}
              endDate={formData.endDate}
              onEndDateChange={(val) => updateField("endDate", val)}
              startTime={formData.startTime}
              onStartTimeChange={(val) => updateField("startTime", val)}
              endTime={formData.endTime}
              onEndTimeChange={(val) => updateField("endTime", val)}
              daysOfWeek={formData.daysOfWeek}
              onToggleDay={handleToggleDay}
            />

            {/* Card 5: Phạm vi & ưu tiên */}
            <PromotionScopeCard
              isAllBranches={formData.isAllBranches}
              onToggleAllBranches={handleToggleAllBranches}
              selectedBranchIds={formData.selectedBranchIds}
              onToggleBranch={handleToggleBranch}
              priority={formData.priority}
              onPriorityChange={(val) => updateField("priority", val)}
              isActiveNow={formData.isActiveNow}
              onIsActiveNowChange={(val) => updateField("isActiveNow", val)}
              branches={branches}
              isLoadingBranches={isLoadingBranches}
            />
          </div>
        </div>
      </div>

      {/* Desktop Footer */}
      <div className="mt-auto hidden items-center justify-end gap-3 border-t border-border-default bg-surface-card px-6 py-4 sm:px-8 md:flex">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-11 rounded-xl border-border-default px-6 font-medium text-text-primary hover:bg-surface-muted cursor-pointer"
          disabled={isSubmitting}
        >
          Huỷ
        </Button>

        <Button
          type="submit"
          className="h-11 rounded-xl px-6 font-semibold cursor-pointer"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang lưu..." : submitText}
        </Button>
      </div>

      {/* Mobile Sticky Bar */}
      <StickyActionBar>
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-11 flex-1 font-medium"
          disabled={isSubmitting}
        >
          Huỷ
        </Button>
        <Button
          type="submit"
          className="h-11 flex-1 font-semibold"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Đang lưu..." : submitText}
        </Button>
      </StickyActionBar>
    </form>
  )
}

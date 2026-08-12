import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import { PromotionInfoCard } from "./components/PromotionInfoCard"
import { PromotionConditionCard } from "./components/PromotionConditionCard"
import { PromotionActionCard } from "./components/PromotionActionCard"
import { PromotionTimeCard } from "./components/PromotionTimeCard"
import { PromotionScopeCard } from "./components/PromotionScopeCard"
import type {
  PromotionFormData,
  PromotionApplyLevel,
  PromotionTarget,
  PromotionActionType,
} from "./types"

/**
 * Tạo khuyến mãi — Màn hình thuộc Quản trị nhà hàng (restaurant-admin)
 * Nguồn: QuanLy/Tạo khuyến mãi.png
 *
 * Nghiệp vụ BR-22: Cấu hình điều kiện và hành động · hệ thống tự áp khi thoả
 */
interface PromotionCreatePageProps {
  /** Base URI trang danh sách "Khuyến mãi" để quay lại sau khi lưu/huỷ — mặc định của Quản trị NH. */
  listPath?: string
}

export default function PromotionCreatePage({ listPath = RESTAURANT_ADMIN_PATHS.PROMOTIONS }: PromotionCreatePageProps = {}) {
  const navigate = useNavigate()
  const { toast } = useToast()

  // Khởi tạo state mặc định khớp với bản thiết kế Figma
  const [formData, setFormData] = useState<PromotionFormData>({
    name: "Combo trưa tiết kiệm",
    customerDescription: "Giảm 20.000đ cho đơn từ 100.000đ, 11h–14h",
    applyLevel: "dish",
    applyTarget: "all_order",
    minOrderValue: "100.000đ",
    minQuantity: "1",
    actionType: "fixed_amount",
    discountValue: "20.000đ",
    startDate: "01/07/2026",
    endDate: "31/07/2026",
    startTime: "11:00",
    endTime: "14:00",
    daysOfWeek: ["T2", "T3", "T4", "T5", "T6"],
    isAllBranches: true,
    selectedBranches: ["Chi nhánh Quận 1", "Chi nhánh Quận 3"],
    priority: "1",
    isActiveNow: true,
  })

  // Cập nhật từng trường trong form
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
      selectedBranches: checked
        ? ["Chi nhánh Quận 1", "Chi nhánh Quận 3", "Chi nhánh Thủ Đức"]
        : [],
    }))
  }

  // Toggle từng chi nhánh
  const handleToggleBranch = (branch: string, checked: boolean) => {
    setFormData((prev) => {
      const next = checked
        ? [...prev.selectedBranches, branch]
        : prev.selectedBranches.filter((b) => b !== branch)
      return {
        ...prev,
        selectedBranches: next,
        isAllBranches: next.length === 3,
      }
    })
  }

  // Xử lý Huỷ
  const handleCancel = () => {
    navigate(listPath)
  }

  // Xử lý Lưu chương trình
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name.trim()) {
      toast({
        title: "Lỗi",
        description: "Vui lòng nhập tên chương trình khuyến mãi",
        variant: "danger",
      })
      return
    }

    toast({
      title: "Thành công",
      description: `Đã lưu chương trình khuyến mãi "${formData.name}"!`,
      variant: "success",
    })

    // Điều hướng về danh sách khuyến mãi
    navigate(listPath)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col min-h-full bg-surface-page p-6 lg:p-8 space-y-6"
    >
      {/* 1. Header trang */}
      <div className="pb-2">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Tạo khuyến mãi
        </h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          Cấu hình điều kiện và hành động · hệ thống tự áp khi thoả (BR-22)
        </p>
      </div>

      {/* 2. Form bố cục 2 cột trên Desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Cột trái (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Card 1: Thông tin chương trình */}
          <PromotionInfoCard
            name={formData.name}
            onNameChange={(val) => updateField("name", val)}
            customerDescription={formData.customerDescription}
            onCustomerDescriptionChange={(val) =>
              updateField("customerDescription", val)
            }
            applyLevel={formData.applyLevel}
            onApplyLevelChange={(val: PromotionApplyLevel) =>
              updateField("applyLevel", val)
            }
          />

          {/* Card 2: Điều kiện áp dụng */}
          <PromotionConditionCard
            applyTarget={formData.applyTarget}
            onApplyTargetChange={(val: PromotionTarget) =>
              updateField("applyTarget", val)
            }
            minOrderValue={formData.minOrderValue}
            onMinOrderValueChange={(val) => updateField("minOrderValue", val)}
            minQuantity={formData.minQuantity}
            onMinQuantityChange={(val) => updateField("minQuantity", val)}
          />

          {/* Card 3: Hành động */}
          <PromotionActionCard
            actionType={formData.actionType}
            onActionTypeChange={(val: PromotionActionType) =>
              updateField("actionType", val)
            }
            discountValue={formData.discountValue}
            onDiscountValueChange={(val) => updateField("discountValue", val)}
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
            selectedBranches={formData.selectedBranches}
            onToggleBranch={handleToggleBranch}
            priority={formData.priority}
            onPriorityChange={(val) => updateField("priority", val)}
            isActiveNow={formData.isActiveNow}
            onIsActiveNowChange={(val) => updateField("isActiveNow", val)}
          />
        </div>
      </div>

      {/* 3. Footer hành động (Huỷ / Lưu chương trình) */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-border-default">
        <Button
          type="button"
          variant="outline"
          onClick={handleCancel}
          className="h-11 px-6 rounded-xl font-medium cursor-pointer"
        >
          Huỷ
        </Button>

        <Button
          type="submit"
          className="h-11 px-6 rounded-xl font-semibold bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover shadow-2xs cursor-pointer"
        >
          Lưu chương trình
        </Button>
      </div>
    </form>
  )
}

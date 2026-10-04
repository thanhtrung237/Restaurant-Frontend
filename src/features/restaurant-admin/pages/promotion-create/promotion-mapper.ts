import type { Promotion, Category, Dish, BranchListItem } from "@/types/models"
import type { PromotionAddRequest, PromotionUpdateRequest } from "@/types/requests"
import type { PromotionFormData } from "./types"
import {
  formatDateForApi,
  formatDateForDisplay,
  formatMoneyForApi,
  formatMoneyForDisplay,
  formatDaysOfWeekForApi,
  parseDaysOfWeekFromApi,
  formatTimeWindowForApi,
  parseTimeWindowFromApi,
} from "@/lib/promotion-format"

/**
 * Chuyển đổi dữ liệu form sang PromotionAddRequest gửi lên BE
 */
export function formDataToAddRequest(
  formData: PromotionFormData,
  restaurantId: number,
): PromotionAddRequest {
  const isDishLevel = formData.applyLevel === "dish"

  // Condition JSON
  const conditionObj: Record<string, unknown> = {}
  if (isDishLevel) {
    conditionObj.target = formData.applyTarget
    if (formData.applyTarget === "category") {
      conditionObj.categoryIds = formData.selectedCategories
    } else if (formData.applyTarget === "specific_dish") {
      conditionObj.dishIds = formData.selectedDishes
    }
    if (formData.minQuantity) {
      const q = Number.parseInt(formData.minQuantity, 10)
      if (q > 0) conditionObj.minQty = q
    }
  } else {
    // Cấp Hóa đơn: Cố định target là all_order, chỉ nhận minOrderValue
    conditionObj.target = "all_order"
    if (formData.minOrderValue) {
      const val = formatMoneyForApi(formData.minOrderValue)
      if (val > 0) conditionObj.minOrderValue = val
    }
  }

  // Action JSON
  const actionObj: Record<string, unknown> = {}
  if (isDishLevel && formData.actionType === "gift_dish") {
    actionObj.type = "gift_dish"
    actionObj.buyQty = Number.parseInt(formData.buyQty, 10) || 2
    actionObj.getQty = Number.parseInt(formData.getQty, 10) || 1
  } else if (formData.actionType === "percentage") {
    actionObj.type = "percentage"
    const pct = Number.parseFloat(formData.discountValue.replace(/[^\d.]/g, "")) || 0
    actionObj.value = Math.min(Math.max(pct, 0), 100)
  } else {
    actionObj.type = "fixed_amount"
    actionObj.value = formatMoneyForApi(formData.discountValue)
  }

  return {
    restaurantId,
    name: formData.name.trim(),
    description: formData.customerDescription.trim() || undefined,
    startDate: formatDateForApi(formData.startDate),
    endDate: formatDateForApi(formData.endDate),
    applyLevel: isDishLevel ? "ITEM" : "INVOICE",
    code: formData.code.trim() || undefined,
    usageLimit: formData.usageLimit ? Number.parseInt(formData.usageLimit, 10) : undefined,
    allBranches: formData.isAllBranches,
    branchIds: formData.isAllBranches ? undefined : formData.selectedBranchIds,
    isActiveNow: formData.isActiveNow,
    priority: Number.parseInt(formData.priority, 10) || 0,
    timeWindow: formatTimeWindowForApi(formData.startTime, formData.endTime) || undefined,
    daysOfWeek: formatDaysOfWeekForApi(formData.daysOfWeek) || undefined,
    condition: JSON.stringify(conditionObj),
    action: JSON.stringify(actionObj),
  }
}

/**
 * Chuyển đổi dữ liệu form sang PromotionUpdateRequest gửi lên BE
 */
export function formDataToUpdateRequest(formData: PromotionFormData): PromotionUpdateRequest {
  const isDishLevel = formData.applyLevel === "dish"

  // Condition JSON
  const conditionObj: Record<string, unknown> = {}
  if (isDishLevel) {
    conditionObj.target = formData.applyTarget
    if (formData.applyTarget === "category") {
      conditionObj.categoryIds = formData.selectedCategories
    } else if (formData.applyTarget === "specific_dish") {
      conditionObj.dishIds = formData.selectedDishes
    }
    if (formData.minQuantity) {
      const q = Number.parseInt(formData.minQuantity, 10)
      if (q > 0) conditionObj.minQty = q
    }
  } else {
    conditionObj.target = "all_order"
    if (formData.minOrderValue) {
      const val = formatMoneyForApi(formData.minOrderValue)
      if (val > 0) conditionObj.minOrderValue = val
    }
  }

  // Action JSON
  const actionObj: Record<string, unknown> = {}
  if (isDishLevel && formData.actionType === "gift_dish") {
    actionObj.type = "gift_dish"
    actionObj.buyQty = Number.parseInt(formData.buyQty, 10) || 2
    actionObj.getQty = Number.parseInt(formData.getQty, 10) || 1
  } else if (formData.actionType === "percentage") {
    actionObj.type = "percentage"
    const pct = Number.parseFloat(formData.discountValue.replace(/[^\d.]/g, "")) || 0
    actionObj.value = Math.min(Math.max(pct, 0), 100)
  } else {
    actionObj.type = "fixed_amount"
    actionObj.value = formatMoneyForApi(formData.discountValue)
  }

  return {
    name: formData.name.trim(),
    description: formData.customerDescription.trim() || undefined,
    startDate: formatDateForApi(formData.startDate),
    endDate: formatDateForApi(formData.endDate),
    applyLevel: isDishLevel ? "ITEM" : "INVOICE",
    code: formData.code.trim() || undefined,
    usageLimit: formData.usageLimit ? Number.parseInt(formData.usageLimit, 10) : undefined,
    allBranches: formData.isAllBranches,
    branchIds: formData.isAllBranches ? undefined : formData.selectedBranchIds,
    priority: Number.parseInt(formData.priority, 10) || 0,
    timeWindow: formatTimeWindowForApi(formData.startTime, formData.endTime) || undefined,
    daysOfWeek: formatDaysOfWeekForApi(formData.daysOfWeek) || undefined,
    condition: JSON.stringify(conditionObj),
    action: JSON.stringify(actionObj),
  }
}

/**
 * Chuyển dữ liệu Promotion từ BE ngược lại thành PromotionFormData
 */
export function apiToFormData(promotion: Promotion): PromotionFormData {
  const isDishLevel = promotion.applyLevel === "ITEM"
  const [startTime, endTime] = parseTimeWindowFromApi(promotion.timeWindow || "")

  // Parse condition
  let applyTarget: "all_order" | "category" | "specific_dish" = isDishLevel ? "all_order" : "all_order"
  let selectedCategories: number[] = []
  let selectedDishes: number[] = []
  let minOrderValue = ""
  let minQuantity = ""

  if (promotion.condition) {
    try {
      const cond = JSON.parse(promotion.condition)
      if (cond.target === "category" || cond.targetType === "category") {
        applyTarget = "category"
      } else if (cond.target === "specific_dish" || cond.targetType === "specific_dish") {
        applyTarget = "specific_dish"
      } else {
        applyTarget = "all_order"
      }

      if (Array.isArray(cond.categoryIds)) {
        selectedCategories = cond.categoryIds.map(Number)
      }
      if (Array.isArray(cond.dishIds)) {
        selectedDishes = cond.dishIds.map(Number)
      }
      if (cond.minOrderValue != null && cond.minOrderValue > 0) {
        minOrderValue = formatMoneyForDisplay(Number(cond.minOrderValue))
      }
      if (cond.minQty != null && cond.minQty > 0) {
        minQuantity = String(cond.minQty)
      } else if (cond.minQuantity != null && cond.minQuantity > 0) {
        minQuantity = String(cond.minQuantity)
      }
    } catch (e) {
      console.error("Error parsing promotion condition:", e)
    }
  }

  // Parse action
  let actionType: "fixed_amount" | "percentage" | "gift_dish" = "fixed_amount"
  let discountValue = ""
  let buyQty = "2"
  let getQty = "1"

  if (promotion.action) {
    try {
      const act = JSON.parse(promotion.action)
      const type = act.type || act.actionType
      if (type === "percentage") {
        actionType = "percentage"
        discountValue = String(act.value ?? act.discountPercent ?? "")
      } else if (type === "gift_dish") {
        actionType = "gift_dish"
        buyQty = String(act.buyQty ?? 2)
        getQty = String(act.getQty ?? 1)
      } else {
        actionType = "fixed_amount"
        const val = act.value ?? act.discountAmount ?? 0
        discountValue = val ? formatMoneyForDisplay(Number(val)) : ""
      }
    } catch (e) {
      console.error("Error parsing promotion action:", e)
    }
  }

  return {
    name: promotion.name || "",
    customerDescription: promotion.description || "",
    applyLevel: isDishLevel ? "dish" : "order",
    code: promotion.code || "",
    usageLimit: promotion.usageLimit != null ? String(promotion.usageLimit) : "",
    applyTarget,
    selectedCategories,
    selectedDishes,
    minOrderValue,
    minQuantity,
    actionType,
    discountValue,
    buyQty,
    getQty,
    startDate: formatDateForDisplay(promotion.startDate),
    endDate: formatDateForDisplay(promotion.endDate),
    startTime,
    endTime,
    daysOfWeek: parseDaysOfWeekFromApi(promotion.daysOfWeek || ""),
    isAllBranches: promotion.allBranches ?? true,
    selectedBranchIds: promotion.branchIds || [],
    priority: String(promotion.priority ?? 0),
    isActiveNow: promotion.status === "ACTIVE",
  }
}

/**
 * Sinh chuỗi xem trước tóm tắt 1 câu cho người dùng
 */
export function buildPromotionPreview(
  data: PromotionFormData,
  categories: Category[] = [],
  dishes: Dish[] = [],
  branches: BranchListItem[] = [],
): string {
  if (!data.name.trim()) {
    return "Nhập thông tin chương trình để xem tóm tắt quy tắc áp dụng."
  }

  const parts: string[] = []

  // 1. Hành động giảm
  if (data.applyLevel === "dish" && data.actionType === "gift_dish") {
    const buy = data.buyQty || "2"
    const get = data.getQty || "1"
    parts.push(`Mua ${buy} tặng ${get}`)
  } else if (data.actionType === "percentage") {
    const pct = data.discountValue ? `${data.discountValue}%` : "0%"
    parts.push(`Giảm ${pct}`)
  } else {
    const val = data.discountValue ? data.discountValue : "0đ"
    parts.push(`Giảm ${val}`)
  }

  // 2. Phạm vi áp dụng & đối tượng
  if (data.applyLevel === "dish") {
    if (data.applyTarget === "category") {
      const selectedNames = categories
        .filter((c) => data.selectedCategories.includes(c.id))
        .map((c) => c.name)
      if (selectedNames.length > 0) {
        parts.push(`cho danh mục [${selectedNames.join(", ")}]`)
      } else {
        parts.push("cho danh mục (chưa chọn)")
      }
    } else if (data.applyTarget === "specific_dish") {
      const selectedNames = dishes
        .filter((d) => data.selectedDishes.includes(d.id))
        .map((d) => d.name)
      if (selectedNames.length > 0) {
        parts.push(`cho [${selectedNames.slice(0, 3).join(", ")}${selectedNames.length > 3 ? ` và ${selectedNames.length - 3} món khác` : ""}]`)
      } else {
        parts.push("cho món cụ thể (chưa chọn)")
      }
    } else {
      parts.push("cho tất cả món")
    }

    if (data.minQuantity && Number(data.minQuantity) > 1) {
      parts.push(`(tối thiểu ${data.minQuantity} món)`)
    }
  } else {
    parts.push("toàn hóa đơn")
    if (data.minOrderValue && formatMoneyForApi(data.minOrderValue) > 0) {
      parts.push(`từ ${data.minOrderValue}`)
    }
  }

  // 3. Thời gian & Thứ
  if (data.daysOfWeek.length > 0 && data.daysOfWeek.length < 7) {
    parts.push(`vào ${data.daysOfWeek.join(", ")}`)
  }
  if (data.startTime || data.endTime) {
    parts.push(`khung giờ ${data.startTime || "00:00"}–${data.endTime || "23:59"}`)
  }

  // 4. Chi nhánh
  if (data.isAllBranches) {
    parts.push("tại Toàn hệ thống")
  } else {
    const selectedBranchNames = branches
      .filter((b) => data.selectedBranchIds.includes(b.id))
      .map((b) => b.name)
    if (selectedBranchNames.length > 0) {
      parts.push(`tại [${selectedBranchNames.join(", ")}]`)
    } else {
      parts.push(`tại ${data.selectedBranchIds.length} chi nhánh`)
    }
  }

  // 5. Giới hạn lượt
  if (data.usageLimit && Number(data.usageLimit) > 0) {
    parts.push(`(tối đa ${data.usageLimit} lượt)`)
  }

  return parts.join(" ") + "."
}

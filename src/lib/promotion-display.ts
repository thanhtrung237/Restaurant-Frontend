/**
 * promotion-display.ts
 * 
 * Helpers for displaying promotion information in customer-facing UI:
 * - Match active promotions with menu items
 * - Calculate discounted prices matching Backend PromotionEngine
 * - Format promotion badges
 */

import type { Promotion, BranchMenuItem } from "@/types/models"

export interface PromotionCondition {
  target?: "all_order" | "category" | "specific_dish"
  targetType?: "all_order" | "category" | "specific_dish"
  categoryIds?: number[]
  dishIds?: number[]
  minQty?: number
  minQuantity?: number
  minOrderValue?: number
  minTotal?: number
}

export interface PromotionAction {
  type?: "percentage" | "fixed_amount" | "gift_dish"
  actionType?: "percentage" | "fixed_amount" | "gift_dish"
  value?: number
  discountPercent?: number
  discountAmount?: number
  buyQty?: number
  getQty?: number
  giftDishId?: number
}

export interface ItemPromotionMatch {
  promotion: Promotion
  discountPercent: number
  discountAmount: number
  originalPrice: number
  finalPrice: number
}

const JS_DAY_NAMES = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"]

/**
 * Parse JSON condition string safely
 */
export function parseCondition(conditionStr?: string): PromotionCondition | null {
  if (!conditionStr) return null
  try {
    return JSON.parse(conditionStr)
  } catch {
    return null
  }
}

/**
 * Parse JSON action string safely
 */
function parseAction(actionStr?: string): PromotionAction | null {
  if (!actionStr) return null
  try {
    return JSON.parse(actionStr)
  } catch {
    return null
  }
}

/**
 * Check if promotion is currently active based on date/time/day
 * Matches logic in Backend PromotionEngine.java
 */
export function isPromotionActiveNow(promotion: Promotion): boolean {
  if (promotion.status !== "ACTIVE") return false

  const now = new Date()
  const today = now.toISOString().split("T")[0] // YYYY-MM-DD

  // 1. Check date range
  if (promotion.startDate && today < promotion.startDate) return false
  if (promotion.endDate && today > promotion.endDate) return false

  // 2. Check days of week (Supports "MON,TUE,WED" or JSON array)
  if (promotion.daysOfWeek && promotion.daysOfWeek.trim()) {
    const currentDayName = JS_DAY_NAMES[now.getDay()]
    const raw = promotion.daysOfWeek.trim()
    if (raw.startsWith("[")) {
      try {
        const daysArray = JSON.parse(raw) as (number | string)[]
        const match = daysArray.some((d) => {
          if (typeof d === "number") return d === now.getDay()
          return String(d).toUpperCase().includes(currentDayName)
        })
        if (!match) return false
      } catch {
        // Fallback
      }
    } else {
      const days = raw.split(",").map((d) => d.trim().toUpperCase())
      const match = days.some(
        (d) => d === currentDayName || currentDayName.startsWith(d) || d.startsWith(currentDayName.substring(0, 3))
      )
      if (!match) return false
    }
  }

  // 3. Check time window (Supports "11:00-14:00" or JSON object)
  if (promotion.timeWindow && promotion.timeWindow.trim()) {
    const raw = promotion.timeWindow.trim()
    const currentTime = now.toTimeString().split(" ")[0].substring(0, 5) // "HH:MM"

    if (raw.includes("-")) {
      const [start, end] = raw.split("-").map((t) => t.trim())
      if (start && end) {
        if (end === "00:00" || end < start) {
          // Cross midnight
          if (currentTime < start && currentTime > end) return false
        } else {
          if (currentTime < start || currentTime > end) return false
        }
      }
    } else if (raw.startsWith("{")) {
      try {
        const { startTime, endTime } = JSON.parse(raw) as { startTime: string; endTime: string }
        if (startTime && endTime) {
          if (currentTime < startTime || currentTime > endTime) return false
        }
      } catch {
        // Skip
      }
    }
  }

  // 4. Check usage limit
  if (
    promotion.usageLimit != null &&
    promotion.usageCount != null &&
    promotion.usageCount >= promotion.usageLimit
  ) {
    return false
  }

  return true
}

/**
 * Check if a dish matches the promotion condition
 */
export function doesDishMatchPromotion(dish: BranchMenuItem, promotion: Promotion): boolean {
  if (promotion.applyLevel !== "ITEM") return false

  const condition = parseCondition(promotion.condition)
  if (!condition) return false

  const target = condition.target || condition.targetType || "all_order"

  switch (target) {
    case "all_order":
      return true

    case "category":
      if (!condition.categoryIds || !dish.categoryId) return false
      return condition.categoryIds.map(Number).includes(Number(dish.categoryId))

    case "specific_dish":
      if (!condition.dishIds || !dish.dishId) return false
      return condition.dishIds.map(Number).includes(Number(dish.dishId))

    default:
      return false
  }
}

/**
 * Calculate item discount amount based on promotion action
 * Matches PromotionEngine.java calculateDiscount logic
 */
export function calculateItemDiscount(
  price: number,
  quantity: number,
  promotion: Promotion
): { discountAmount: number; discountPercent: number } {
  const action = parseAction(promotion.action)
  if (!action) return { discountAmount: 0, discountPercent: 0 }

  const totalPrice = price * quantity
  const type = action.type || action.actionType || "fixed_amount"

  switch (type) {
    case "percentage": {
      const percent = action.value ?? action.discountPercent ?? 0
      const boundedPercent = Math.min(Math.max(percent, 0), 100)
      const discountAmount = Math.round((totalPrice * boundedPercent) / 100)
      return {
        discountAmount,
        discountPercent: boundedPercent,
      }
    }

    case "fixed_amount": {
      const rawValue = action.value ?? action.discountAmount ?? 0
      const discountAmount = Math.min(rawValue, totalPrice)
      const discountPercent = totalPrice > 0 ? Math.round((discountAmount / totalPrice) * 100) : 0
      return {
        discountAmount,
        discountPercent,
      }
    }

    case "gift_dish": {
      // Mua X tặng Y
      const buyQty = action.buyQty ?? 2
      const getQty = action.getQty ?? 1
      const setSize = buyQty + getQty
      const sets = Math.floor(quantity / setSize)
      if (sets > 0 && quantity > 0) {
        const unitPrice = totalPrice / quantity
        const discountAmount = Math.round(sets * getQty * unitPrice)
        const discountPercent = Math.round((discountAmount / totalPrice) * 100)
        return {
          discountAmount,
          discountPercent,
        }
      }
      return { discountAmount: 0, discountPercent: 0 }
    }

    default:
      return { discountAmount: 0, discountPercent: 0 }
  }
}

/**
 * Kiểm tra điều kiện áp dụng cho món (minQty, minOrderValue)
 * Giúp đưa ra lời nhắc thân thiện cho khách khi chưa đủ điều kiện (FR-CUS-09)
 */
export function checkItemCondition(
  promotion: Promotion,
  quantity = 1,
  subtotal = 0
): { satisfied: boolean; hint?: string } {
  const condition = parseCondition(promotion.condition)
  const action = parseAction(promotion.action)

  if (condition) {
    const minQty = condition.minQty ?? condition.minQuantity
    if (minQty && quantity < minQty) {
      return {
        satisfied: false,
        hint: `Thêm ${minQty - quantity} phần nữa để áp dụng "${promotion.name}"`,
      }
    }

    const minOrderValue = condition.minOrderValue ?? condition.minTotal
    if (minOrderValue && subtotal < minOrderValue) {
      const diff = minOrderValue - subtotal
      return {
        satisfied: false,
        hint: `Cần thêm ${diff.toLocaleString("vi-VN")}đ để áp dụng "${promotion.name}"`,
      }
    }
  }

  if (action && (action.type === "gift_dish" || action.actionType === "gift_dish")) {
    const buyQty = action.buyQty ?? 2
    const getQty = action.getQty ?? 1
    const setSize = buyQty + getQty
    const sets = Math.floor(quantity / setSize)
    const remainder = quantity % setSize
    if (sets === 0) {
      return {
        satisfied: false,
        hint: `Mua ${buyQty} tặng ${getQty} — thêm ${setSize - quantity} phần để nhận ưu đãi`,
      }
    } else if (remainder > 0) {
      return {
        satisfied: true,
        hint: `Thêm ${setSize - remainder} phần nữa để nhận thêm ${getQty} suất tặng`,
      }
    }
  }

  return { satisfied: true }
}

/**
 * Đánh giá chi tiết khuyến mãi món ăn (áp dụng cho giỏ hàng và danh sách món)
 */
export function evaluateItemPromotion(
  dish: { dishId: number | string; categoryId?: number | string; effectivePrice: number },
  quantity: number,
  promotions: Promotion[]
): {
  appliedPromotion?: Promotion
  discountAmount: number
  discountPercent: number
  hint?: string
} {
  const itemAsMenuItem: BranchMenuItem = {
    dishId: Number(dish.dishId),
    dishName: "",
    categoryId: Number(dish.categoryId || 0),
    basePrice: dish.effectivePrice,
    effectivePrice: dish.effectivePrice,
    hasOverride: false,
    isHidden: false,
    isBranchSpecific: false,
    stockStatus: "AVAILABLE",
  }

  // Lọc các KM cấp MÓN đang active khớp với món này
  const matchingPromos = promotions
    .filter((p) => p.applyLevel === "ITEM" && isPromotionActiveNow(p))
    .filter((p) => doesDishMatchPromotion(itemAsMenuItem, p))

  if (matchingPromos.length === 0) {
    return { discountAmount: 0, discountPercent: 0 }
  }

  const subtotal = dish.effectivePrice * quantity
  let bestEligible: { promo: Promotion; discount: number; percent: number } | null = null
  let bestHint: string | undefined

  for (const promo of matchingPromos) {
    const condCheck = checkItemCondition(promo, quantity, subtotal)
    if (condCheck.satisfied) {
      const { discountAmount, discountPercent } = calculateItemDiscount(
        dish.effectivePrice,
        quantity,
        promo
      )
      if (discountAmount > 0) {
        if (
          !bestEligible ||
          (promo.priority || 0) > (bestEligible.promo.priority || 0) ||
          ((promo.priority || 0) === (bestEligible.promo.priority || 0) &&
            discountAmount > bestEligible.discount)
        ) {
          bestEligible = { promo, discount: discountAmount, percent: discountPercent }
          if (condCheck.hint) bestHint = condCheck.hint
        }
      }
    } else if (!bestHint && condCheck.hint) {
      bestHint = condCheck.hint
    }
  }

  if (bestEligible) {
    return {
      appliedPromotion: bestEligible.promo,
      discountAmount: bestEligible.discount,
      discountPercent: bestEligible.percent,
      hint: bestHint,
    }
  }

  return {
    discountAmount: 0,
    discountPercent: 0,
    hint: bestHint,
  }
}

/**
 * Find the best matching promotion for a menu item
 * Returns null if no active promotion applies
 */
export function findBestPromotionForItem(
  dish: BranchMenuItem,
  promotions: Promotion[]
): ItemPromotionMatch | null {
  const result = evaluateItemPromotion(
    { dishId: dish.dishId, categoryId: dish.categoryId, effectivePrice: dish.effectivePrice },
    1,
    promotions
  )

  if (!result.appliedPromotion || result.discountAmount <= 0) {
    return null
  }

  return {
    promotion: result.appliedPromotion,
    discountPercent: result.discountPercent,
    discountAmount: result.discountAmount,
    originalPrice: dish.effectivePrice,
    finalPrice: Math.max(0, dish.effectivePrice - result.discountAmount),
  }
}


/**
 * Format promotion badge text for customer menu
 */
export function formatPromotionBadge(promotion: Promotion): string {
  const action = parseAction(promotion.action)
  if (!action) return ""

  const type = action.type || action.actionType

  switch (type) {
    case "percentage": {
      const pct = action.value ?? action.discountPercent
      return pct ? `-${pct}%` : ""
    }

    case "fixed_amount": {
      const val = action.value ?? action.discountAmount
      return val ? `-${Number(val).toLocaleString("vi-VN")}đ` : ""
    }

    case "gift_dish":
      if (action.buyQty && action.getQty) {
        return `Mua ${action.buyQty} tặng ${action.getQty}`
      }
      return "🎁 Mua X tặng Y"

    default:
      return ""
  }
}

/**
 * Get short promotion description for display
 */
export function getPromotionDescription(promotion: Promotion): string {
  if (promotion.description) return promotion.description

  const action = parseAction(promotion.action)
  if (!action) return promotion.name

  const type = action.type || action.actionType

  switch (type) {
    case "percentage": {
      const pct = action.value ?? action.discountPercent
      return `Giảm ${pct}%`
    }

    case "fixed_amount": {
      const val = action.value ?? action.discountAmount
      return `Giảm ${Number(val)?.toLocaleString("vi-VN")}đ`
    }

    case "gift_dish":
      if (action.buyQty && action.getQty) {
        return `Mua ${action.buyQty} tặng ${action.getQty}`
      }
      return "Combo tặng món"

    default:
      return promotion.name
  }
}

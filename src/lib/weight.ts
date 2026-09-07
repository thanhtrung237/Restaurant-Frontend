/**
 * Helpers dùng chung cho món bán theo cân (Dish.soldByWeight).
 * BE luôn lưu & tính theo KILOGRAM (OrderDetail.weightKg, ConfirmWeightRequest.weightKg),
 * FE cho phép người nhập chọn đơn vị hiển thị/nhập là kg hoặc g, nhưng luôn quy đổi
 * về kg trước khi gửi request xuống BE.
 */

export type WeightUnit = "kg" | "g"

/**
 * Hiển thị khối lượng đã cân (luôn ở dạng kg từ BE) theo quy tắc:
 * - < 1kg → hiển thị bằng gram, làm tròn về số nguyên (VD: 0.75 → "750g")
 * - >= 1kg → hiển thị bằng kilogram, bỏ số 0 thừa (VD: 1.20 → "1.2kg", 2 → "2kg")
 */
export function formatWeight(weightKg: number): string {
  if (weightKg < 1) {
    const grams = Math.round(weightKg * 1000)
    return `${grams}g`
  }
  // Tối đa 3 chữ số thập phân (khớp scale cột weight_kg ở BE), bỏ số 0 thừa ở cuối
  const trimmed = Number.parseFloat(weightKg.toFixed(3))
  return `${trimmed}kg`
}

/** Quy đổi 1 giá trị nhập theo đơn vị `unit` sang kilogram để gửi xuống BE. */
export function toKg(value: number, unit: WeightUnit): number {
  return unit === "g" ? value / 1000 : value
}

/** Quy đổi ngược 1 giá trị kg sang đơn vị `unit` — dùng khi người dùng đổi qua lại đơn vị trên UI. */
export function fromKg(weightKg: number, unit: WeightUnit): number {
  return unit === "g" ? weightKg * 1000 : weightKg
}

/** Bước nhảy & số thập phân hợp lý cho input theo từng đơn vị. */
export const WEIGHT_INPUT_CONFIG: Record<WeightUnit, { step: string; min: string; quickValues: string[] }> = {
  kg: { step: "0.05", min: "0.05", quickValues: ["0.5", "0.8", "1.0", "1.2", "1.5", "2.0"] },
  g: { step: "10", min: "10", quickValues: ["100", "250", "500", "750", "1000"] },
}
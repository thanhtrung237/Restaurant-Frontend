import { z } from "zod"

/**
 * Schema validation cho form tạo/sửa chi nhánh
 */

export interface BranchFormValues {
  code: string
  name: string
  address?: string
  phone?: string
  vatRate: string
  serviceFeeRate: string
  copyEnabled: boolean
  sourceBranchId: string
  copyOpeningHours: boolean
  copyFeeRates: boolean
  copyBankInfo: boolean
}

export function buildBranchSchema(isEdit: boolean) {
  return z
    .object({
      // Luôn là string (khớp BranchFormValues). Khi tạo mới mới bắt buộc nhập — xem refine bên dưới.
      code: z.string().max(50, "Mã chi nhánh tối đa 50 ký tự"),
      name: z.string().min(1, "Tên chi nhánh không được để trống").max(255, "Tên chi nhánh tối đa 255 ký tự"),
      address: z.string().max(500, "Địa chỉ tối đa 500 ký tự").optional(),
      phone: z.string().max(20, "Số điện thoại tối đa 20 ký tự").optional(),
      vatRate: z.string(),
      serviceFeeRate: z.string(),
      copyEnabled: z.boolean(),
      sourceBranchId: z.string(),
      copyOpeningHours: z.boolean(),
      copyFeeRates: z.boolean(),
      copyBankInfo: z.boolean(),
    })
    .refine((data) => isEdit || data.code.trim() !== "", {
      message: "Mã chi nhánh không được để trống",
      path: ["code"],
    })
    .refine(
      (data) => {
        // Nếu không enable copy thì không cần validate
        if (!data.copyEnabled) return true
        // Nếu enable copy thì phải chọn chi nhánh nguồn
        return data.sourceBranchId !== ""
      },
      {
        message: "Vui lòng chọn chi nhánh nguồn để sao chép",
        path: ["sourceBranchId"],
      },
    )
    .refine(
      (data) => {
        // Nếu không enable copy thì không cần validate
        if (!data.copyEnabled) return true
        // Nếu enable copy thì ít nhất phải chọn 1 mục để sao chép
        return data.copyOpeningHours || data.copyFeeRates || data.copyBankInfo
      },
      {
        message: "Vui lòng chọn ít nhất một mục để sao chép",
        path: ["copyOpeningHours"],
      },
    )
    .refine(
      (data) => {
        if (!data.vatRate || data.vatRate.trim() === "") return true
        const num = Number.parseFloat(data.vatRate)
        return !Number.isNaN(num) && num >= 0 && num <= 100
      },
      {
        message: "Thuế VAT phải từ 0 đến 100",
        path: ["vatRate"],
      },
    )
    .refine(
      (data) => {
        if (!data.serviceFeeRate || data.serviceFeeRate.trim() === "") return true
        const num = Number.parseFloat(data.serviceFeeRate)
        return !Number.isNaN(num) && num >= 0 && num <= 100
      },
      {
        message: "Phí dịch vụ phải từ 0 đến 100",
        path: ["serviceFeeRate"],
      },
    )
}

/**
 * Parse rate string to number or undefined
 */
export function parseRate(value: string | undefined): number | undefined {
  if (!value || value.trim() === "") return undefined
  const num = Number.parseFloat(value)
  return Number.isNaN(num) ? undefined : num
}
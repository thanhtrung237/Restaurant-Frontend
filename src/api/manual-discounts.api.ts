import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { ManualDiscount } from "@/types/models"
import type { ManualDiscountAddRequest } from "@/types/requests"

/**
 * Chiết khấu tay. Nếu `value` vượt `Branch.discountApprovalThreshold` thì BE yêu cầu
 * người duyệt và ghi `AuditLog` — UI nên hiển thị cảnh báo trước khi submit.
 */
export function createManualDiscount(body: ManualDiscountAddRequest) {
  return apiPost<ManualDiscount>("/manual-discounts", body)
}
export function getManualDiscount(id: number) {
  return apiGet<ManualDiscount>(`/manual-discounts/${id}`)
}
export function getManualDiscountsByOrder(orderId: number) {
  return apiGet<ManualDiscount[]>(`/manual-discounts/order/${orderId}`)
}
export function getManualDiscountsByInvoice(invoiceId: number) {
  return apiGet<ManualDiscount[]>(`/manual-discounts/invoice/${invoiceId}`)
}
export function deleteManualDiscount(id: number) {
  return apiDelete<void>(`/manual-discounts/${id}`)
}

export function useManualDiscountsByInvoice(invoiceId?: number) {
  return useQuery({
    queryKey: qk.manualDiscounts.byInvoice(invoiceId as number),
    queryFn: () => getManualDiscountsByInvoice(invoiceId as number),
    enabled: typeof invoiceId === "number",
  })
}
export function useCreateManualDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createManualDiscount,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.manualDiscounts.all })
      void qc.invalidateQueries({ queryKey: qk.invoices.all })
    },
  })
}
export function useDeleteManualDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteManualDiscount,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.manualDiscounts.all })
      void qc.invalidateQueries({ queryKey: qk.invoices.all })
    },
  })
}

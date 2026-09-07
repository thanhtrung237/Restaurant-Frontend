import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { Payment } from "@/types/models"
import type { PaymentAddRequest } from "@/types/requests"

/** Ghi nhận 1 lần thanh toán. Với tiền mặt, gửi `amountTendered` để BE trả `changeAmount`. */
export function createPayment(body: PaymentAddRequest) {
  return apiPost<Payment>("/payments", body)
}
export function getPayment(id: number) {
  return apiGet<Payment>(`/payments/${id}`)
}
export function getPaymentsByInvoice(invoiceId: number) {
  return apiGet<Payment[]>(`/payments/invoice/${invoiceId}`)
}
export function deletePayment(id: number) {
  return apiDelete<void>(`/payments/${id}`)
}

export function usePaymentsByInvoice(invoiceId?: number) {
  return useQuery({
    queryKey: qk.payments.byInvoice(invoiceId as number),
    queryFn: () => getPaymentsByInvoice(invoiceId as number),
    enabled: typeof invoiceId === "number",
  })
}
export function useCreatePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPayment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.payments.all })
      // Hoá đơn đổi `totalPaid`/`remainingAmount`/`status` sau khi thanh toán.
      void qc.invalidateQueries({ queryKey: qk.invoices.all })
    },
  })
}

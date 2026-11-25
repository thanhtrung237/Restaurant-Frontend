import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { Invoice, ManualDiscount } from "@/types/models"
import type { ManualDiscountAddRequest } from "@/types/requests"

export type InvoiceDiscountInput = Pick<ManualDiscountAddRequest, "type" | "value" | "reason">

interface PendingDiscountApproval {
  requestId: string
  requestedBy: number
  type?: InvoiceDiscountInput["type"]
  value?: number
  reason: string
}

export function usePendingDiscountApproval(invoiceId?: number) {
  return useQuery({
    queryKey: [...qk.manualDiscounts.byInvoice(invoiceId as number), "approval"],
    queryFn: () =>
      apiGet<PendingDiscountApproval>(`/manual-discounts/invoice/${invoiceId}/approval`),
    enabled: invoiceId !== undefined,
    refetchInterval: invoiceId !== undefined ? 2500 : false,
  })
}

export function useDecideDiscountApproval(sessionId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceId,
      requestId,
      approved,
    }: {
      invoiceId: number
      requestId: string
      approved: boolean
    }) =>
      apiPost<Invoice>(`/manual-discounts/invoice/${invoiceId}/approval/${approved}`, {
        requestId,
      }),
    onSuccess: async (invoice) => {
      if (sessionId !== undefined) qc.setQueryData(qk.invoices.bySession(sessionId), invoice)
      await qc.invalidateQueries({ queryKey: qk.invoices.all })
    },
  })
}

export function useSaveInvoiceDiscount(sessionId?: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      invoiceId,
      discount,
    }: {
      invoiceId: number
      discount: InvoiceDiscountInput | null
    }) =>
      discount
        ? apiPut<Invoice>(`/manual-discounts/invoice/${invoiceId}`, discount)
        : apiDelete<Invoice>(`/manual-discounts/invoice/${invoiceId}`),
    onSuccess: async (invoice) => {
      await qc.cancelQueries({ queryKey: qk.invoices.all })
      if (sessionId !== undefined) {
        qc.setQueryData(qk.invoices.bySession(sessionId), invoice)
      }
      await Promise.all([
        qc.invalidateQueries({ queryKey: qk.invoices.all }),
        qc.invalidateQueries({ queryKey: qk.manualDiscounts.byInvoice(invoice.id) }),
      ])
    },
  })
}

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

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { Invoice, InvoiceListItem } from "@/types/models"
import type { InvoiceStatus } from "@/types/enums"
import type { InvoiceCreateRequest } from "@/types/requests"

export interface QrCodeResponse {
  invoiceId: number
  invoiceNumber: string
  remainingAmount: number
  grandTotal: number
  totalPaid: number
  bankName: string
  accountNo: string
  accountName: string
  qrImageUrl: string
  transferContent: string
}

/** Chốt hoá đơn cho 1 PHIÊN BÀN (1 phiên nhiều order → 1 hoá đơn). */
export function createInvoice(body: InvoiceCreateRequest) {
  return apiPost<Invoice>("/invoices", body)
}
export function getInvoice(id: number) {
  return apiGet<Invoice>(`/invoices/${id}`)
}
export function getInvoiceBySession(tableSessionId: number) {
  return apiGet<Invoice>(`/invoices/session/${tableSessionId}`)
}
export function getInvoiceQrCode(id: number) {
  return apiGet<QrCodeResponse>(`/invoices/${id}/qr-code`)
}
export function getInvoiceQrCodeBySession(tableSessionId: number) {
  return apiGet<QrCodeResponse>(`/invoices/session/${tableSessionId}/qr-code`)
}
export function getInvoicesByBranch(branchId: number, status?: InvoiceStatus) {
  return apiGet<InvoiceListItem[]>(`/invoices/branch/${branchId}`, { params: { status } })
}
export function cancelInvoice(id: number) {
  return apiPost<Invoice>(`/invoices/${id}/cancel`)
}
export function deleteInvoice(id: number) {
  return apiDelete<void>(`/invoices/${id}`)
}
/** Phát hành hóa đơn điện tử — chỉ gọi được khi invoice status = PAID. */
export function issueEInvoice(id: number) {
  return apiPost<Invoice>(`/invoices/${id}/issue`)
}

/**
 * Poll hoá đơn sau khi khách chuyển khoản QR: BE chưa có webhook báo về,
 * nên màn `payment-qr` truyền `refetchInterval` và chờ `status` chuyển sang PAID.
 */
export function useInvoice(id?: number, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: qk.invoices.detail(id as number),
    queryFn: () => getInvoice(id as number),
    enabled: typeof id === "number",
    refetchInterval: options?.refetchInterval,
  })
}
/**
 * Poll hoá đơn sau khi khách chuyển khoản QR: BE chưa có webhook báo về,
 * nên màn `payment-qr` truyền `refetchInterval` và chờ `status` chuyển sang PAID.
 */
export function useInvoiceBySession(
  tableSessionId?: number,
  options?: { refetchInterval?: number; enabled?: boolean }
) {
  return useQuery({
    queryKey: qk.invoices.bySession(tableSessionId as number),
    queryFn: () => getInvoiceBySession(tableSessionId as number),
    enabled: options?.enabled !== false && typeof tableSessionId === "number",
    refetchInterval: options?.refetchInterval,
  })
}
export function useInvoicesByBranch(branchId?: number, status?: InvoiceStatus) {
  return useQuery({
    queryKey: qk.invoices.byBranch(branchId as number, status),
    queryFn: () => getInvoicesByBranch(branchId as number, status),
    enabled: typeof branchId === "number",
  })
}
export function useCreateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createInvoice,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.invoices.all }),
  })
}
export function useCancelInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: cancelInvoice,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.invoices.all }),
  })
}
export function useIssueEInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: issueEInvoice,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.invoices.all }),
  })
}

export function useInvoiceQrCode(id?: number) {
  return useQuery({
    queryKey: ["invoices", id, "qr-code"],
    queryFn: () => getInvoiceQrCode(id as number),
    enabled: typeof id === "number",
  })
}

export function useInvoiceQrCodeBySession(
  tableSessionId?: number,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: ["invoices", "session", tableSessionId, "qr-code"],
    queryFn: () => getInvoiceQrCodeBySession(tableSessionId as number),
    enabled: options?.enabled !== false && typeof tableSessionId === "number",
  })
}

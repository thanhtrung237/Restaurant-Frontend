import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, isApiStatus, retryUnlessStatus } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { Invoice, InvoiceListItem } from "@/types/models"
import type { InvoiceStatus } from "@/types/enums"
import type { InvoiceCreateRequest } from "@/types/requests"

export interface QrCodeResponse {
  automaticVerification?: boolean
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
export function shareInvoiceQuote(id: number, expectedTotal: number) {
  return apiPost<void>(`/invoices/${id}/share-quote`, { expectedTotal })
}
export async function getInvoiceBySession(tableSessionId: number): Promise<Invoice | null> {
  try {
    return await apiGet<Invoice>(`/invoices/session/${tableSessionId}`)
  } catch (error) {
    // Một phiên đang chờ thanh toán có thể chưa lập hóa đơn.
    if (isApiStatus(error, 404)) return null
    throw error
  }
}
export function reportPaymentQrOpened(tableSessionId: number, expectedTotal: number) {
  return apiPost<void>(`/invoices/session/${tableSessionId}/qr-opened`, { expectedTotal })
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

export function useInvoice(id?: number, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: qk.invoices.detail(id as number),
    queryFn: () => getInvoice(id as number),
    enabled: typeof id === "number",
    refetchInterval: options?.refetchInterval,
    // 404 = hoá đơn không tồn tại: câu trả lời cuối cùng, thử lại cũng vậy.
    retry: retryUnlessStatus([404]),
  })
}
/** Đọc hóa đơn theo phiên và theo dõi trạng thái định kỳ nếu màn thanh toán yêu cầu. */
export function useInvoiceBySession(
  tableSessionId?: number,
  options?: { refetchInterval?: number | ((query: { state: { data: Invoice | null | undefined } }) => number | false); enabled?: boolean; retry?: boolean | number }
) {
  return useQuery({
    queryKey: qk.invoices.bySession(tableSessionId as number),
    queryFn: () => getInvoiceBySession(tableSessionId as number),
    enabled: options?.enabled !== false && typeof tableSessionId === "number",
    refetchInterval: options?.refetchInterval,
    retry: options?.retry,
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
    // 409 = chi nhánh chưa cấu hình tài khoản ngân hàng (be-issues mục 5), 404 = không có hoá
    // đơn. Cả hai là câu trả lời của backend, màn hình hiện thông báo riêng — đừng thử lại.
    retry: retryUnlessStatus([404, 409]),
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
    // 409 = "Chưa có hoá đơn, vui lòng chờ thu ngân" (be-issues mục 17 — endpoint này CHỈ ĐỌC),
    // 404 = phiên không có hoá đơn. Màn khách poll lại theo nhịp riêng nên không cần retry.
    retry: retryUnlessStatus([404, 409]),
  })
}

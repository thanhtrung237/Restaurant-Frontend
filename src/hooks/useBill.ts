import { useInvoiceBySession } from "@/api/invoices.api"
import { apiGet } from "@/lib/http"
import { useQuery } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"

export interface BillPreview {
  grossSubTotal: number
  itemPromotionDiscount: number
  orderPromotionDiscount: number
  orderPromotionName?: string
  orderPromotionId?: number
  manualDiscount: number
  serviceFeeRate: number
  serviceFee: number
  vatRate: number
  vatOnServiceFee: boolean
  vatBase: number
  vatAmount: number
  grandTotal: number
}

function getBillPreview(tableSessionId: number) {
  return apiGet<BillPreview>(`/table-sessions/${tableSessionId}/bill-preview`)
}

export interface UseBillOptions {
  refetchInterval?: number | false
  refreshDraft?: boolean
}

/**
 * Hook lấy thông tin hóa đơn hoặc preview tạm tính.
 * Dùng số đã lưu trên hóa đơn. Chốt bàn có thể yêu cầu tính lại bản nháp từ API preview.
 */
export function useBill(tableSessionId?: number, options?: UseBillOptions) {
  // Thử lấy invoice trước (không retry với 404)
  const { data: invoice, isLoading: invoiceLoading } = useInvoiceBySession(tableSessionId, {
    enabled: typeof tableSessionId === "number",
    retry: false,
    refetchInterval: options?.refetchInterval === false ? undefined : options?.refetchInterval,
  })

  const refreshDraft =
    options?.refreshDraft &&
    invoice?.status === "PENDING" &&
    !invoice.quoteShared &&
    (invoice.totalPaid ?? 0) === 0
  const usePreview = !invoice || refreshDraft
  const {
    data: preview,
    isLoading: previewLoading,
    error: previewError,
  } = useQuery({
    queryKey: qk.tableSessions.billPreview(tableSessionId as number),
    queryFn: () => getBillPreview(tableSessionId as number),
    enabled: typeof tableSessionId === "number" && Boolean(usePreview),
    retry: false,
    refetchOnMount: options?.refreshDraft ? "always" : undefined,
    refetchInterval: options?.refetchInterval,
  })

  const isLoading = invoiceLoading || (Boolean(usePreview) && previewLoading)

  if (usePreview && preview && Number.isFinite(preview.grandTotal)) {
    return { data: preview, isLoading, hasInvoice: Boolean(invoice), error: null }
  }

  if (invoice) {
    // Chuyển đổi invoice thành format chuẩn
    const grossSubTotal = invoice.subTotalBeforeDiscount ?? 0
    // BE đã tách sẵn KM món / KM đơn — dùng lại, không tự suy ra ở FE.
    const itemPromoDiscount = Math.min(
      invoice.itemPromotionDiscount ?? 0,
      invoice.totalPromotionDiscount ?? 0,
    )
    const orderPromoDiscount =
      invoice.orderPromotionDiscount ??
      Math.max(0, (invoice.totalPromotionDiscount ?? 0) - itemPromoDiscount)

    return {
      data: {
        grossSubTotal,
        itemPromotionDiscount: itemPromoDiscount,
        orderPromotionDiscount: orderPromoDiscount,
        orderPromotionName: invoice.orderPromotionName ?? invoice.promotionName,
        orderPromotionId: invoice.orderPromotionId ?? invoice.promotionId,
        manualDiscount: invoice.totalManualDiscount ?? 0,
        serviceFeeRate:
          invoice.serviceFee && grossSubTotal > 0
            ? (invoice.serviceFee /
                (grossSubTotal -
                  (invoice.totalPromotionDiscount ?? 0) -
                  (invoice.totalManualDiscount ?? 0))) *
              100
            : 5,
        serviceFee: invoice.serviceFee ?? 0,
        vatRate:
          invoice.vatAmount && grossSubTotal + (invoice.serviceFee ?? 0) > 0
            ? (invoice.vatAmount /
                (grossSubTotal -
                  (invoice.totalPromotionDiscount ?? 0) -
                  (invoice.totalManualDiscount ?? 0) +
                  (invoice.serviceFee ?? 0))) *
              100
            : 8,
        vatOnServiceFee: true, // Giả định mặc định
        vatBase:
          grossSubTotal -
          (invoice.totalPromotionDiscount ?? 0) -
          (invoice.totalManualDiscount ?? 0),
        vatAmount: invoice.vatAmount ?? 0,
        grandTotal: invoice.grandTotal,
      },
      isLoading,
      hasInvoice: true,
      error: null,
    }
  }

  return {
    data: null,
    isLoading,
    hasInvoice: false,
    error: previewError,
  }
}

import { useMutation } from "@tanstack/react-query"
import { apiPost } from "@/lib/http"

/**
 * API cho chức năng in phiếu bếp
 * FR-SRV-07: Reprint phiếu bếp cho một order
 */

/**
 * In lại phiếu bếp cho một order (chỉ in những món đang PREPARING)
 */
export function reprintKitchenTicket(orderId: number) {
  return apiPost<{ message: string }>(`/kitchen-tickets/reprint/${orderId}`, {})
}

/**
 * Hook để in lại phiếu bếp
 */
export function useReprintKitchenTicket() {
  return useMutation({
    mutationFn: reprintKitchenTicket,
    onSuccess: () => {
      // Không cần invalidate query vì in phiếu không thay đổi dữ liệu
      // Chỉ gửi lệnh in tới máy in
    },
  })
}

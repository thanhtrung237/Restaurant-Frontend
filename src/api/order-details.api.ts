import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { OrderDetail } from "@/types/models"
import type { OrderDetailStatus } from "@/types/enums"
import type {
  OrderDetailAddRequest, OrderDetailCancelRequest,
  OrderDetailConfirmWeightRequest, OrderDetailUpdateRequest,
} from "@/types/requests"

/** Thêm món vào 1 order đã tồn tại (khác `POST /orders` là tạo lượt gọi mới). */
export function addOrderDetail(orderId: number, body: OrderDetailAddRequest) {
  return apiPost<OrderDetail>(`/order-details/order/${orderId}`, body)
}
export function getOrderDetail(id: number) {
  return apiGet<OrderDetail>(`/order-details/${id}`)
}
export function getOrderDetailsByOrder(orderId: number) {
  return apiGet<OrderDetail[]>(`/order-details/order/${orderId}`)
}
/** Nguồn dữ liệu chính cho KDS bếp và màn "Món đã gọi" của khách. */
export function getOrderDetailsBySession(tableSessionId: number, status?: OrderDetailStatus) {
  return apiGet<OrderDetail[]>(`/order-details/session/${tableSessionId}`, { params: { status } })
}
export function updateOrderDetail(id: number, body: OrderDetailUpdateRequest) {
  return apiPut<OrderDetail>(`/order-details/${id}`, body)
}
export function changeOrderDetailStatus(id: number, status: OrderDetailStatus) {
  return apiPut<OrderDetail>(`/order-details/${id}/status`, null, { params: { status } })
}
/** Bếp cân xong món bán theo cân → thoát trạng thái PENDING_WEIGHT. */
export function confirmWeight(id: number, body: OrderDetailConfirmWeightRequest) {
  return apiPost<OrderDetail>(`/order-details/${id}/confirm-weight`, body)
}
export function markServed(id: number) {
  return apiPost<OrderDetail>(`/order-details/${id}/mark-served`)
}
/** Huỷ khi món CHƯA vào bếp — không cần lý do. */
export function cancelBeforeKitchen(id: number) {
  return apiPost<OrderDetail>(`/order-details/${id}/cancel`)
}
/** Huỷ khi món ĐÃ vào bếp — bắt buộc có `cancelReason`, BE quyết định còn tính tiền hay không. */
export function cancelAfterKitchen(id: number, body: OrderDetailCancelRequest) {
  return apiPost<OrderDetail>(`/order-details/${id}/cancel-after-kitchen`, body)
}
export function deleteOrderDetail(id: number) {
  return apiDelete<void>(`/order-details/${id}`)
}

/**
 * KDS bếp cần dữ liệu gần thời gian thực. BE chưa có WebSocket nên dùng poll;
 * truyền `refetchInterval` (vd 5000) ở màn bếp, bỏ trống ở màn chỉ xem.
 */
export function useOrderDetailsBySession(
  tableSessionId?: number,
  status?: OrderDetailStatus,
  options?: { refetchInterval?: number; enabled?: boolean },
) {
  return useQuery({
    queryKey: qk.orderDetails.bySession(tableSessionId as number, status),
    queryFn: () => getOrderDetailsBySession(tableSessionId as number, status),
    enabled: typeof tableSessionId === "number" && (options?.enabled ?? true),
    refetchInterval: options?.refetchInterval,
  })
}

function invalidateDetailScope(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: qk.orderDetails.all })
  void qc.invalidateQueries({ queryKey: qk.orders.all })
}

export function useChangeOrderDetailStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; status: OrderDetailStatus }) => changeOrderDetailStatus(vars.id, vars.status),
    onSuccess: () => invalidateDetailScope(qc),
  })
}
export function useMarkServed() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: markServed, onSuccess: () => invalidateDetailScope(qc) })
}
export function useConfirmWeight() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: OrderDetailConfirmWeightRequest }) => confirmWeight(vars.id, vars.body),
    onSuccess: () => invalidateDetailScope(qc),
  })
}
export function useCancelBeforeKitchen() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: cancelBeforeKitchen, onSuccess: () => invalidateDetailScope(qc) })
}
export function useCancelAfterKitchen() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: OrderDetailCancelRequest }) => cancelAfterKitchen(vars.id, vars.body),
    onSuccess: () => invalidateDetailScope(qc),
  })
}
export function useAddOrderDetail() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { orderId: number; body: OrderDetailAddRequest }) => addOrderDetail(vars.orderId, vars.body),
    onSuccess: () => invalidateDetailScope(qc),
  })
}

/** FR-CUS-07: Khách bấm "Báo nhân viên" — gửi WS STAFF_CALL đến nhân viên chi nhánh */
export function staffCall(id: number) {
  return apiPost<void>(`/order-details/${id}/staff-call`)
}
export function useStaffCall() {
  return useMutation({ mutationFn: staffCall })
}
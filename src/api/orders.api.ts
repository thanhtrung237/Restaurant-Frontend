import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { Order } from "@/types/models"
import type { OrderStatus } from "@/types/enums"
import type { OrderAddRequest, OrderUpdateRequest } from "@/types/requests"

/** `POST /orders` — gửi 1 lượt gọi món. Body dùng `items`, mỗi item dùng `dishId`. */
export function createOrder(body: OrderAddRequest) {
  return apiPost<Order>("/orders", body)
}
export function getOrder(id: number) {
  return apiGet<Order>(`/orders/${id}`)
}
export function getOrdersBySession(tableSessionId: number, status?: OrderStatus) {
  return apiGet<Order[]>(`/orders/session/${tableSessionId}`, { params: { status } })
}
/** Danh sách order của chi nhánh — lọc `status=PENDING` để ra hàng chờ xác nhận. */
export function getOrdersByBranch(branchId: number, status?: OrderStatus) {
  return apiGet<Order[]>(`/orders/branch/${branchId}`, { params: { status } })
}
export function updateOrder(id: number, body: OrderUpdateRequest) {
  return apiPut<Order>(`/orders/${id}`, body)
}
/** Phục vụ xác nhận order → món được đẩy xuống bếp. */
export function confirmOrder(id: number) {
  return apiPost<Order>(`/orders/${id}/confirm`)
}
export function changeOrderStatus(id: number, status: OrderStatus) {
  return apiPut<Order>(`/orders/${id}/status`, null, { params: { status } })
}
export function cancelOrder(id: number) {
  return apiPost<Order>(`/orders/${id}/cancel`)
}
export function deleteOrder(id: number) {
  return apiDelete<void>(`/orders/${id}`)
}

export function useOrdersByBranch(
  branchId?: number,
  status?: OrderStatus,
  options?: { refetchInterval?: number },
) {
  return useQuery({
    queryKey: qk.orders.byBranch(branchId as number, status),
    queryFn: () => getOrdersByBranch(branchId as number, status),
    enabled: typeof branchId === "number",
    refetchInterval: options?.refetchInterval,
  })
}
export function useOrdersBySession(
  tableSessionId?: number,
  status?: OrderStatus,
  options?: { refetchInterval?: number },
) {
  return useQuery({
    queryKey: qk.orders.bySession(tableSessionId as number, status),
    queryFn: () => getOrdersBySession(tableSessionId as number, status),
    enabled: typeof tableSessionId === "number",
    refetchInterval: options?.refetchInterval,
  })
}
export function useOrder(id?: number) {
  return useQuery({
    queryKey: qk.orders.detail(id as number),
    queryFn: () => getOrder(id as number),
    enabled: typeof id === "number",
  })
}

/** Tạo/đổi order đều làm dòng món thay đổi theo → invalidate cả 2 nhánh. */
function invalidateOrderScope(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: qk.orders.all })
  void qc.invalidateQueries({ queryKey: qk.orderDetails.all })
}

export function useCreateOrder() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: createOrder, onSuccess: () => invalidateOrderScope(qc) })
}
export function useConfirmOrder() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: confirmOrder, onSuccess: () => invalidateOrderScope(qc) })
}
export function useCancelOrder() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: cancelOrder, onSuccess: () => invalidateOrderScope(qc) })
}

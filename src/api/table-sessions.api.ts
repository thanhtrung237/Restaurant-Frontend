import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut, retryUnlessStatus } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { TableSession } from "@/types/models"
import type {
  TableSessionCancelReservationRequest, TableSessionConfirmOpenRequest,
  TableSessionCreateRequest, TableSessionOpenRequest, TableSessionUpdateRequest,
} from "@/types/requests"

/**
 * `POST /table-sessions` — luồng chuẩn.
 * - Chỉ có `tableId` → mở phiên mới, trạng thái WAITING_FOR_OPEN (chờ Phục vụ xác nhận).
 * - Có thêm nhóm `reservation*` → đặt bàn trước, trạng thái RESERVED.
 */
export function createTableSession(body: TableSessionCreateRequest) {
  return apiPost<TableSession>("/table-sessions", body)
}
/** Phục vụ xác nhận mở bàn → phiên chuyển sang SERVING. */
export function confirmOpenSession(id: number, body: TableSessionConfirmOpenRequest) {
  return apiPost<TableSession>(`/table-sessions/${id}/confirm-open`, body)
}
export function cancelReservation(id: number, body?: TableSessionCancelReservationRequest) {
  return apiPost<TableSession>(`/table-sessions/${id}/cancel-reservation`, body ?? null)
}
/** Khách bấm "Yêu cầu tính tiền" → phiên chuyển sang WAITING_FOR_PAY. */
export function requestPayment(id: number) {
  return apiPost<TableSession>(`/table-sessions/${id}/request-payment`)
}
export function reopenSession(id: number) {
  return apiPost<TableSession>(`/table-sessions/${id}/reopen`)
}
/** Mở bàn thẳng tại quầy, bỏ qua bước chờ xác nhận (nhân viên thao tác, không phải khách quét QR). */
export function openSessionLegacy(body: TableSessionOpenRequest) {
  return apiPost<TableSession>("/table-sessions/legacy", body)
}
export function updateTableSession(id: number, body: TableSessionUpdateRequest) {
  return apiPut<TableSession>(`/table-sessions/${id}`, body)
}
export function getTableSession(id: number) {
  return apiGet<TableSession>(`/table-sessions/${id}`)
}
/** Phiên đang mở của 1 bàn — dùng khi khách quét QR vào bàn đã có người ngồi. */
export function getOpenSessionByTable(tableId: number) {
  return apiGet<TableSession>(`/table-sessions/table/${tableId}/open`)
}
/** Toàn bộ phiên đang mở của chi nhánh — nguồn dữ liệu cho Sơ đồ bàn. */
export function getOpenSessionsByBranch(branchId: number) {
  return apiGet<TableSession[]>(`/table-sessions/branch/${branchId}/open`)
}
export function getSessionsByTable(tableId: number) {
  return apiGet<TableSession[]>(`/table-sessions/table/${tableId}`)
}
export function closeSession(id: number) {
  return apiPost<TableSession>(`/table-sessions/${id}/close`)
}
/**
 * Huỷ phiên bàn. Bảng 2.2 của đặc tả: **bắt buộc có lý do**, backend ghi nhật ký.
 * Lý do lưu vào cột `note` của phiên.
 */
export function cancelSession(id: number, reason: string) {
  return apiPost<TableSession>(`/table-sessions/${id}/cancel`, { reason })
}
export function deleteSession(id: number) {
  return apiDelete<void>(`/table-sessions/${id}`)
}

/**
 * Poll trạng thái 1 phiên. Dùng ở màn "Chờ mở bàn" của khách — khách chờ Phục vụ
 * bấm xác nhận, nên cần `refetchInterval`.
 */
export function useTableSession(id?: number, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: qk.tableSessions.detail(id as number),
    queryFn: () => getTableSession(id as number),
    enabled: typeof id === "number",
    refetchInterval: options?.refetchInterval,
    // 404 = phiên không tồn tại (id sai, phiên đã bị xoá): câu trả lời cuối cùng. Màn hình
    // hiện "Không tìm thấy phiên bàn" ngay thay vì xoay thêm vài giây rồi mới hiện.
    retry: retryUnlessStatus([404]),
  })
}
export function useOpenSessionsByBranch(branchId?: number, options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: qk.tableSessions.openByBranch(branchId as number),
    queryFn: () => getOpenSessionsByBranch(branchId as number),
    enabled: typeof branchId === "number",
    refetchInterval: options?.refetchInterval,
  })
}

/** Sau khi đổi phiên thì Sơ đồ bàn và trạng thái bàn đều phải làm mới. */
function invalidateSessionScope(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: qk.tableSessions.all })
  void qc.invalidateQueries({ queryKey: qk.tables.all })
}

export function useCreateTableSession() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: createTableSession, onSuccess: () => invalidateSessionScope(qc) })
}
export function useConfirmOpenSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: TableSessionConfirmOpenRequest }) =>
      confirmOpenSession(vars.id, vars.body),
    onSuccess: () => invalidateSessionScope(qc),
  })
}
export function useRequestPayment() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: requestPayment, onSuccess: () => invalidateSessionScope(qc) })
}
export function useCloseSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: closeSession,
    onSuccess: () => {
      invalidateSessionScope(qc)
      void qc.invalidateQueries({ queryKey: qk.invoices.all })
    },
  })
}
export function useCancelSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; reason: string }) => cancelSession(vars.id, vars.reason),
    onSuccess: () => invalidateSessionScope(qc),
  })
}

export function useReopenSession() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: reopenSession, onSuccess: () => invalidateSessionScope(qc) })
}
export function useCancelReservation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body?: TableSessionCancelReservationRequest }) =>
      cancelReservation(vars.id, vars.body),
    onSuccess: () => invalidateSessionScope(qc),
  })
}

/** Khách bấm "Gọi nhân viên" — gửi WS STAFF_CALL đến nhân viên chi nhánh kèm số bàn */
export function callStaff(tableSessionId: number) {
  return apiPost<void>(`/table-sessions/${tableSessionId}/call-staff`)
}

export function useCallStaff() {
  return useMutation({ mutationFn: callStaff })
}


import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { DiningTable } from "@/types/models"
import type { DiningTableStatus } from "@/types/enums"
import type {
  DiningTableAddRequest, DiningTableReservationRequest, DiningTableUpdateRequest,
} from "@/types/requests"

export function getTable(id: number) {
  return apiGet<DiningTable>(`/tables/${id}`)
}
export function getTablesByBranch(branchId: number, status?: DiningTableStatus) {
  return apiGet<DiningTable[]>(`/tables/branch/${branchId}`, { params: { status } })
}
export function getTablesByArea(areaId: number) {
  return apiGet<DiningTable[]>(`/tables/area/${areaId}`)
}
/** Điểm vào của luồng khách quét QR: từ mã QR suy ra bàn. */
export function getTableByQrCode(branchId: number, qrCode: string) {
  return apiGet<DiningTable>(`/tables/branch/${branchId}/qr/${qrCode}`)
}
export function createTable(body: DiningTableAddRequest) {
  return apiPost<DiningTable>("/tables", body)
}
export function updateTable(id: number, body: DiningTableUpdateRequest) {
  return apiPut<DiningTable>(`/tables/${id}`, body)
}
export function changeTableStatus(id: number, status: DiningTableStatus) {
  return apiPut<DiningTable>(`/tables/${id}/status`, null, { params: { status } })
}
export function generateTableQrCode(id: number, frontendBaseUrl?: string) {
  return apiPost<string>(`/tables/${id}/generate-qr`, null, {
    params: { frontendBaseUrl: frontendBaseUrl ?? (typeof window !== "undefined" ? window.location.origin : undefined) },
  })
}
export function getTableQrUrl(id: number, frontendBaseUrl?: string) {
  return apiGet<string>(`/tables/${id}/qr-url`, {
    params: { frontendBaseUrl: frontendBaseUrl ?? (typeof window !== "undefined" ? window.location.origin : undefined) },
  })
}
/** Đặt bàn ở cấp BÀN. Lưu ý còn một luồng đặt trước khác qua `POST /table-sessions`. */
export function reserveTable(id: number, body: DiningTableReservationRequest) {
  return apiPost<DiningTable>(`/tables/${id}/reserve`, body)
}
export function cancelTableReservation(id: number) {
  return apiPut<DiningTable>(`/tables/${id}/cancel-reservation`)
}
export function deleteTable(id: number) {
  return apiDelete<void>(`/tables/${id}`)
}

export function useTablesByBranch(
  branchId?: number,
  status?: DiningTableStatus,
  options?: { refetchInterval?: number },
) {
  return useQuery({
    queryKey: qk.tables.byBranch(branchId as number, status),
    queryFn: () => getTablesByBranch(branchId as number, status),
    enabled: typeof branchId === "number",
    refetchInterval: options?.refetchInterval,
  })
}
export function useTableByQrCode(branchId?: number, qrCode?: string) {
  return useQuery({
    queryKey: qk.tables.byQrCode(branchId as number, qrCode as string),
    queryFn: () => getTableByQrCode(branchId as number, qrCode as string),
    enabled: typeof branchId === "number" && !!qrCode,
  })
}
export function useCreateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createTable,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.tables.all }),
  })
}
export function useUpdateTable() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: DiningTableUpdateRequest }) => updateTable(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.tables.all }),
  })
}
export function useGenerateTableQrCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; frontendBaseUrl?: string } | number) => {
      const id = typeof vars === "number" ? vars : vars.id
      const frontendBaseUrl = typeof vars === "number" ? undefined : vars.frontendBaseUrl
      return generateTableQrCode(id, frontendBaseUrl)
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.tables.all }),
  })
}

export function useTableQrUrl(id?: number, frontendBaseUrl?: string) {
  return useQuery({
    queryKey: ["tables", id, "qr-url"],
    queryFn: () => getTableQrUrl(id as number, frontendBaseUrl),
    enabled: typeof id === "number",
  })
}

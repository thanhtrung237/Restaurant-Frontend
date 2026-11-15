import { apiGet, apiPost } from "@/lib/http"
import type { TableSession } from "@/types/models"
import type { GuestLocation } from "../lib/geolocation"
export interface GuestTableInfo {
  tableId: number; branchId: number; tableName: string; branchName: string
  restaurantName: string; locationRequired: boolean; joinRequired: boolean
}
export interface GuestAccessRequest {
  branchId: number; qrCode: string; guestCount: number; joinCode?: string; location?: GuestLocation
}
export function getGuestTable(branchId: number, qrCode: string) {
  return apiGet<GuestTableInfo>("/guest/table", { params: { branchId, qrCode } })
}
export function enterGuestTable(body: GuestAccessRequest) {
  return apiPost<{ token: string; session: TableSession }>("/guest/access", body)
}

/**
 * Staff management types
 * Tương thích trực tiếp với AccountResponse & AssignmentResponse của backend
 */

export type StaffStatus = "ACTIVE" | "LOCKED"

export interface StaffMember {
  id: number
  fullName: string
  employeeCode: string
  username: string
  role: string
  branch: string
  status: StaffStatus
  lastLogin: string
  initials: string
  avatarBg?: string
  email?: string
  phone?: string
}

export type StaffStatusFilter = "ALL" | "ACTIVE" | "LOCKED"

export type StaffTabType = "staff" | "roles" | "audit-log"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Account } from "@/types/models"
import type { AppRole } from "@/config/roles"

interface AuthState {
  account: Account | null
  role: AppRole | null
  branchId: number | null // null nếu là Quản trị nhà hàng/nền tảng (không gắn 1 chi nhánh)
  accessToken: string | null
  assignmentId: number | null // ID Assignment hiện tại để biết đang dùng vai trò nào
  isAuthenticated: boolean
  setSession: (payload: {
    account: Account
    role: AppRole
    branchId: number | null
    accessToken: string
    assignmentId: number
  }) => void
  clearSession: () => void
}

/**
 * Store phiên đăng nhập của NHÂN VIÊN (Phục vụ/Thu ngân/Quản lý chi nhánh/Quản trị
 * nhà hàng/Quản trị nền tảng). Khách hàng dùng session.store riêng (token phiên bàn).
 *
 * Phase 5: bỏ mock data, chỉ khởi tạo null. Dữ liệu thật đến từ luồng đăng nhập
 * (`LoginPage` → `setSession()`). Dùng `persist` để giữ phiên khi F5 — trade-off
 * giữa UX và bảo mật (xem ghi chú trong `lib/auth-token.ts`).
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      account: null,
      role: null,
      branchId: null,
      accessToken: null,
      assignmentId: null,
      isAuthenticated: false,
      setSession: ({ account, role, branchId, accessToken, assignmentId }) => {
        console.log('Setting session with:', { account, role, branchId, accessToken, assignmentId })
        set({ account, role, branchId, accessToken, assignmentId, isAuthenticated: true })
      },
      clearSession: () =>
        set({
          account: null,
          role: null,
          branchId: null,
          accessToken: null,
          assignmentId: null,
          isAuthenticated: false,
        }),
    }),
    { name: "pho-viet-auth" },
  ),
)

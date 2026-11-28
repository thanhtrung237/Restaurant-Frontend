import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { Account } from "@/types/models"
import type { AppRole } from "@/config/roles"

interface SessionSelection {
  account: Account | null
  role: AppRole | null
  branchId: number | null // null nếu là Quản trị nhà hàng/nền tảng (không gắn 1 chi nhánh)
  assignmentId: number | null // ID Assignment hiện tại để biết đang dùng vai trò nào
}

interface AuthState extends SessionSelection {
  isAuthenticated: boolean
  setSession: (payload: {
    account: Account
    role: AppRole
    branchId: number | null
    assignmentId: number
  }) => void
  confirmSession: () => void
  clearSession: () => void
}

/**
 * Store phiên đăng nhập của NHÂN VIÊN (Phục vụ/Thu ngân/Quản lý chi nhánh/Quản trị
 * nhà hàng/Quản trị nền tảng). Khách hàng dùng session.store riêng (token phiên bàn).
 *
 * Chỉ lưu thông tin tài khoản và lựa chọn vai trò để khôi phục sau khi xác thực lại bằng cookie.
 */
export const AUTH_SELECTION_KEY = "pho-viet-auth"

function sessionSelection({ account, role, branchId, assignmentId }: SessionSelection) {
  return { account, role, branchId, assignmentId }
}

export const useAuthStore = create<AuthState>()(
  persist<AuthState, [], [], SessionSelection>(
    (set) => ({
      account: null,
      role: null,
      branchId: null,
      assignmentId: null,
      isAuthenticated: false,
      setSession: (selection) => set({ ...selection, isAuthenticated: true }),
      confirmSession: () => set({ isAuthenticated: true }),
      clearSession: () =>
        set({
          account: null,
          role: null,
          branchId: null,
          assignmentId: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: AUTH_SELECTION_KEY,
      version: 1,
      partialize: sessionSelection,
      migrate: (stored) => sessionSelection(stored as SessionSelection),
    },
  ),
)

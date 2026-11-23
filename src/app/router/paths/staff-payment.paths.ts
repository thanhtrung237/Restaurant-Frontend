import { APP_ROLE, type AppRole } from "@/config/roles"
import { BRANCH_MANAGER_PATHS } from "./branch-manager.paths"
import { CASHIER_PATHS } from "./cashier.paths"
import { RESTAURANT_ADMIN_PATHS } from "./restaurant-admin.paths"

type StaffPaymentPaths = Record<"CHECKOUT" | "QR_TRANSFER_PAYMENT" | "E_INVOICE" | "TABLE_MAP", string>

const paymentPathsByRole: Partial<Record<AppRole, StaffPaymentPaths>> = {
  [APP_ROLE.CASHIER]: CASHIER_PATHS,
  [APP_ROLE.BRANCH_MANAGER]: BRANCH_MANAGER_PATHS,
  [APP_ROLE.RESTAURANT_ADMIN]: RESTAURANT_ADMIN_PATHS,
}

export function getStaffPaymentPaths(role: AppRole | null) {
  return role ? paymentPathsByRole[role] : undefined
}

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"

export type PermissionLevel = "allow" | "readonly" | "approval" | "none"

export interface PermissionRow {
  id: string | number
  feature: string
  roles: {
    customer: PermissionLevel
    waiter: PermissionLevel
    cashier: PermissionLevel
    branchManager: PermissionLevel
    restaurantAdmin: PermissionLevel
    platformAdmin: PermissionLevel
  }
}

export interface PermissionMatrixProps {
  data?: PermissionRow[]
  className?: string
}

export const DEFAULT_PERMISSION_MATRIX_DATA: PermissionRow[] = [
  {
    id: 1,
    feature: "Xem sơ đồ bàn",
    roles: {
      customer: "none",
      waiter: "allow",
      cashier: "readonly",
      branchManager: "allow",
      restaurantAdmin: "allow",
      platformAdmin: "none",
    },
  },
  {
    id: 2,
    feature: "Mở / đóng phiên bàn",
    roles: {
      customer: "none",
      waiter: "allow",
      cashier: "none",
      branchManager: "allow",
      restaurantAdmin: "allow",
      platformAdmin: "none",
    },
  },
  {
    id: 3,
    feature: "Chuyển / gộp bàn",
    roles: {
      customer: "none",
      waiter: "approval",
      cashier: "none",
      branchManager: "allow",
      restaurantAdmin: "allow",
      platformAdmin: "none",
    },
  },
  {
    id: 4,
    feature: "Thu tiền, đóng bàn",
    roles: {
      customer: "none",
      waiter: "none",
      cashier: "allow",
      branchManager: "allow",
      restaurantAdmin: "allow",
      platformAdmin: "none",
    },
  },
  {
    id: 5,
    feature: "Chiết khấu tay",
    roles: {
      customer: "none",
      waiter: "none",
      cashier: "approval",
      branchManager: "allow",
      restaurantAdmin: "allow",
      platformAdmin: "none",
    },
  },
  {
    id: 6,
    feature: "Quản lý menu & khuyến mãi",
    roles: {
      customer: "none",
      waiter: "none",
      cashier: "none",
      branchManager: "none",
      restaurantAdmin: "allow",
      platformAdmin: "none",
    },
  },
  {
    id: 7,
    feature: "Quản lý nhân viên & cấu hình",
    roles: {
      customer: "none",
      waiter: "none",
      cashier: "none",
      branchManager: "none",
      restaurantAdmin: "allow",
      platformAdmin: "none",
    },
  },
  {
    id: 8,
    feature: "Xem báo cáo",
    roles: {
      customer: "none",
      waiter: "none",
      cashier: "none",
      branchManager: "readonly",
      restaurantAdmin: "allow",
      platformAdmin: "none",
    },
  },
  {
    id: 9,
    feature: "Xem nhật ký hoạt động",
    roles: {
      customer: "none",
      waiter: "none",
      cashier: "none",
      branchManager: "allow",
      restaurantAdmin: "allow",
      platformAdmin: "none",
    },
  },
  {
    id: 10,
    feature: "Quản lý nhà hàng (nền tảng)",
    roles: {
      customer: "none",
      waiter: "none",
      cashier: "none",
      branchManager: "none",
      restaurantAdmin: "none",
      platformAdmin: "allow",
    },
  },
]

function PermissionBadge({ level }: { level: PermissionLevel }) {
  switch (level) {
    case "allow":
      return (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-status-success-subtle text-status-success shadow-2xs">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )
    case "readonly":
      return (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-surface-muted text-xs font-bold text-text-tertiary">
          R
        </span>
      )
    case "approval":
      return (
        <span className="inline-flex size-6 items-center justify-center rounded-full bg-status-warning-subtle text-xs font-bold text-status-warning">
          A
        </span>
      )
    case "none":
    default:
      return <span className="text-text-tertiary text-sm font-light select-none">—</span>
  }
}

/**
 * PermissionMatrix — khớp component "Permission Matrix" trong UI Component (Figma):
 * Bảng phân quyền chi tiết cho tất cả các vai trò trong hệ thống (Khách, Phục vụ, Thu ngân,
 * QL chi nhánh, QT nhà hàng, QT nền tảng).
 */
export function PermissionMatrix({
  data = DEFAULT_PERMISSION_MATRIX_DATA,
  className,
}: PermissionMatrixProps) {
  return (
    <div
      className={cn(
        "overflow-x-auto rounded-card border border-border-default bg-surface-card",
        className,
      )}
    >
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-border-default bg-surface-page/50 text-xs font-bold uppercase tracking-wider text-text-tertiary">
            <th className="py-4 pl-6 pr-4">CHỨC NĂNG</th>
            <th className="px-4 py-4 text-center font-semibold text-text-secondary">Khách</th>
            <th className="px-4 py-4 text-center font-semibold text-text-secondary">Phục vụ</th>
            <th className="px-4 py-4 text-center font-semibold text-text-secondary">Thu ngân</th>
            <th className="px-4 py-4 text-center font-semibold text-text-secondary">
              QL chi nhánh
            </th>
            <th className="px-4 py-4 text-center font-semibold text-text-secondary">QT nhà hàng</th>
            <th className="py-4 pl-4 pr-6 text-center font-semibold text-text-secondary">
              QT nền tảng
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-default">
          {data.map((row) => (
            <tr key={row.id} className="transition-colors hover:bg-surface-page/40">
              <td className="py-3.5 pl-6 pr-4 font-bold text-text-primary">{row.feature}</td>
              <td className="px-4 py-3.5 text-center">
                <PermissionBadge level={row.roles.customer} />
              </td>
              <td className="px-4 py-3.5 text-center">
                <PermissionBadge level={row.roles.waiter} />
              </td>
              <td className="px-4 py-3.5 text-center">
                <PermissionBadge level={row.roles.cashier} />
              </td>
              <td className="px-4 py-3.5 text-center">
                <PermissionBadge level={row.roles.branchManager} />
              </td>
              <td className="px-4 py-3.5 text-center">
                <PermissionBadge level={row.roles.restaurantAdmin} />
              </td>
              <td className="py-3.5 pl-4 pr-6 text-center">
                <PermissionBadge level={row.roles.platformAdmin} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

import { Badge, type BadgeProps } from "@/components/ui/badge"
import {
  DINING_TABLE_STATUS_LABEL,
  ORDER_DETAIL_STATUS_LABEL,
  TABLE_SESSION_STATUS_LABEL,
  INVOICE_STATUS_LABEL,
  BRANCH_STATUS_LABEL,
  type DiningTableStatus,
  type OrderDetailStatus,
  type TableSessionStatus,
  type InvoiceStatus,
  type BranchStatus,
} from "@/types/enums"

/**
 * StatusBadge — dùng ở ≥2 role (VD: Phục vụ dùng cho trạng thái bàn/phiếu bếp,
 * Thu ngân dùng cho trạng thái hóa đơn, Quản lý chi nhánh dùng cho phiên bàn
 * trong báo cáo, Quản trị nhà hàng dùng cho trạng thái chi nhánh). Cùng 1 component,
 * chỉ khác `status` truyền vào — không tạo StatusBadge riêng cho từng loại enum.
 *
 * Màu sắc map đúng 4 màu status của Design System (success/warning/info/danger)
 * + "reserved" (xám, trung tính) — không tự chế thêm màu khác ngoài bảng màu.
 *
 * Cách dùng:
 *   <StatusBadge type="diningTable" status={table.status} />
 *   <StatusBadge type="invoice" status={invoice.status} />
 *   <StatusBadge type="branch" status={branch.status} />
 */
type StatusBadgeProps =
  | { type: "diningTable"; status: DiningTableStatus }
  | { type: "orderDetail"; status: OrderDetailStatus }
  | { type: "tableSession"; status: TableSessionStatus }
  | { type: "invoice"; status: InvoiceStatus }
  | { type: "branch"; status: BranchStatus }

const DINING_TABLE_VARIANT: Record<DiningTableStatus, BadgeProps["variant"]> = {
  INACTIVE: "reserved",
  AVAILABLE: "success",
  OCCUPIED: "warning",
  RESERVED: "info",
}

const ORDER_DETAIL_VARIANT: Record<OrderDetailStatus, BadgeProps["variant"]> = {
  PENDING: "info",
  PREPARING: "warning",
  SERVED: "success",
  CANCELLED: "danger",
  PENDING_WEIGHT: "info",
}

const TABLE_SESSION_VARIANT: Record<TableSessionStatus, BadgeProps["variant"]> = {
  WAITING_FOR_OPEN: "info",
  SERVING: "warning",
  WAITING_FOR_PAY: "warning",
  CLOSED: "reserved",
  CANCELLED: "danger",
  RESERVED: "info",
  MERGED: "reserved",
}

const INVOICE_VARIANT: Record<InvoiceStatus, BadgeProps["variant"]> = {
  PENDING: "warning",
  PAID: "success",
  // Đã phát hành hoá đơn điện tử — trạng thái cuối, bất biến (BR-09).
  ISSUED: "success",
  CANCELLED: "danger",
  REFUNDED: "info",
}

const BRANCH_VARIANT: Record<BranchStatus, BadgeProps["variant"]> = {
  ACTIVE: "success",
  INACTIVE: "reserved",
}

export function StatusBadge(props: StatusBadgeProps) {
  switch (props.type) {
    case "diningTable":
      return (
        <Badge dot variant={DINING_TABLE_VARIANT[props.status]}>
          {DINING_TABLE_STATUS_LABEL[props.status]}
        </Badge>
      )
    case "orderDetail":
      return (
        <Badge dot variant={ORDER_DETAIL_VARIANT[props.status]}>
          {ORDER_DETAIL_STATUS_LABEL[props.status]}
        </Badge>
      )
    case "tableSession":
      return (
        <Badge dot variant={TABLE_SESSION_VARIANT[props.status]}>
          {TABLE_SESSION_STATUS_LABEL[props.status]}
        </Badge>
      )
    case "invoice":
      return (
        <Badge dot variant={INVOICE_VARIANT[props.status]}>
          {INVOICE_STATUS_LABEL[props.status]}
        </Badge>
      )
    case "branch":
      return (
        <Badge dot variant={BRANCH_VARIANT[props.status]}>
          {BRANCH_STATUS_LABEL[props.status]}
        </Badge>
      )
  }
}

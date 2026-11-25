import { CheckCircle2, Clock, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { PageHeader } from "@/components/layout/PageHeader"
import { useAuthStore } from "@/stores/auth.store"
import { useOrdersByBranch, useConfirmOrder, useCancelOrder } from "@/features/shared/floor-ops/api"
import { ORDER_DETAIL_STATUS_LABEL } from "@/types/enums"
import type { Order } from "@/types/models"

/**
 * Xác nhận order — Phục vụ xác nhận các order chờ (status = PENDING) để món được đẩy xuống bếp.
 * Nguồn: Desktop / Xác nhận order
 *
 * API: GET /orders/branch/{branchId}?status=PENDING (poll 5s)
 *      POST /orders/{id}/confirm
 *      POST /orders/{id}/cancel
 */
export default function OrderConfirmPage() {
  const { toast } = useToast()
  const branchId = useAuthStore((s) => s.branchId)

  // Fetch pending orders với auto-refresh 1 giây
  const { data: orders = [], isLoading } = useOrdersByBranch(branchId ?? undefined, "PENDING", {
    refetchInterval: 1000,
  })

  const confirmMutation = useConfirmOrder()
  const cancelMutation = useCancelOrder()

  async function handleConfirm(order: Order) {
    try {
      await confirmMutation.mutateAsync(order.id)
      toast({
        title: "Xác nhận thành công",
        description: `Order bàn đã được gửi xuống bếp.`,
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Lỗi xác nhận",
        description: error instanceof Error ? error.message : "Không thể xác nhận order.",
        variant: "danger",
      })
    }
  }

  async function handleCancel(order: Order) {
    try {
      await cancelMutation.mutateAsync(order.id)
      toast({
        title: "Đã hủy order",
        description: `Order bàn đã bị hủy.`,
      })
    } catch (error) {
      toast({
        title: "Lỗi hủy order",
        description: error instanceof Error ? error.message : "Không thể hủy order.",
        variant: "danger",
      })
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page">
      {/* Màn con — cặp nút Hủy/Xác nhận nằm trong TỪNG thẻ order nên không gom được
          vào một thanh thao tác chung. */}
      <PageHeader
        title="Xác nhận order"
        subtitle={isLoading ? "Đang tải..." : `${orders.length} order đang chờ xác nhận`}
        actions={
          <Badge variant="outline" className="gap-1.5">
            <Clock className="size-3.5" />
            Tự động làm mới 1s
          </Badge>
        }
      />

      <div className="flex flex-col gap-6 p-6 sm:p-8">
        {/* <md: giữ lại chỉ báo tự làm mới dưới dạng dòng chữ nhỏ, không chiếm header */}
        <p className="flex items-center gap-1.5 text-xs text-text-tertiary md:hidden">
          <Clock className="size-3.5" />
          Tự động làm mới 1s
        </p>

        {/* Order List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <p className="text-text-secondary">Đang tải...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 rounded-card border border-dashed border-border-strong bg-surface-card p-6">
            <CheckCircle2 className="size-12 text-status-success mb-3" />
            <p className="text-lg font-semibold text-text-primary">Không có order chờ xác nhận</p>
            <p className="mt-1 text-sm text-text-tertiary">Tất cả order hiện tại đã được xử lý</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                isConfirming={confirmMutation.isPending}
                isCancelling={cancelMutation.isPending}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

interface OrderCardProps {
  order: Order
  onConfirm: (order: Order) => void
  onCancel: (order: Order) => void
  isConfirming: boolean
  isCancelling: boolean
}

function OrderCard({ order, onConfirm, onCancel, isConfirming, isCancelling }: OrderCardProps) {
  const totalQuantity = order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0

  // Tính tổng tiền tạm (chưa có field totalAmount trong OrderResponse)
  const subtotal =
    order.items?.reduce((sum, item) => {
      const price = item.price ?? item.priceAtOrderTime * item.quantity
      return sum + price
    }, 0) ?? 0

  return (
    <div className="rounded-card border border-border-default bg-surface-card p-5 shadow-2xs space-y-4">
      {/* Header: Bàn + Thời gian */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-primary">Bàn #{order.tableSessionId}</h3>
          <p className="text-xs text-text-tertiary mt-0.5">
            {order.createdAt ? new Date(order.createdAt).toLocaleString("vi-VN") : ""}
          </p>
        </div>
        <Badge variant="warning" className="gap-1">
          <Clock className="size-3" />
          Chờ xác nhận
        </Badge>
      </div>

      {/* Người gọi */}
      {order.orderedByName && (
        <p className="text-sm text-text-secondary">
          Gọi bởi: <span className="font-medium text-text-primary">{order.orderedByName}</span>
        </p>
      )}

      {/* Ghi chú */}
      {order.note && (
        <p className="text-sm text-text-secondary italic bg-surface-muted p-2 rounded-lg">
          "{order.note}"
        </p>
      )}

      {/* Danh sách món */}
      <div className="space-y-2 border-t border-border-default pt-3">
        {order.items?.map((item, idx) => (
          <div key={idx} className="flex items-start justify-between text-sm">
            <div className="flex-1">
              <p className="font-medium text-text-primary">
                {item.quantity}x {item.dishName}
              </p>
              {item.options && item.options.length > 0 ? (
                <div className="mt-0.5 space-y-0.5">
                  {item.options.map((opt) => (
                    <p key={opt.id} className="text-xs text-text-tertiary">
                      + {opt.optionItemName}
                      {opt.priceSnapshot > 0
                        ? ` +${opt.priceSnapshot.toLocaleString("vi-VN")}đ`
                        : " (Miễn phí)"}
                    </p>
                  ))}
                </div>
              ) : null}
              {item.note && (
                <p className="text-xs text-text-tertiary italic mt-0.5">• {item.note}</p>
              )}
              <p className="text-xs text-text-secondary mt-0.5">
                {ORDER_DETAIL_STATUS_LABEL[item.status]}
              </p>
            </div>
            <p className="font-semibold text-text-primary whitespace-nowrap ml-3">
              {formatCurrency(item.priceAtOrderTime * item.quantity)}
            </p>
          </div>
        ))}
      </div>

      {/* Tổng cộng */}
      <div className="flex items-center justify-between border-t border-border-default pt-3">
        <p className="text-sm font-medium text-text-secondary">Tổng cộng ({totalQuantity} món)</p>
        <p className="text-lg font-bold text-text-primary">{formatCurrency(subtotal)}</p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <Button
          variant="outline"
          onClick={() => onCancel(order)}
          disabled={isCancelling || isConfirming}
          className="flex-1 h-10 rounded-button border-border-strong text-text-secondary hover:bg-surface-muted hover:text-text-primary gap-1.5"
        >
          <XCircle className="size-4" />
          Hủy
        </Button>
        <Button
          onClick={() => onConfirm(order)}
          disabled={isConfirming || isCancelling}
          className="flex-1 h-10 rounded-button bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover gap-1.5"
        >
          <CheckCircle2 className="size-4" />
          Xác nhận
        </Button>
      </div>
    </div>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(value)
}

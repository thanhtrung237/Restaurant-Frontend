import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useInvoiceBySession } from "@/api/invoices.api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { StatusBadge } from "@/components/common/StatusBadge"
import { APP_ROLE } from "@/config/roles"
import { useToast } from "@/hooks/use-toast"
import { apiPost, getErrorMessage } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import { useAuthStore } from "@/stores/auth.store"
import type { OrderDetail, TableSession } from "@/types/models"
import { groupInvoiceLines, type InvoiceLine } from "../e-invoice/invoice-lines"

const money = (amount: number) => `${amount.toLocaleString("vi-VN")}đ`

export function CheckoutLines({
  details,
  session,
  busy,
  onAdjusted,
}: {
  details: OrderDetail[]
  session: TableSession
  busy?: boolean
  onAdjusted?: () => void
}) {
  const role = useAuthStore((state) => state.role)
  const queryClient = useQueryClient()
  const { toast } = useToast()
  const { data: invoice, isSuccess } = useInvoiceBySession(session.id)
  const isManager = role === APP_ROLE.BRANCH_MANAGER || role === APP_ROLE.RESTAURANT_ADMIN
  const sharedQuote = invoice?.quoteShared ?? false
  const canAdjust =
    session.status === "WAITING_FOR_PAY" &&
    isSuccess &&
    (!sharedQuote || isManager) &&
    (invoice === null || (invoice?.status === "PENDING" && (invoice.totalPaid ?? 0) === 0))
  const [group, setGroup] = useState<InvoiceLine | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [reason, setReason] = useState("")
  const removal = useMutation({
    mutationKey: qk.orderDetails.checkoutRemoval,
    mutationFn: (id: number) =>
      apiPost(`/order-details/session/${session.id}/remove/${id}`, { reason: reason.trim() }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: qk.orderDetails.all }),
        queryClient.invalidateQueries({ queryKey: qk.invoices.all }),
        queryClient.invalidateQueries({ queryKey: qk.tableSessions.billPreview(session.id) }),
      ])
      setGroup(null)
      onAdjusted?.()
      toast({
        title: "Đã bỏ món tính nhầm",
        description: "Nếu đã in tạm tính, hãy dùng bản in mới.",
        variant: "success",
      })
    },
    onError: (error) =>
      toast({ title: "Chưa thể bỏ món", description: getErrorMessage(error), variant: "danger" }),
  })
  const canRemove = (detail: OrderDetail) =>
    detail.status === "PENDING" ||
    detail.status === "PENDING_WEIGHT" ||
    (isManager && (detail.status === "PREPARING" || detail.status === "SERVED"))
  const rows = groupInvoiceLines(details)
  const removed = details.filter((detail) => detail.status === "CANCELLED" && !detail.isBillable)

  return (
    <div className="mt-6 divide-y divide-border-default rounded-card border border-border-default bg-surface-card">
      {rows.length === 0 && (
        <p className="p-6 text-center text-sm text-text-secondary">Chưa có món tính tiền</p>
      )}
      {rows.map((line) => (
        <div key={line.id} className="flex items-start gap-3 px-4 py-3">
          <span className="rounded-full bg-surface-muted px-2 py-1 text-xs font-bold">
            {line.weightKg != null
              ? `${line.weightKg.toLocaleString("vi-VN")} kg`
              : `×${line.quantity}`}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold">{line.name}</p>
            {!!line.options?.length && (
              <p className="text-xs text-text-secondary">
                {line.options.map((option) => option.optionItemName).join(" · ")}
              </p>
            )}
            <div className="mt-1 flex flex-wrap gap-1">
              {[...new Set(line.details.map((detail) => detail.status))].map((status) => (
                <StatusBadge key={status} type="orderDetail" status={status} />
              ))}
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-bold">{money(line.lineTotal)}</p>
            {canAdjust && line.details.some(canRemove) && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto px-0 py-1"
                disabled={busy || removal.isPending}
                onClick={() => {
                  setGroup(line)
                  setReason("")
                  setSelected(line.details.length === 1 ? line.id : null)
                }}
              >
                Bỏ món tính nhầm
              </Button>
            )}
          </div>
        </div>
      ))}
      {removed.length > 0 && (
        <details className="px-4 py-3 text-sm text-text-secondary">
          <summary className="cursor-pointer">
            Món đã bỏ khỏi tạm tính ({removed.length} dòng)
          </summary>
          <ul className="mt-2 space-y-1">
            {removed.map((detail) => (
              <li key={detail.id}>
                {detail.quantity} × {detail.dishName}
              </li>
            ))}
          </ul>
        </details>
      )}
      {canAdjust &&
        role === APP_ROLE.CASHIER &&
        details.some((detail) => detail.status === "PREPARING" || detail.status === "SERVED") && (
          <p className="px-4 py-3 text-xs text-text-secondary">
            Nhờ quản lý bỏ món đã vào bếp nếu khách báo tính nhầm.
          </p>
        )}
      <Dialog
        open={group !== null}
        onOpenChange={(open) => {
          if (!open && !removal.isPending) setGroup(null)
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Bỏ món tính nhầm</DialogTitle>
            <DialogDescription>
              {group?.name} · Chọn dòng gọi nhầm để bỏ khỏi tiền phải thu.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[45dvh] space-y-2 overflow-y-auto">
            {group?.details.filter(canRemove).map((detail) => (
              <label
                key={detail.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border border-border-default px-3 py-2 text-sm"
              >
                <input
                  type="radio"
                  name="checkout-detail"
                  checked={selected === detail.id}
                  onChange={() => setSelected(detail.id)}
                />
                <span className="flex-1">
                  {detail.weightKg != null
                    ? `${detail.weightKg.toLocaleString("vi-VN")} kg`
                    : `${detail.quantity} phần`}
                  {" · "}
                  {money(detail.price ?? 0)}
                  {detail.createdAt && (
                    <span className="block text-xs text-text-secondary">
                      {new Date(detail.createdAt).toLocaleString("vi-VN")}
                    </span>
                  )}
                  {detail.note && (
                    <span className="block text-xs text-text-secondary">{detail.note}</span>
                  )}
                </span>
                <StatusBadge type="orderDetail" status={detail.status} />
              </label>
            ))}
          </div>
          {sharedQuote && (
            <label className="space-y-1 text-sm">
              <span>Lý do bỏ món</span>
              <input
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                maxLength={500}
                className="w-full rounded-lg border border-border-default px-3 py-2"
              />
            </label>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={removal.isPending}
              onClick={() => setGroup(null)}
            >
              Quay lại
            </Button>
            <Button
              type="button"
              disabled={
                !canAdjust ||
                selected == null ||
                removal.isPending ||
                (sharedQuote && !reason.trim())
              }
              onClick={() => {
                if (selected != null) removal.mutate(selected)
              }}
            >
              Xác nhận bỏ món
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

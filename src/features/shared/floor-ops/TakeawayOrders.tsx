import { useState } from "react"
import { generatePath, Link, useNavigate } from "react-router-dom"
import { Plus, ShoppingBag, Utensils } from "lucide-react"
import {
  useHandoffTakeaway,
  useTakeawayOrders,
  type TakeawayOrder,
} from "@/api/takeaway-orders.api"
import { requestPayment } from "@/api/table-sessions.api"
import { useOrderDetailsBySession } from "@/api/order-details.api"
import { getStaffPaymentPaths } from "@/app/router/paths/staff-payment.paths"
import {
  takeawayAddItemsPath,
  takeawayCreatePath,
  takeawayListPath,
} from "@/app/router/paths/takeaway.paths"
import { Button, buttonVariants } from "@/components/ui/button"
import { SearchInput } from "@/components/common/SearchInput"
import { PageHeader } from "@/components/layout/PageHeader"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/auth.store"
import { cn } from "@/lib/utils"

const steps = {
  PENDING: ["Chờ xác nhận", "bg-blue-50 text-blue-800"],
  PREPARING: ["Đang chế biến", "bg-amber-50 text-amber-900"],
  READY: ["Sẵn sàng giao", "bg-green-50 text-green-800"],
  EMPTY: ["Món đã hủy", "bg-surface-muted text-text-secondary"],
} as const

export function ServiceModeLinks({
  path,
  mode,
  count,
}: {
  path: string
  mode: "table" | "takeaway"
  count?: number
}) {
  const modeClass = (active: boolean) =>
    cn(
      buttonVariants({ variant: "ghost" }),
      "px-3 text-base sm:px-5",
      active ? "bg-slate-800 text-white hover:bg-slate-700 hover:text-white" : "text-text-primary",
    )

  return (
    <nav
      aria-label="Hình thức phục vụ"
      className="flex flex-wrap items-center gap-2 px-4 pt-4 sm:px-8"
    >
      <div className="inline-flex gap-1 rounded-xl border border-border-default bg-surface-card p-1 shadow-xs">
        <Link
          to={path}
          aria-current={mode === "table" ? "page" : undefined}
          className={modeClass(mode === "table")}
        >
          <Utensils aria-hidden="true" /> Tại bàn
        </Link>
        <Link
          to={takeawayListPath(path)}
          aria-current={mode === "takeaway" ? "page" : undefined}
          className={modeClass(mode === "takeaway")}
        >
          <ShoppingBag aria-hidden="true" /> Mang về
          {count ? (
            <span
              className={cn(
                "rounded-full px-2 text-xs tabular-nums",
                mode === "takeaway" ? "bg-white/20 text-white" : "bg-orange-100 text-orange-900",
              )}
            >
              {count}
            </span>
          ) : null}
        </Link>
      </div>
      <Link
        to={takeawayCreatePath(path)}
        className={cn(buttonVariants({ size: "sm" }), "ml-auto md:hidden")}
      >
        + Đơn mang về
      </Link>
    </nav>
  )
}

export function TakeawayOrders({
  branchId,
  tableMapPath,
}: {
  branchId: number
  tableMapPath: string
}) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const role = useAuthStore((state) => state.role)
  const list = useTakeawayOrders(branchId)
  const handoff = useHandoffTakeaway(branchId)
  const [paying, setPaying] = useState<number | null>(null)
  const [search, setSearch] = useState("")
  const paymentPaths = getStaffPaymentPaths(role)
  const orders = list.data ?? []
  const query = search.trim().toLocaleLowerCase("vi-VN")
  const visibleOrders = orders.filter((order) =>
    `${order.label} ${order.customerName ?? ""}`.toLocaleLowerCase("vi-VN").includes(query),
  )

  async function pay(order: TakeawayOrder) {
    if (!paymentPaths || paying != null) return
    setPaying(order.id)
    try {
      if (order.sessionStatus === "SERVING") {
        await requestPayment(order.id)
        void list.refetch()
      }
      navigate(generatePath(paymentPaths.CHECKOUT, { tableSessionId: String(order.id) }))
    } catch (error) {
      toast({
        title: "Chưa thể mở thanh toán",
        description: error instanceof Error ? error.message : "Hãy thử lại.",
        variant: "danger",
      })
      void list.refetch()
    } finally {
      setPaying(null)
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      <PageHeader
        title="Đơn mang về"
        subtitle={`${orders.length} đơn tại quầy`}
        actions={
          <Link to={takeawayCreatePath(tableMapPath)} className={buttonVariants()}>
            <ShoppingBag aria-hidden="true" /> Đơn mang về mới
          </Link>
        }
      />
      <ServiceModeLinks path={tableMapPath} mode="takeaway" count={orders.length} />
      <div className="space-y-4 p-4 sm:p-8">
        {orders.length > 0 && (
          <SearchInput
            aria-label="Tìm đơn mang về"
            placeholder="Tìm mã đơn hoặc tên khách…"
            className="max-w-80 border-border-default bg-surface-card"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
          />
        )}
        {list.isPending ? (
          <p role="status">Đang tải đơn mang về…</p>
        ) : list.isError ? (
          <div role="alert" className="space-y-2">
            <p>Không tải được đơn mang về.</p>
            <Button type="button" variant="outline" onClick={() => void list.refetch()}>
              Thử lại
            </Button>
          </div>
        ) : visibleOrders.length === 0 ? (
          <p className="rounded-card border border-border-default bg-surface-card p-6 text-center text-text-secondary">
            {query ? "Không tìm thấy đơn mang về phù hợp." : "Chưa có đơn mang về đang xử lý."}
          </p>
        ) : (
          <ul className="grid gap-3 xl:grid-cols-3 sm:grid-cols-2">
            {visibleOrders.map((order) => (
              <li
                key={order.id}
                className="flex flex-col gap-3 rounded-card border border-border-default bg-surface-card p-4"
              >
                <div>
                  <h2 className="font-bold">{order.label}</h2>
                  <p className="text-sm text-text-secondary">
                    {[order.customerName, `${order.portions} phần`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <span className={cn("rounded-full px-2 py-1", steps[order.kitchenStatus][1])}>
                    {steps[order.kitchenStatus][0]}
                  </span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-1",
                      order.paid
                        ? "bg-green-50 text-green-800"
                        : "bg-surface-muted text-text-secondary",
                    )}
                  >
                    {order.paid ? "Đã thanh toán" : "Chưa thanh toán"}
                  </span>
                </div>
                <TakeawayItems sessionId={order.id} />
                {order.paid && order.invoiceId != null && paymentPaths && (
                  <Link
                    to={generatePath(paymentPaths.E_INVOICE, {
                      invoiceId: String(order.invoiceId),
                    })}
                    className={buttonVariants({ variant: "ghost", size: "sm" })}
                  >
                    Xem hóa đơn
                  </Link>
                )}
                {!order.paid &&
                  order.sessionStatus === "WAITING_FOR_PAY" &&
                  order.invoiceId != null && (
                    <p className="text-sm text-text-secondary">
                      Đã lập hóa đơn. Tiếp tục thanh toán để hoàn tất đơn.
                    </p>
                  )}
                {!order.paid &&
                  order.sessionStatus === "WAITING_FOR_PAY" &&
                  order.invoiceId == null &&
                  order.canAddTakeawayItems == null && (
                    <p className="text-sm text-text-secondary">
                      Cần cập nhật máy chủ để thêm món vào đơn này.
                    </p>
                  )}
                {!order.paid && (
                  <div className="mt-auto flex flex-wrap gap-2 empty:hidden">
                    {(order.canAddTakeawayItems ?? order.sessionStatus === "SERVING") && (
                      <Link
                        to={takeawayAddItemsPath(tableMapPath, order.id)}
                        className={cn(buttonVariants(), "min-w-32 flex-1")}
                      >
                        <Plus aria-hidden="true" /> Thêm món
                      </Link>
                    )}
                    {paymentPaths && order.kitchenStatus !== "EMPTY" && (
                      <Button
                        type="button"
                        variant="outline"
                        className="min-w-32 flex-1"
                        disabled={paying != null}
                        onClick={() => void pay(order)}
                      >
                        Thanh toán
                      </Button>
                    )}
                  </div>
                )}
                {order.paid && order.kitchenStatus === "READY" && (
                  <Button
                    type="button"
                    disabled={handoff.isPending}
                    onClick={() =>
                      handoff.mutate(order.id, {
                        onSuccess: () =>
                          toast({ title: `Đã giao ${order.label}`, variant: "success" }),
                        onError: (error) =>
                          toast({
                            title: "Chưa thể giao đơn",
                            description: error.message,
                            variant: "danger",
                          }),
                      })
                    }
                  >
                    Đã giao khách
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function TakeawayItems({ sessionId }: { sessionId: number }) {
  const [open, setOpen] = useState(false)
  const details = useOrderDetailsBySession(open ? sessionId : undefined)
  return (
    <details onToggle={(event) => setOpen(event.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-semibold text-text-secondary">
        Xem món
      </summary>
      {open &&
        (details.isPending ? (
          <p className="mt-2 text-sm text-text-secondary">Đang tải món…</p>
        ) : details.isError ? (
          <Button type="button" size="sm" variant="link" onClick={() => void details.refetch()}>
            Tải lại món
          </Button>
        ) : (
          <ul className="mt-2 space-y-1 text-sm">
            {details.data
              ?.filter((item) => item.status !== "CANCELLED")
              .map((item) => (
                <li key={item.id}>
                  <span className="font-semibold">
                    {item.quantity}× {item.dishName}
                  </span>
                  {item.options?.length ? (
                    <p className="text-xs text-text-secondary">
                      {item.options.map((option) => option.optionItemName).join(" · ")}
                    </p>
                  ) : null}
                  {item.note ? <p className="text-xs text-text-secondary">{item.note}</p> : null}
                </li>
              ))}
          </ul>
        ))}
    </details>
  )
}

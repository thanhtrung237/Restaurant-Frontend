import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { useQueryClient } from "@tanstack/react-query"
import { ChevronLeft, Search, ShoppingCart, Trash2, Utensils } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { QuantityStepper } from "@/components/common/QuantityStepper"
import { StickyActionBar } from "@/components/layout/StickyActionBar"
import { useToast } from "@/hooks/use-toast"
import { PageHeader } from "@/components/layout/PageHeader"
import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE } from "@/config/roles"
import { WAITER_PATHS, BRANCH_MANAGER_PATHS, RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import { ROLE_HOME } from "@/app/router/RoleHomeRedirect"
import { useGoBack } from "@/hooks/use-go-back"
import { cn } from "@/lib/utils"
import { getDishOptionGroupsByDish } from "@/api/dish-option-groups.api"
import { takeawayOrdersKey, useCreateTakeaway } from "@/api/takeaway-orders.api"
import { takeawayListPath } from "@/app/router/paths/takeaway.paths"
import { qk } from "@/lib/query-keys"
import { useTableSession, useBranchMenu, useCreateOrder } from "@/features/shared/floor-ops/api"
import type { BranchMenuItem, DishOptionGroup, OptionItem } from "@/types/models"
import type { OrderDetailAddRequest } from "@/types/requests"
import { DishOptionPicker, getUnitPrice } from "./DishOptionPicker"

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`

const ALL_CATEGORY_ID = "all"
const MAX_LINE_QUANTITY = 999

interface SelectedLine {
  id: number
  dish: BranchMenuItem
  options: OptionItem[]
  configurable: boolean
  quantity: number
  note: string
  isTakeAway?: boolean
}

/**
 * Thêm món vào bàn — dùng chung Phục vụ / QL chi nhánh / Quản trị NH
 * Nguồn: nút "+ Thêm món vào bàn" ở màn Order chi tiết (@/features/shared/floor-ops/order-detail)
 *
 * API:
 *  - GET /table-sessions/{id}       → lấy branchId + tên bàn để load đúng menu chi nhánh
 *  - GET /branches/{branchId}/menu  → danh sách món (đã resolve giá đè + trạng thái còn/hết)
 *  - POST /orders                   → tạo 1 lượt gọi món mới { tableSessionId, items[], orderedById }
 *    (giống hệt cơ chế "Lượt 1, Lượt 2..." mà khách tự gọi qua QR — chỉ khác `orderedById`
 *    được set = tài khoản nhân viên đang thao tác)
 *
 */
export default function AddDishPage({ takeaway = false }: { takeaway?: boolean }) {
  const { orderId } = useParams<{ orderId: string }>() // Thực chất là tableSessionId
  const activeBranch = useAuthStore((state) => state.branchId)
  return (
    <AddDishForm
      key={takeaway ? `takeaway-${activeBranch}-${orderId ?? "new"}` : orderId}
      orderId={orderId}
      takeaway={takeaway}
    />
  )
}

function AddDishForm({ orderId, takeaway }: { orderId?: string; takeaway: boolean }) {
  const { toast } = useToast()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const account = useAuthStore((s) => s.account)
  const activeBranch = useAuthStore((s) => s.branchId)

  const parsedId = Number(orderId)
  const tableSessionId = Number.isSafeInteger(parsedId) && parsedId > 0 ? parsedId : undefined
  const creatingTakeaway = takeaway && orderId === undefined
  const addingToTakeaway = takeaway && !creatingTakeaway

  const role = useAuthStore((s) => s.role)
  /**
   * Nút "Quay lại" ở đây nói rõ "Về Order chi tiết", nên fallback cũng phải là Order chi tiết
   * của ĐÚNG vai trò (màn này dùng chung cho Phục vụ / QL chi nhánh / Quản trị NH). Thiếu
   * `:orderId` (không xảy ra khi đi đúng route) thì lùi về Sơ đồ bàn của vai trò.
   */
  const orderDetailPath =
    role === APP_ROLE.BRANCH_MANAGER
      ? BRANCH_MANAGER_PATHS.ORDER_DETAIL
      : role === APP_ROLE.RESTAURANT_ADMIN
        ? RESTAURANT_ADMIN_PATHS.ORDER_DETAIL
        : WAITER_PATHS.ORDER_DETAIL
  const tableMapPath = role ? ROLE_HOME[role] : WAITER_PATHS.TABLE_MAP
  const takeawayPath = takeawayListPath(tableMapPath)
  const goBack = useGoBack(
    orderId
      ? generatePath(orderDetailPath, { orderId })
      : role
        ? ROLE_HOME[role]
        : WAITER_PATHS.TABLE_MAP,
  )

  const sessionQuery = useTableSession(tableSessionId)
  const session = sessionQuery.data
  const editableTakeaway =
    session?.takeaway &&
    session.branchId === activeBranch &&
    (session.canAddTakeawayItems ?? session.status === "SERVING")
  const branchId = creatingTakeaway
    ? (activeBranch ?? undefined)
    : addingToTakeaway && !editableTakeaway
      ? undefined
      : session?.branchId
  const showPackingOption = !takeaway && !session?.takeaway

  const { data: menuItems = [], isLoading: menuLoading, error: menuError } = useBranchMenu(branchId)

  const createOrderMutation = useCreateOrder()
  const createTakeaway = useCreateTakeaway()
  const [customerName, setCustomerName] = React.useState("")
  const submittingRef = React.useRef(false)

  const [searchText, setSearchText] = React.useState("")
  const [activeCategoryId, setActiveCategoryId] = React.useState<string>(ALL_CATEGORY_ID)
  const [selected, setSelected] = React.useState<SelectedLine[]>([])
  const [picker, setPicker] = React.useState<{
    dish: BranchMenuItem
    groups: DishOptionGroup[]
    line?: SelectedLine
  } | null>(null)
  const [loadingDishId, setLoadingDishId] = React.useState<number>()
  const loadingOptions = React.useRef(false)
  const triggerRef = React.useRef<HTMLButtonElement>(null)
  const searchRef = React.useRef<HTMLInputElement>(null)
  const nextId = React.useRef(0)

  // Chỉ hiển thị món chưa bị ẩn ở chi nhánh này
  const visibleItems = React.useMemo(() => menuItems.filter((item) => !item.isHidden), [menuItems])

  // Tab danh mục suy ra trực tiếp từ dữ liệu món thật, giống MenuPage của khách
  const categoryTabs = React.useMemo(() => {
    const seen = new Map<number, string>()
    visibleItems.forEach((item) => {
      if (!seen.has(item.categoryId)) {
        seen.set(item.categoryId, item.categoryName || `Danh mục ${item.categoryId}`)
      }
    })
    return [
      { id: ALL_CATEGORY_ID, label: "Tất cả" },
      ...Array.from(seen.entries()).map(([id, label]) => ({ id: String(id), label })),
    ]
  }, [visibleItems])

  const filteredItems = React.useMemo(() => {
    let filtered = visibleItems

    if (activeCategoryId !== ALL_CATEGORY_ID) {
      filtered = filtered.filter((d) => String(d.categoryId) === activeCategoryId)
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim()
      filtered = filtered.filter(
        (d) => d.dishName.toLowerCase().includes(q) || d.description?.toLowerCase().includes(q),
      )
    }

    return filtered
  }, [visibleItems, activeCategoryId, searchText])

  function addDish(dish: BranchMenuItem, options: OptionItem[], configurable = false) {
    const id = nextId.current++
    setSelected((prev) => {
      const existing = prev.find(
        (line) =>
          line.dish.dishId === dish.dishId &&
          !line.note &&
          !line.isTakeAway &&
          line.quantity < MAX_LINE_QUANTITY &&
          line.options.length === options.length &&
          line.options.every((item) => options.some((option) => item.id === option.id)),
      )
      return existing
        ? prev.map((line) =>
            line.id === existing.id
              ? { ...line, dish, options, configurable, quantity: line.quantity + 1 }
              : line,
          )
        : [...prev, { id, dish, options, configurable, quantity: 1, note: "" }]
    })
  }

  async function chooseDish(dish: BranchMenuItem, trigger: HTMLButtonElement, line?: SelectedLine) {
    if (loadingOptions.current || submittingRef.current) return
    loadingOptions.current = true
    setLoadingDishId(dish.dishId)
    try {
      const groups = await queryClient.fetchQuery({
        queryKey: qk.dishOptionGroups.byDish(dish.dishId),
        queryFn: () => getDishOptionGroupsByDish(dish.dishId),
        staleTime: 0,
        retry: false,
      })
      if (!groups.length && !line) {
        addDish(dish, [])
      } else {
        triggerRef.current = trigger
        setPicker({ dish, groups, line })
      }
    } catch {
      toast({
        title: "Không tải được tùy chọn món",
        description: "Hãy bấm lại vào món để thử lại.",
        variant: "danger",
      })
    } finally {
      loadingOptions.current = false
      setLoadingDishId(undefined)
      if (!triggerRef.current && trigger.isConnected) trigger.focus()
    }
  }

  function updateLine(
    id: number,
    update: Partial<
      Pick<SelectedLine, "note" | "quantity" | "options" | "configurable" | "isTakeAway">
    >,
  ) {
    setSelected((prev) => prev.map((line) => (line.id === id ? { ...line, ...update } : line)))
  }

  const totalQuantity = selected.reduce((sum, line) => sum + line.quantity, 0)
  const totalAmount = selected.reduce(
    (sum, line) =>
      line.dish.soldByWeight ? sum : sum + getUnitPrice(line.dish, line.options) * line.quantity,
    0,
  )
  const hasWeightedDish = selected.some((line) => line.dish.soldByWeight)
  const sending = createOrderMutation.isPending || createTakeaway.isPending
  const busy = loadingDishId !== undefined || sending

  async function handleConfirm() {
    if (!selected.length || busy || submittingRef.current || !branchId) return

    const items: OrderDetailAddRequest[] = selected.map((line) => ({
      dishId: line.dish.dishId,
      quantity: line.quantity,
      note: line.note.trim() || undefined,
      optionItemIds: line.options.length ? line.options.map((option) => option.id) : undefined,
      isTakeAway: line.isTakeAway || undefined,
    }))

    submittingRef.current = true
    try {
      if (creatingTakeaway) {
        const order = await createTakeaway.mutateAsync({
          branchId,
          customerName: customerName.trim() || undefined,
          items,
        })
        toast({ title: `Đã gửi bếp · ${order.label}`, variant: "success" })
        navigate(takeawayPath, { replace: true })
        return
      }
      if (!tableSessionId) return
      await createOrderMutation.mutateAsync({
        tableSessionId,
        items,
        orderedById: account?.id,
      })
      if (addingToTakeaway) {
        void queryClient.invalidateQueries({ queryKey: takeawayOrdersKey(branchId) })
        toast({ title: `Đã gửi thêm món · Mang về #${tableSessionId}`, variant: "success" })
        navigate(takeawayPath, { replace: true })
        return
      }
      toast({
        title: "Đã thêm món vào bàn",
        description: hasWeightedDish
          ? `${totalQuantity} món · Có món chờ cân`
          : `${totalQuantity} món · ${formatVnd(totalAmount)}`,
        variant: "success",
      })
      goBack()
    } catch (error) {
      if (addingToTakeaway) void sessionQuery.refetch()
      toast({
        title: "Không thể thêm món",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "danger",
      })
    } finally {
      submittingRef.current = false
    }
  }

  const tableName = session?.tableName || `Bàn #${tableSessionId}`
  const title = creatingTakeaway
    ? "Tạo đơn mang về"
    : addingToTakeaway
      ? tableSessionId
        ? `Thêm món · Mang về #${tableSessionId}`
        : "Thêm món mang về"
      : `Thêm món vào bàn — ${tableName}`
  const submitLabel = sending
    ? "Đang gửi…"
    : creatingTakeaway
      ? "Gửi bếp"
      : addingToTakeaway
        ? "Gửi thêm món"
        : "Xác nhận thêm món"

  const header = (
    <PageHeader
      title={title}
      mobileSubtitle=""
      actions={
        <button
          type="button"
          onClick={takeaway ? () => navigate(takeawayPath) : goBack}
          className="inline-flex items-center gap-1 text-sm font-medium text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
        >
          <ChevronLeft className="size-4" /> {takeaway ? "Về đơn mang về" : "Về đơn món"}
        </button>
      }
    />
  )

  if (addingToTakeaway && !editableTakeaway) {
    return (
      <div className="flex flex-1 flex-col min-h-screen bg-surface-page">
        {header}
        <div className="space-y-3 p-6 sm:p-8">
          {tableSessionId != null && sessionQuery.isPending ? (
            <p role="status">Đang tải đơn mang về…</p>
          ) : sessionQuery.isError && !session ? (
            <>
              <p role="alert">Không tải được đơn mang về.</p>
              <Button variant="outline" onClick={() => void sessionQuery.refetch()}>
                Thử lại
              </Button>
            </>
          ) : session?.takeaway &&
            session.status === "WAITING_FOR_PAY" &&
            session.canAddTakeawayItems == null ? (
            <p role="alert">
              Máy chủ đang chạy phiên bản cũ. Hãy khởi động lại backend để thêm món cho đơn đang chờ
              thanh toán.
            </p>
          ) : (
            <p role="alert">Đơn mang về đã lập hóa đơn hoặc không còn mở để thêm món.</p>
          )}
          <Button variant="ghost" className="md:hidden" onClick={() => navigate(takeawayPath)}>
            Về đơn mang về
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page">
      {header}
      <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8 lg:flex-row items-start">
        {/* ============================================================
            2. CỘT TRÁI: DANH SÁCH MÓN (menu chi nhánh)
            ============================================================ */}
        <div className="flex-1 w-full rounded-2xl border border-border-default/60 bg-surface-card p-6 shadow-xs">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
            <Input
              ref={searchRef}
              aria-label="Tìm món trong thực đơn"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm món trong thực đơn..."
              className="pl-10"
            />
          </div>

          <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categoryTabs.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategoryId(c.id)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-sm transition-all whitespace-nowrap",
                  c.id === activeCategoryId
                    ? "bg-brand-primary font-bold text-white"
                    : "border border-border-default bg-surface-card font-medium text-text-secondary hover:border-border-strong",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {menuLoading ? (
              <p className="py-8 text-center text-text-tertiary">Đang tải thực đơn...</p>
            ) : menuError ? (
              <p className="py-8 text-center text-status-danger">
                Không thể tải thực đơn. Vui lòng thử lại.
              </p>
            ) : filteredItems.length === 0 ? (
              <p className="py-8 text-center text-text-tertiary">Không tìm thấy món phù hợp.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((dish) => {
                  const outOfStock = dish.stockStatus === "OUT_OF_STOCK"
                  const inCart = selected.reduce(
                    (sum, line) => (line.dish.dishId === dish.dishId ? sum + line.quantity : sum),
                    0,
                  )
                  return (
                    <button
                      key={dish.dishId}
                      type="button"
                      disabled={outOfStock || createOrderMutation.isPending}
                      aria-busy={loadingDishId === dish.dishId || undefined}
                      onClick={(event) => void chooseDish(dish, event.currentTarget)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer",
                        outOfStock
                          ? "cursor-not-allowed border-border-default/60 bg-surface-muted/50 opacity-60"
                          : inCart
                            ? "border-brand-primary bg-brand-primary-subtle"
                            : "border-border-default bg-surface-card hover:border-border-strong",
                      )}
                    >
                      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted text-xl">
                        {dish.imageUrl ? (
                          <img
                            src={dish.imageUrl}
                            alt={dish.dishName}
                            className="size-full object-cover"
                          />
                        ) : (
                          <Utensils aria-hidden="true" className="size-5 text-text-tertiary" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-text-primary">
                          {dish.dishName}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-brand-primary">
                          {formatVnd(dish.effectivePrice)}
                          {dish.soldByWeight ? " / kg" : ""}
                        </p>
                        {outOfStock ? (
                          <p className="mt-0.5 text-xs font-medium text-status-danger">Hết hàng</p>
                        ) : loadingDishId === dish.dishId ? (
                          <p className="mt-0.5 text-xs text-text-secondary">Đang tải tùy chọn…</p>
                        ) : inCart > 0 ? (
                          <p className="mt-0.5 text-xs font-medium text-brand-primary">
                            Đã chọn x{inCart}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================
            3. CỘT PHẢI: GIỎ TẠM + XÁC NHẬN
            ============================================================ */}
        <div className="w-full shrink-0 lg:w-[380px]">
          <div className="sticky top-6 flex flex-col rounded-2xl border border-border-default/60 bg-surface-card p-6 shadow-xs">
            <p className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <ShoppingCart className="size-4" />
              Món sẽ thêm ({totalQuantity})
            </p>
            {creatingTakeaway && (
              <label className="mt-4 block space-y-1.5 text-sm font-medium">
                Tên khách <span className="text-text-secondary">(tùy chọn)</span>
                <Input
                  value={customerName}
                  disabled={busy}
                  maxLength={100}
                  onChange={(event) => setCustomerName(event.target.value)}
                  placeholder="Tên để gọi khi đơn sẵn sàng"
                />
              </label>
            )}

            {selected.length === 0 ? (
              <p className="mt-6 text-center text-sm text-text-tertiary">
                Chọn món từ danh sách bên trái để thêm vào bàn.
              </p>
            ) : (
              <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {selected.map((line) => (
                  <div key={line.id} className="rounded-lg border border-border-default/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-text-primary">
                        {line.dish.dishName}
                      </p>
                      <button
                        type="button"
                        onClick={() =>
                          setSelected((prev) => prev.filter((item) => item.id !== line.id))
                        }
                        disabled={busy}
                        aria-label="Bỏ món"
                        className="shrink-0 text-text-tertiary hover:text-status-danger transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    {line.configurable ? (
                      <div className="mt-1 flex flex-wrap items-baseline gap-x-2 text-xs text-text-secondary">
                        {line.options.length ? (
                          <p className="min-w-0 break-words">
                            {line.options.map((option) => option.name).join(" · ")}
                          </p>
                        ) : null}
                        <Button
                          type="button"
                          variant="link"
                          size="sm"
                          className="h-auto p-0"
                          disabled={busy}
                          onClick={(event) => void chooseDish(line.dish, event.currentTarget, line)}
                        >
                          Sửa tùy chọn
                        </Button>
                      </div>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <QuantityStepper
                        value={line.quantity}
                        onChange={(quantity) => updateLine(line.id, { quantity })}
                        inputLabel={`Số lượng ${line.dish.dishName}`}
                        max={MAX_LINE_QUANTITY}
                        disabled={busy}
                        variant="simple"
                      />
                      <span className="text-sm font-bold text-text-primary">
                        {line.dish.soldByWeight
                          ? `${formatVnd(getUnitPrice(line.dish, line.options))}/kg · Chờ cân`
                          : formatVnd(getUnitPrice(line.dish, line.options) * line.quantity)}
                      </span>
                    </div>
                    <input
                      value={line.note}
                      onChange={(e) => updateLine(line.id, { note: e.target.value })}
                      disabled={sending}
                      placeholder="Ghi chú (vd: ít cay)..."
                      className="mt-2 w-full rounded-md border border-border-default bg-surface-page px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-primary"
                    />
                    {showPackingOption && (
                      <label className="mt-2 inline-flex items-center gap-2 text-xs font-medium text-text-secondary">
                        <input
                          type="checkbox"
                          className="size-4 accent-brand-primary"
                          checked={Boolean(line.isTakeAway)}
                          disabled={busy}
                          onChange={(event) =>
                            updateLine(line.id, { isTakeAway: event.target.checked })
                          }
                        />
                        Đóng gói mang về
                      </label>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Ẩn ở <md: tổng tiền + nút xác nhận đã nằm ở thanh thao tác cố định */}
            <div className="mt-5 hidden items-center justify-between border-t border-border-default/60 pt-4 md:flex">
              <span className="text-sm font-bold text-text-secondary">
                {hasWeightedDish ? "Tạm tính · chưa gồm món cân" : "Tổng cộng"}
              </span>
              <span className="text-xl font-bold text-text-primary">{formatVnd(totalAmount)}</span>
            </div>

            <Button
              className="mt-4 hidden h-12 w-full text-base font-bold md:inline-flex"
              disabled={!selected.length || busy}
              onClick={handleConfirm}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>

      {/* <md: giữ NGUYÊN tổng tiền cạnh nút xác nhận — bỏ tổng tiền thì nhân viên gửi
          order mà không thấy số tiền sẽ cộng vào bàn. */}
      <StickyActionBar>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-medium leading-tight text-text-tertiary">
            {hasWeightedDish ? "Tạm tính · chưa gồm món cân" : `Tổng cộng · ${totalQuantity} món`}
          </p>
          <p className="truncate text-base font-bold leading-tight text-text-primary">
            {formatVnd(totalAmount)}
          </p>
        </div>
        <Button
          className="h-11 shrink-0 px-5 font-bold"
          disabled={!selected.length || busy}
          onClick={handleConfirm}
        >
          {submitLabel}
        </Button>
      </StickyActionBar>
      {picker ? (
        <DishOptionPicker
          dish={picker.dish}
          groups={picker.groups}
          initialOptions={picker.line?.options ?? []}
          editing={Boolean(picker.line)}
          onSave={(options) => {
            if (picker.line)
              updateLine(picker.line.id, { options, configurable: picker.groups.length > 0 })
            else addDish(picker.dish, options, true)
            setPicker(null)
          }}
          onClose={() => setPicker(null)}
          onRestoreFocus={() => {
            const trigger = triggerRef.current
            if (trigger?.isConnected && !trigger.disabled) trigger.focus()
            else searchRef.current?.focus()
            triggerRef.current = null
          }}
        />
      ) : null}
    </div>
  )
}

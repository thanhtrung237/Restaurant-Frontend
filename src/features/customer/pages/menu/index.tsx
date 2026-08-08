import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { Search, Bell, ClipboardList } from "lucide-react"
import { MenuItemCard } from "@/components/common/MenuItemCard"
import { useToast } from "@/hooks/use-toast"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useBranchMenu, useTableSession, useOrderDetailsBySession } from "@/features/customer/api"
import {
  useCustomerSessionStore,
  syncCustomerSessionWithBackend,
} from "@/features/customer/store/session.store"
import {
  useCustomerCartStore,
  selectCartTotalQuantity,
  selectCartSubtotal,
} from "@/features/customer/store/cart.store"
import type { BranchMenuItem } from "@/types/models"
import { cn } from "@/lib/utils"

/** Tab ảo "Phổ biến" — không tương ứng categoryId thật nào, chỉ gom hiển thị tất cả món. */
const POPULAR_CATEGORY_ID = "popular"
// Khi khách vào xem trước thực đơn lúc bàn còn WAITING_FOR_OPEN, poll lại
// trạng thái phiên mỗi 3s để biết ngay lúc nhân viên xác nhận mở bàn — không
// bắt khách phải thoát ra vào lại mới được gọi món.
const SESSION_POLL_INTERVAL_MS = 1000

interface CategoryTab {
  id: string
  label: string
}

/**
 * Bỏ tiền tố hành chính ("Nhà hàng ", "Chi nhánh ") để hiển thị gọn trong header mobile,
 * vd: "Nhà hàng Phở Việt" + "Chi nhánh Quận 1" -> "Phở Việt · Quận 1".
 */
function stripKnownPrefix(text: string, prefixes: string[]): string {
  for (const prefix of prefixes) {
    if (text.toLowerCase().startsWith(prefix.toLowerCase())) {
      return text.slice(prefix.length).trim()
    }
  }
  return text
}

/**
 * Thực đơn — Fetch menu thực tế từ API
 * Nguồn: Mobile / Thực đơn
 *
 * API: GET /branches/{branchId}/menu → trả THẲNG `BranchMenuItem[]` (không bọc object
 * { restaurantName, branchName, dishes } như bản mock cũ). Mỗi phần tử đã được BE resolve
 * sẵn giá đè theo chi nhánh — luôn hiển thị `effectivePrice`, không tự cộng giá.
 * Tab danh mục được suy ra trực tiếp từ `categoryId`/`categoryName` của chính các món trả
 * về (không dùng danh mục mock cứng) để đảm bảo luôn khớp dữ liệu thật.
 * Filter theo category và search text ở frontend.
 * Món hết hàng hiển thị nhãn "Hết hàng", không cho thêm vào giỏ. Món bị ẩn ở chi nhánh
 * (`isHidden`) không hiển thị cho khách.
 */
export default function MenuPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  const { toast } = useToast()

  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const setSession = useCustomerSessionStore((s) => s.setSession)
  const qrCodeInStore = useCustomerSessionStore((s) => s.qrCode)
  const branchId = tableSession?.branchId
  const tableName = tableSession?.tableName || "Bàn"
  // Khách có thể vào xem trước thực đơn khi phiên còn WAITING_FOR_OPEN (xem
  // `waiting-table-open` → "Xem trước thực đơn"), nhưng CHỈ được xem — chưa
  // được thêm món vào giỏ cho tới khi nhân viên xác nhận mở bàn (SERVING).
  const isTableOpenConfirmed = tableSession?.status === "SERVING"

  // Poll lại phiên bàn trong lúc đang ở chế độ xem trước (chưa SERVING), để
  // khi nhân viên xác nhận mở bàn thì trang tự cập nhật ngay, không cần khách
  // thoát ra vào lại. Dừng poll ngay khi đã SERVING (đỡ tốn request).
  const { data: polledSession } = useTableSession(tableSession?.id, {
    refetchInterval: isTableOpenConfirmed ? undefined : SESSION_POLL_INTERVAL_MS,
  })

  React.useEffect(() => {
    if (!qrCode) return
    if (!tableSession || tableSession.status !== "SERVING") {
      syncCustomerSessionWithBackend(qrCode)
    }
  }, [qrCode, tableSession])

  React.useEffect(() => {
    if (!tableSession || isTableOpenConfirmed) return
    if (polledSession && polledSession.status === "SERVING") {
      setSession({
        qrCode: qrCodeInStore ?? qrCode ?? "",
        sessionToken: `session-${polledSession.id}`,
        tableSession: polledSession,
      })
      toast({
        title: "Bàn đã được mở",
        description: "Nhân viên đã xác nhận mở bàn — bạn có thể gọi món ngay bây giờ.",
        variant: "success",
      })
    }
  }, [polledSession, tableSession, isTableOpenConfirmed, qrCodeInStore, qrCode, setSession, toast])

  // Fetch menu từ API — trả thẳng mảng BranchMenuItem[]
  const { data: menuItems = [], isLoading, error } = useBranchMenu(branchId ?? 1)

  // Fetch món đã gọi để hiển thị số lượng trên nút "Món đã gọi"
  const { data: orderDetails = [] } = useOrderDetailsBySession(
    tableSession?.id,
    undefined,
    { enabled: Boolean(tableSession?.id), refetchInterval: 3000 }
  )

  const [activeCategoryId, setActiveCategoryId] = React.useState<string>(POPULAR_CATEGORY_ID)
  const [searchText] = React.useState("")

  // Chỉ hiển thị món chưa bị ẩn ở chi nhánh này
  const visibleItems = React.useMemo(
    () => menuItems.filter((item) => !item.isHidden),
    [menuItems]
  )

  // Tab danh mục suy ra từ chính dữ liệu món ăn thật (categoryId/categoryName), không mock
  const categoryTabs = React.useMemo<CategoryTab[]>(() => {
    const seen = new Map<number, string>()
    visibleItems.forEach((item) => {
      if (!seen.has(item.categoryId)) {
        seen.set(item.categoryId, item.categoryName || `Danh mục ${item.categoryId}`)
      }
    })
    return [
      { id: POPULAR_CATEGORY_ID, label: "Phổ biến" },
      ...Array.from(seen.entries()).map(([id, label]) => ({ id: String(id), label })),
    ]
  }, [visibleItems])

  const activeCategory = React.useMemo(
    () => categoryTabs.find((c) => c.id === activeCategoryId) ?? categoryTabs[0],
    [categoryTabs, activeCategoryId]
  )

  // Lọc dishes theo category và search text
  const dishes = React.useMemo(() => {
    let filtered = visibleItems

    // Filter theo category (nếu không phải "popular")
    if (activeCategoryId !== POPULAR_CATEGORY_ID) {
      filtered = filtered.filter((d) => d.categoryId === Number(activeCategoryId))
    }

    // Filter theo search text
    if (searchText.trim()) {
      const search = searchText.toLowerCase().trim()
      filtered = filtered.filter(
        (d) =>
          d.dishName.toLowerCase().includes(search) ||
          d.description?.toLowerCase().includes(search)
      )
    }

    return filtered
  }, [visibleItems, activeCategoryId, searchText])

  const cartItems = useCustomerCartStore((s) => s.items)
  const quickAdd = useCustomerCartStore((s) => s.quickAdd)
  const cartTotalQuantity = selectCartTotalQuantity(cartItems)
  const cartSubtotal = selectCartSubtotal(cartItems)

  function goToQrPath(path: string) {
    navigate(generatePath(path, { qrCode: qrCode ?? "" }))
  }

  function goToDishDetail(dishId: string) {
    navigate(generatePath(CUSTOMER_PATHS.DISH_DETAIL, { qrCode: qrCode ?? "", dishId }))
  }

  function handleQuickAdd(dish: BranchMenuItem) {
    // Chặn thêm giỏ nếu bàn chưa được nhân viên xác nhận mở — double-check ở
    // đây (không chỉ ẩn nút) đề phòng nơi khác lỡ gọi thẳng hàm này.
    if (!isTableOpenConfirmed) {
      toast({
        title: "Chưa thể đặt món",
        description: "Vui lòng chờ nhân viên xác nhận mở bàn trước khi gọi món.",
        variant: "warning",
      })
      return
    }
    quickAdd({
      dishId: String(dish.dishId),
      name: dish.dishName,
      imageUrl: dish.imageUrl || "",
      unitPrice: dish.effectivePrice,
    })
    toast({ title: "Đã thêm vào giỏ", description: dish.dishName, variant: "success" })
  }

  function handleCallStaff() {
    // TODO(api): POST /api/table-sessions/:id/call-staff khi có backend
    toast({
      title: "Đã gọi nhân viên",
      description: `${tableName} · Nhân viên sẽ đến hỗ trợ trong giây lát.`,
      variant: "info",
    })
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-page min-h-dvh">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
          <p className="text-sm text-text-secondary">Đang tải thực đơn...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-surface-page min-h-dvh px-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-status-danger-subtle">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-text-primary">
            Không thể tải thực đơn
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Vui lòng thử lại hoặc liên hệ nhân viên.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-lg bg-brand-primary px-6 py-2.5 text-sm font-semibold text-white"
          >
            Thử lại
          </button>
        </div>
      </div>
    )
  }

  // TODO(api): BE chưa trả tên nhà hàng/chi nhánh trong TableSession hay BranchMenuItem —
  // tạm thời hardcode như bản cũ, cần bổ sung khi có API GET /branches/{id} công khai cho khách.
  const restaurantName = "Nhà hàng Phở Việt"
  const branchName = "Chi nhánh chính"
  const shortRestaurantName = stripKnownPrefix(restaurantName, ["Nhà hàng "])
  const shortBranchName = stripKnownPrefix(branchName, ["Chi nhánh "])

  return (
    <div className="relative flex flex-1 flex-col bg-surface-page min-h-dvh w-full">
      {/* ---- Header cố định: thông tin bàn + tìm kiếm + danh mục ---- */}
      <div className="sticky top-0 z-10 bg-white pt-[max(0.75rem,env(safe-area-inset-top))] shadow-[0_1px_4px_rgba(0,0,0,0.02)] w-full">
        <div className="w-full max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-3 px-4 pb-2.5">
            <div className="min-w-0">
              <p className="truncate text-xs font-semibold tracking-wider text-text-tertiary uppercase">
                {tableName.toUpperCase()}
              </p>
              <h1 className="truncate text-lg sm:text-xl font-bold text-text-primary tracking-tight mt-0.5">
                {shortRestaurantName} · {shortBranchName}
              </h1>
            </div>
            <div className="shrink-0 flex items-center gap-2 pt-0.5">
              <button
                type="button"
                onClick={() => goToQrPath(CUSTOMER_PATHS.ORDERED_ITEMS)}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-default bg-white px-3 py-1.5 text-xs font-semibold text-text-primary shadow-2xs hover:border-brand-primary hover:text-brand-primary transition-all active:scale-95 cursor-pointer"
                title="Xem các món đã gọi"
              >
                <ClipboardList className="size-3.5 text-brand-primary" />
                <span>Món đã gọi</span>
                {orderDetails.length > 0 ? (
                  <span className="flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">
                    {orderDetails.length}
                  </span>
                ) : null}
              </button>

              {isTableOpenConfirmed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F7EF] px-2.5 py-1.5 text-xs font-bold text-[#12B76A]">
                  <span className="size-1.5 rounded-full bg-[#12B76A]" />
                  <span>Đang phục vụ</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF6EE] px-2.5 py-1.5 text-xs font-bold text-[#B54708]">
                  <span className="size-1.5 rounded-full bg-[#F79009]" />
                  <span>Chờ xác nhận mở bàn</span>
                </span>
              )}
            </div>
          </div>

          {!isTableOpenConfirmed ? (
            <div className="mx-4 mb-3 flex items-start gap-2 rounded-md bg-[#FEF6EE] px-3.5 py-2.5">
              <span className="mt-0.5 text-sm">ℹ️</span>
              <p className="text-xs leading-relaxed text-[#B54708]">
                Bạn đang xem trước thực đơn. Nhân viên chưa xác nhận mở bàn nên
                chưa thể thêm món vào giỏ hàng.
              </p>
            </div>
          ) : null}

          {/* Ô tìm kiếm dạng nút bấm */}
          <div className="px-4 pb-3">
            <button
              type="button"
              onClick={() => goToQrPath(CUSTOMER_PATHS.SEARCH_DISH)}
              className="flex h-11 w-full items-center gap-2.5 rounded-full bg-[#F1F3F5] px-4 text-left text-sm text-text-tertiary transition-colors hover:bg-border-default"
            >
              <Search className="size-4 shrink-0 text-text-tertiary" />
              <span>Tìm món trong thực đơn...</span>
            </button>
          </div>

          {/* Danh mục — cuộn ngang, ẩn thanh cuộn để gọn trên mobile */}
          <div className="flex gap-2.5 overflow-x-auto px-4 pb-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categoryTabs.map((category) => {
              const isSelected = category.id === activeCategoryId
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setActiveCategoryId(category.id)}
                  className={cn(
                    "h-[38px] shrink-0 rounded-[20px] px-5 text-sm transition-all whitespace-nowrap",
                    isSelected
                      ? "bg-brand-primary font-bold text-white shadow-xs"
                      : "border border-border-default bg-white font-medium text-text-secondary hover:border-border-strong hover:text-text-primary"
                  )}
                >
                  {category.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ---- Danh sách món — vùng cuộn riêng, tự động chia 2 cột trên tablet/desktop ---- */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-6">
          <p className="mb-3 text-xs font-bold tracking-wider text-text-tertiary uppercase">
            MÓN {activeCategory?.label.toUpperCase() ?? ""}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dishes.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm text-text-tertiary">
                  {searchText.trim()
                    ? "Không tìm thấy món phù hợp"
                    : "Không có món nào trong danh mục này"}
                </p>
              </div>
            ) : (
              dishes.map((dish) => {
                const outOfStock = dish.stockStatus === "OUT_OF_STOCK"
                const showOriginalPrice = dish.hasOverride && dish.effectivePrice < dish.basePrice
                const discountPercent = showOriginalPrice
                  ? Math.round(((dish.basePrice - dish.effectivePrice) / dish.basePrice) * 100)
                  : undefined

                return (
                  <MenuItemCard
                    key={dish.dishId}
                    name={dish.dishName}
                    description={dish.description || ""}
                    price={dish.effectivePrice}
                    originalPrice={showOriginalPrice ? dish.basePrice : undefined}
                    discountPercent={discountPercent}
                    imageUrl={dish.imageUrl || ""}
                    outOfStockLabel={outOfStock ? "Hết hàng" : undefined}
                    onClick={() => goToDishDetail(String(dish.dishId))}
                    onAdd={outOfStock ? undefined : () => handleQuickAdd(dish)}
                  />
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* ---- Nút nổi: Gọi nhân viên ---- */}
      <div className="sticky bottom-20 z-20 w-full pointer-events-none mb-2">
        <div className="w-full max-w-4xl mx-auto flex justify-end px-4">
          <button
            type="button"
            onClick={handleCallStaff}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-brand-primary bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-brand-primary shadow-[0_4px_16px_rgba(240,82,43,0.18)] transition-all hover:bg-brand-primary-subtle/50 active:scale-95"
          >
            <Bell className="size-4 text-brand-primary" />
            <span>Gọi nhân viên</span>
          </button>
        </div>
      </div>

      {/* ---- Thanh giỏ hàng cố định dưới cùng ---- */}
      {cartTotalQuantity > 0 ? (
        <div className="sticky bottom-0 z-30 w-full bg-white shadow-[0_-4px_16px_rgba(0,0,0,0.04)]">
          <div className="w-full max-w-4xl mx-auto px-4 pt-2.5 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <button
              type="button"
              onClick={() => goToQrPath(CUSTOMER_PATHS.CART)}
              className="flex h-[52px] sm:h-[56px] w-full items-center justify-between rounded-[16px] bg-brand-primary px-4 sm:px-6 text-white shadow-none transition-transform hover:bg-brand-primary-hover active:scale-[0.99]"
            >
              <div className="flex items-center gap-2.5">
                <span className="flex size-6.5 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-brand-primary">
                  {cartTotalQuantity}
                </span>
                <span className="text-base sm:text-lg font-bold text-white">Xem giỏ hàng</span>
              </div>
              <span className="text-base sm:text-lg font-bold text-white">
                {cartSubtotal.toLocaleString("vi-VN")}đ
              </span>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
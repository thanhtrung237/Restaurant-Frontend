import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { Search, Bell, ClipboardList, Lock, Gift, X, Clock, Tag, TrendingUp } from "lucide-react"
import { MenuItemCard } from "@/components/common/MenuItemCard"
import { useToast } from "@/hooks/use-toast"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useBranchMenu, useTableSession, useOrderDetailsBySession, useCallStaff } from "@/features/customer/api"
import { useBillLocked } from "@/features/customer/hooks/use-bill-locked"
import { TABLE_SESSION_STATUS_LABEL } from "@/types/enums"
import {
  useCustomerSessionStore,
  syncCustomerSessionWithBackend,
} from "@/features/customer/store/session.store"
import {
  useCustomerCartStore,
  selectCartTotalQuantity,
  selectCartSubtotalAfterPromotion,
} from "@/features/customer/store/cart.store"
import { useActivePromotionsByBranch } from "@/api/promotions.api"
import { findBestPromotionForItem, formatPromotionBadge } from "@/lib/promotion-display"
import { calculatePromoDiscount } from "@/features/cashier/components/PromotionSelectModal"
import type { BranchMenuItem, Promotion } from "@/types/models"
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
 * BR-05: món hết hàng tại chi nhánh KHÔNG hiển thị trên menu khách (backend đã lọc sẵn).
 * Món bị ẩn ở chi nhánh (`isHidden`) cũng không hiển thị cho khách.
 */
export default function MenuPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  const { toast } = useToast()

  // QD-09: phien da yeu cau tinh tien -> khoa goi them mon (nguon: trang thai phien o BE)
  const billLocked = useBillLocked()
  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const setSession = useCustomerSessionStore((s) => s.setSession)
  const qrCodeInStore = useCustomerSessionStore((s) => s.qrCode)
  const branchId = tableSession?.branchId
  const tableName = tableSession?.tableName || "Bàn"
  // Khách có thể vào xem trước thực đơn khi phiên còn WAITING_FOR_OPEN (xem
  // `waiting-table-open` → "Xem trước thực đơn"), nhưng CHỈ được xem — chưa
  // được thêm món vào giỏ cho tới khi nhân viên xác nhận mở bàn (SERVING).
  /**
   * Bàn ĐÃ mở hay chưa.
   *
   * `WAITING_FOR_PAY` cũng là bàn đã mở — chỉ là đã yêu cầu tính tiền. Trước đây chỉ xét
   * `SERVING` nên khách ở phiên chờ thanh toán thấy chip "Chờ mở bàn" và dòng "Nhân viên chưa
   * xác nhận mở bàn" — sai, và mâu thuẫn ngay với băng "Đã yêu cầu tính tiền" ở dưới.
   * Việc chặn gọi thêm món ở trạng thái đó do `billLocked` lo (QĐ-09).
   */
  const isTableOpenConfirmed =
    tableSession?.status === "SERVING" || tableSession?.status === "WAITING_FOR_PAY"

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

  // Lấy KM đang chạy tại chi nhánh (BE đã filter: active, đúng ngày/giờ/lượt)
  // Dùng `useActivePromotionsByBranch` thay vì batch-fetch riêng để FE & BE
  // dùng cùng 1 nguồn dữ liệu — tránh lệch giá giữa menu và lúc gửi order.
  const { data: activePromotions = [] } = useActivePromotionsByBranch(branchId)

  // Debug: Log promotions
  React.useEffect(() => {
    console.log("🎁 Active Promotions:", activePromotions)
    console.log("🎁 Branch ID:", branchId)
  }, [activePromotions, branchId])

  // KM cấp HÓA ĐƠN: hiển thị dải thông báo ở đầu menu thay vì gạch giá từng món
  const invoicePromos = React.useMemo(
    () => activePromotions.filter((p) => p.applyLevel === "INVOICE"),
    [activePromotions]
  )

  // Fetch món đã gọi để hiển thị số lượng trên nút "Món đã gọi"
  const { data: orderDetails = [] } = useOrderDetailsBySession(
    tableSession?.id,
    undefined,
    { enabled: Boolean(tableSession?.id), refetchInterval: 3000 }
  )

  const [activeCategoryId, setActiveCategoryId] = React.useState<string>(POPULAR_CATEGORY_ID)
  const [searchInput, setSearchInput] = React.useState("") // User đang gõ
  const [searchText, setSearchText] = React.useState("") // Text thật sự dùng để filter
  const searchInputRef = React.useRef<HTMLInputElement>(null)
  const [showPromotionsModal, setShowPromotionsModal] = React.useState(false)

  // Handle Enter key or button click to search
  function handleSearchSubmit(e?: React.FormEvent) {
    e?.preventDefault()
    setSearchText(searchInput.trim())
  }

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

    // Filter theo search text TRƯỚC
    if (searchText.trim()) {
      const search = searchText.toLowerCase().trim()
      filtered = filtered.filter(
        (d) =>
          d.dishName.toLowerCase().includes(search) ||
          d.description?.toLowerCase().includes(search)
      )
      // Khi đang search, bỏ qua filter category để hiển thị tất cả kết quả
      return filtered
    }

    // Filter theo category (nếu không phải "popular" và không đang search)
    if (activeCategoryId !== POPULAR_CATEGORY_ID) {
      filtered = filtered.filter((d) => d.categoryId === Number(activeCategoryId))
    }

    return filtered
  }, [visibleItems, activeCategoryId, searchText])

  // Clear search khi nhấn ESC
  React.useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && (searchInput || searchText)) {
        setSearchInput("")
        setSearchText("")
        searchInputRef.current?.blur()
      }
    }
    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [searchInput, searchText])

  const cartItems = useCustomerCartStore((s) => s.items)
  const quickAdd = useCustomerCartStore((s) => s.quickAdd)
  const cartTotalQuantity = selectCartTotalQuantity(cartItems)
  const cartSubtotal = selectCartSubtotalAfterPromotion(cartItems)

  function goToQrPath(path: string) {
    navigate(generatePath(path, { qrCode: qrCode ?? "" }))
  }

  function goToDishDetail(dishId: string) {
    navigate(generatePath(CUSTOMER_PATHS.DISH_DETAIL, { qrCode: qrCode ?? "", dishId }))
  }

  function handleQuickAdd(dish: BranchMenuItem) {
    // QĐ-09: phiên đã yêu cầu tính tiền thì không gọi thêm món được.
    if (billLocked) {
      toast({
        title: "Đã yêu cầu tính tiền",
        description: "Không thể gọi thêm món. Cần gọi thêm, vui lòng báo nhân viên.",
        variant: "warning",
      })
      return
    }
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

    // Check for active promotion
    const promotionMatch = findBestPromotionForItem(dish, activePromotions)

    quickAdd({
      dishId: String(dish.dishId),
      name: dish.dishName,
      imageUrl: dish.imageUrl || "",
      unitPrice: dish.effectivePrice,
      promotionId: promotionMatch?.promotion.id,
      promotionName: promotionMatch?.promotion.name,
      promotionDiscountAmount: promotionMatch?.discountAmount,
    })
    toast({ title: "Đã thêm vào giỏ", description: dish.dishName, variant: "success" })
  }

  const callStaffMutation = useCallStaff()

  function handleCallStaff() {
    if (!tableSession?.id) return
    callStaffMutation.mutate(tableSession.id, {
      onSuccess: () => {
        toast({
          title: "Đã gọi nhân viên",
          description: `${tableName} · Nhân viên sẽ đến hỗ trợ trong giây lát.`,
          variant: "success",
        })
      },
      onError: (err) => {
        toast({
          title: "Lỗi gọi nhân viên",
          description: err instanceof Error ? err.message : "Không thể gọi nhân viên lúc này. Vui lòng thử lại.",
          variant: "danger",
        })
      },
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
              {/* Nút Khuyến mãi */}
              {activePromotions.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowPromotionsModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#F79009] bg-[#FEF6EE] px-3 py-1.5 text-xs font-semibold text-[#B54708] shadow-2xs hover:bg-[#FEF0C7] transition-all active:scale-95 cursor-pointer"
                  title="Xem khuyến mãi"
                >
                  <Gift className="size-3.5" />
                  <span>Khuyến mãi</span>
                  <span className="flex min-w-4 h-4 px-1 items-center justify-center rounded-full bg-[#F79009] text-[10px] font-bold text-white">
                    {activePromotions.length}
                  </span>
                </button>
              )}

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

              {billLocked ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF6EE] px-2.5 py-1.5 text-xs font-bold text-[#B54708]">
                  <span className="size-1.5 rounded-full bg-[#F79009]" />
                  <span>{TABLE_SESSION_STATUS_LABEL.WAITING_FOR_PAY}</span>
                </span>
              ) : isTableOpenConfirmed ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#E6F7EF] px-2.5 py-1.5 text-xs font-bold text-[#12B76A]">
                  <span className="size-1.5 rounded-full bg-[#12B76A]" />
                  <span>Đang phục vụ</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[#FEF6EE] px-2.5 py-1.5 text-xs font-bold text-[#B54708]">
                  <span className="size-1.5 rounded-full bg-[#F79009]" />
                  <span>{TABLE_SESSION_STATUS_LABEL.WAITING_FOR_OPEN}</span>
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

          {/* Ô tìm kiếm - Debounced search với nút submit */}
          <div className="px-4 pb-3">
            <form onSubmit={handleSearchSubmit} className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-text-tertiary pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Tìm món trong thực đơn..."
                className="flex h-11 w-full items-center rounded-full bg-[#F1F3F5] pl-11 pr-24 text-sm text-text-primary placeholder:text-text-tertiary transition-colors focus:bg-white focus:outline-none focus:ring-2 focus:ring-brand-primary/20"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchInput("")
                    setSearchText("")
                    searchInputRef.current?.focus()
                  }}
                  className="absolute right-[68px] top-1/2 -translate-y-1/2 flex size-6 items-center justify-center rounded-full bg-text-tertiary/10 text-text-tertiary hover:bg-text-tertiary/20 transition-colors"
                  title="Xóa"
                >
                  <span className="text-xs">✕</span>
                </button>
              )}
              <button
                type="submit"
                className="absolute right-2 top-1/2 -translate-y-1/2 flex h-[36px] items-center gap-1.5 rounded-full bg-brand-primary px-3.5 text-xs font-semibold text-white hover:bg-brand-primary-hover transition-colors active:scale-95"
              >
                <Search className="size-3.5" />
                <span>Tìm</span>
              </button>
            </form>
          </div>

          {/* Danh mục — ẩn khi đang search */}
          {!searchText && (
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
          )}
        </div>
      </div>

      {/* ---- Danh sách món — vùng cuộn riêng, tự động chia 2 cột trên tablet/desktop ---- */}
      <div className="flex-1 overflow-y-auto w-full">
        <div className="w-full max-w-4xl mx-auto px-4 pt-4 pb-6">
          {/*
            QĐ-09: phiên đã khoá thì nói NGAY ở đây, chỗ khách bắt đầu chọn món — trước đây
            chỉ chặn ở Giỏ hàng nên khách chọn cả loạt món rồi mới biết là không gọi được.
            Nguồn sự thật là trạng thái phiên lấy từ backend (`useBillLocked`).
          */}
          {billLocked ? (
            <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-[#FEDF89] bg-[#FFFCF5] px-4 py-3">
              <Lock className="mt-0.5 size-4 shrink-0 text-[#B54708]" />
              <p className="text-sm text-[#B54708]">
                <strong>Đã yêu cầu tính tiền</strong> — không thể gọi thêm món. Cần gọi thêm,
                vui lòng báo nhân viên.
              </p>
            </div>
          ) : null}

          {/*

            KHÔNG dùng `uppercase`: ở 12px + màu nhạt, mỗi dấu thanh tiếng Việt chỉ còn
            1-2 điểm ảnh nên nhìn như mất dấu ("MÓN PHỔ BIẾN" đọc ra "MON PHO BIEN").
            Đã đo từng dòng điểm ảnh - xem docs/reports/nhan-vien-buoc-0.md mục 10.
          */}

          {/* ---- Banner KM cấp HÓA ĐƠN (đặc tả FR-CUS-02): không gạch giá từng món,
              chỉ nhắc điều kiện để khách biết. Lượt có thể hết trước lúc chốt bàn.
          ---- */}
          {invoicePromos.length > 0 ? (
            <div className="mb-3 space-y-1.5">
              {invoicePromos.map((promo) => {
                const { discount } = calculatePromoDiscount(promo, cartSubtotal)
                return (
                  <div
                    key={promo.id}
                    className="flex items-center gap-2.5 rounded-xl bg-status-success-subtle/60 px-3.5 py-2.5 border border-status-success/20"
                  >
                    <span className="text-base">🎉</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-status-success">{promo.name}</p>
                      <p className="text-[11px] text-text-secondary">
                        {promo.description || "Áp dụng khi chốt hóa đơn"}.
                        {discount > 0
                          ? ` Dự kiến giảm ${discount.toLocaleString("vi-VN")}đ.`
                          : " (Tổng hóa đơn chưa đủ điều kiện)"}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : null}

          <p className="mb-3 text-xs font-bold tracking-wider text-text-tertiary">
            {searchText.trim() 
              ? `Kết quả tìm kiếm "${searchText}" (${dishes.length})`
              : `Món ${activeCategory?.label ?? ""}`}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {dishes.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center py-12 text-center">
                {searchText.trim() ? (
                  <>
                    <span className="text-4xl mb-3">🔍</span>
                    <p className="text-sm font-semibold text-text-primary mb-1">
                      Không tìm thấy "{searchText}"
                    </p>
                    <p className="text-xs text-text-tertiary">
                      Thử tìm với từ khóa khác hoặc xem tất cả món
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("")
                        setSearchText("")
                      }}
                      className="mt-4 rounded-full bg-brand-primary px-4 py-2 text-xs font-semibold text-white hover:bg-brand-primary-hover transition-colors"
                    >
                      Xem tất cả món
                    </button>
                  </>
                ) : (
                  <p className="text-sm text-text-tertiary">
                    Không có món nào trong danh mục này
                  </p>
                )}
              </div>
            ) : (
              dishes.map((dish) => {
                // BR-05: món hết hàng tại chi nhánh KHÔNG hiển thị trên menu khách —
                // backend `getMenuForCustomer()` đã lọc sẵn `stockStatus == AVAILABLE`,
                // nên ở đây không cần (và không được) hiển thị nhãn "Hết hàng".
                // Trường hợp món trong giỏ bị báo hết trước lúc gửi được xử lý ở trang
                // Giỏ hàng bằng `useOutOfStock(branchId)` — bottom sheet "Một số món đã hết".

                // Check for price override discount (chi nhánh ghi đè giá)
                const showOverrideDiscount = dish.hasOverride && dish.effectivePrice < dish.basePrice
                const overrideDiscountPercent = showOverrideDiscount
                  ? Math.round(((dish.basePrice - dish.effectivePrice) / dish.basePrice) * 100)
                  : undefined

                // Khuyến mãi cấp MÓN — BE đã filter active, chỉ cần match với món này
                // FR-CUS-02: giá gốc gạch ngang + giá sau giảm + nhãn tên chương trình
                const promotionMatch = findBestPromotionForItem(dish, activePromotions)

                // Giá hiển thị: ưu tiên KM > giá override > giá gốc
                const finalPrice = promotionMatch ? promotionMatch.finalPrice : dish.effectivePrice
                const originalPrice = promotionMatch
                  ? promotionMatch.originalPrice
                  : showOverrideDiscount
                    ? dish.basePrice
                    : undefined

                const discountPercent = promotionMatch
                  ? promotionMatch.discountPercent
                  : overrideDiscountPercent

                // Nhãn tên chương trình (chỉ cho KM món, không phải override giá)
                const promotionLabel = promotionMatch
                  ? formatPromotionBadge(promotionMatch.promotion)
                  : undefined

                return (
                  <MenuItemCard
                    key={dish.dishId}
                    name={dish.dishName}
                    description={dish.description || ""}
                    price={finalPrice}
                    originalPrice={originalPrice}
                    discountPercent={discountPercent}
                    promotionLabel={promotionLabel}
                    imageUrl={dish.imageUrl || ""}
                    onClick={() => goToDishDetail(String(dish.dishId))}
                    onAdd={() => handleQuickAdd(dish)}
                    // QĐ-09: phiên đã yêu cầu tính tiền thì nút "+" phải TRÔNG như không bấm được,
                    // đồng bộ với băng cảnh báo ở trên và nút ở màn Chi tiết món.
                    disabled={billLocked}
                    disabledReason="Đã yêu cầu tính tiền — không thể gọi thêm món"
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

      {/* Modal Khuyến mãi */}
      {showPromotionsModal && (
        <PromotionsModal
          promotions={activePromotions}
          cartSubtotal={cartSubtotal}
          onClose={() => setShowPromotionsModal(false)}
        />
      )}
    </div>
  )
}

/**
 * Modal hiển thị danh sách khuyến mãi đang có
 */
interface PromotionsModalProps {
  promotions: Promotion[]
  cartSubtotal: number
  onClose: () => void
}

function PromotionsModal({ promotions, cartSubtotal, onClose }: PromotionsModalProps) {
  const itemPromos = promotions.filter((p) => p.applyLevel === "ITEM")
  const invoicePromos = promotions.filter((p) => p.applyLevel === "INVOICE")

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center sm:justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal content */}
      <div className="relative w-full max-w-2xl bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom sm:slide-in-from-bottom-0 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-border-default">
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F79009] to-[#DC6803] shadow-sm">
              <Gift className="size-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-text-primary">
                Khuyến mãi đang có
              </h2>
              <p className="text-xs text-text-tertiary">
                {promotions.length} chương trình
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full hover:bg-surface-muted transition-colors"
          >
            <X className="size-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {/* Khuyến mãi cấp MÓN */}
          {itemPromos.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <Tag className="size-4 text-brand-primary" />
                <h3 className="text-sm font-bold text-text-primary">
                  Giảm giá theo món ({itemPromos.length})
                </h3>
              </div>
              <div className="space-y-3">
                {itemPromos.map((promo) => (
                  <PromotionCard key={promo.id} promotion={promo} type="item" />
                ))}
              </div>
            </div>
          )}

          {/* Khuyến mãi cấp HÓA ĐƠN */}
          {invoicePromos.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3">
                <TrendingUp className="size-4 text-status-success" />
                <h3 className="text-sm font-bold text-text-primary">
                  Giảm giá hóa đơn ({invoicePromos.length})
                </h3>
              </div>
              <div className="space-y-3">
                {invoicePromos.map((promo) => {
                  const { discount } = calculatePromoDiscount(promo, cartSubtotal)
                  return (
                    <PromotionCard
                      key={promo.id}
                      promotion={promo}
                      type="invoice"
                      currentDiscount={discount}
                      cartSubtotal={cartSubtotal}
                    />
                  )
                })}
              </div>
            </div>
          )}

          {promotions.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-surface-muted">
                <Gift className="size-8 text-text-tertiary" />
              </div>
              <p className="text-sm font-medium text-text-secondary">
                Hiện chưa có khuyến mãi nào
              </p>
              <p className="text-xs text-text-tertiary mt-1">
                Vui lòng quay lại sau
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border-default bg-surface-page/50">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-12 rounded-xl bg-brand-primary text-white font-semibold hover:bg-brand-primary-hover transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * Card hiển thị 1 khuyến mãi
 */
interface PromotionCardProps {
  promotion: Promotion
  type: "item" | "invoice"
  currentDiscount?: number
  cartSubtotal?: number
}

function PromotionCard({ promotion, type, currentDiscount, cartSubtotal }: PromotionCardProps) {
  const isInvoicePromo = type === "invoice"
  const hasCondition = promotion.conditionMinAmount && promotion.conditionMinAmount > 0
  const meetsCondition = cartSubtotal ? cartSubtotal >= (promotion.conditionMinAmount || 0) : false

  // Check if this promotion is currently applied
  const isApplied = isInvoicePromo && meetsCondition && currentDiscount && currentDiscount > 0

  // Parse action để lấy discount info
  let discountText = ""
  try {
    const action = JSON.parse(promotion.action)
    if (action.discountType === "PERCENTAGE") {
      discountText = `Giảm ${action.discountValue}%`
      if (action.maxDiscountAmount) {
        discountText += ` (tối đa ${action.maxDiscountAmount.toLocaleString("vi-VN")}đ)`
      }
    } else if (action.discountType === "FIXED_AMOUNT") {
      discountText = `Giảm ${action.discountValue.toLocaleString("vi-VN")}đ`
    }
  } catch {
    discountText = "Giảm giá"
  }

  return (
    <div className={cn(
      "rounded-2xl border-2 p-4 transition-all relative",
      isApplied
        ? "border-status-success bg-status-success-subtle/50 shadow-sm"
        : isInvoicePromo
          ? "border-status-success/30 bg-status-success-subtle/30"
          : "border-brand-primary/30 bg-brand-primary-subtle/30"
    )}>
      {/* Badge "Đang áp dụng" */}
      {isApplied && (
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-status-success text-white text-xs font-bold shadow-sm">
          <span className="text-xs">✓</span>
          <span>Đang áp dụng</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2.5">
        <div className="flex-1 min-w-0 pr-20">
          <h4 className="text-base font-bold text-text-primary line-clamp-2">
            {promotion.name}
          </h4>
          <p className={cn(
            "text-sm font-semibold mt-1",
            isApplied 
              ? "text-status-success"
              : isInvoicePromo 
                ? "text-status-success" 
                : "text-brand-primary"
          )}>
            {discountText}
          </p>
        </div>
        {!isApplied && promotion.remainingUsageLimit !== null && promotion.remainingUsageLimit > 0 && (
          <div className="shrink-0 flex items-center gap-1 px-2 py-1 rounded-full bg-white/80 border border-border-default">
            <Clock className="size-3 text-text-tertiary" />
            <span className="text-xs font-semibold text-text-secondary">
              Còn {promotion.remainingUsageLimit}
            </span>
          </div>
        )}
      </div>

      {/* Description */}
      {promotion.description && (
        <p className="text-xs text-text-secondary leading-relaxed mb-3">
          {promotion.description}
        </p>
      )}

      {/* Conditions */}
      {hasCondition && (
        <div className={cn(
          "flex items-start gap-2 px-3 py-2 rounded-xl border mb-2",
          isApplied
            ? "bg-status-success-subtle/70 border-status-success/30"
            : meetsCondition
              ? "bg-status-success-subtle/50 border-status-success/20"
              : "bg-white border-border-default"
        )}>
          <span className="text-sm shrink-0">
            {isApplied || meetsCondition ? "✅" : "ℹ️"}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-text-secondary">
              Điều kiện: Hóa đơn từ {promotion.conditionMinAmount?.toLocaleString("vi-VN")}đ
            </p>
            {isInvoicePromo && cartSubtotal && (
              <p className={cn(
                "text-xs font-semibold mt-1",
                isApplied || meetsCondition ? "text-status-success" : "text-text-tertiary"
              )}>
                {isApplied
                  ? `✨ Đang giảm ${currentDiscount?.toLocaleString("vi-VN")}đ`
                  : meetsCondition
                    ? `Đạt điều kiện · Giảm ${currentDiscount?.toLocaleString("vi-VN")}đ`
                    : `Hiện tại: ${cartSubtotal.toLocaleString("vi-VN")}đ · Còn thiếu ${((promotion.conditionMinAmount || 0) - cartSubtotal).toLocaleString("vi-VN")}đ`
                }
              </p>
            )}
          </div>
        </div>
      )}

      {/* How to use */}
      <div className={cn(
        "flex items-start gap-2 px-3 py-2 rounded-xl",
        isApplied ? "bg-white/60" : "bg-white/80"
      )}>
        <span className="text-sm shrink-0">💡</span>
        <p className="text-xs text-text-secondary leading-relaxed">
          {isInvoicePromo ? (
            <>
              <strong>Tự động áp dụng</strong> khi thanh toán nếu đạt điều kiện. 
              {isApplied && <span className="text-status-success font-semibold"> Đang được áp dụng cho đơn hàng này!</span>}
            </>
          ) : (
            <>
              <strong>Tự động giảm giá</strong> khi thêm món có khuyến mãi vào giỏ. Giá đã bao gồm giảm giá.
            </>
          )}
        </p>
      </div>
    </div>
  )
}
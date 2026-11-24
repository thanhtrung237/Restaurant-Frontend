import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { ChevronLeft, Check, SearchX } from "lucide-react"
import { SearchInput } from "@/components/common/SearchInput"
import { Chip } from "@/components/common/Chip"
import { MenuItemCard } from "@/components/common/MenuItemCard"
import { EmptyState } from "@/components/common/EmptyState"
import { useToast } from "@/hooks/use-toast"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useBranchMenu } from "@/features/customer/api"
import { useCustomerCartStore } from "@/features/customer/store/cart.store"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { useBillLocked } from "@/features/customer/hooks/use-bill-locked"
import { useGoBack } from "@/hooks/use-go-back"
import type { BranchMenuItem } from "@/types/models"
import { cn } from "@/lib/utils"

const ALL_FILTER_ID = "all"

/** Id danh mục dùng cho chip lọc: "all" hoặc `categoryId` thật (number). */
type FilterId = typeof ALL_FILTER_ID | number

/** Bỏ dấu tiếng Việt để so khớp không phân biệt dấu, vd: "gà nướng" -> "ga nuong" */
function stripDiacritics(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
}

/**
 * Tìm kiếm món
 * Nguồn: Mobile / Tìm kiếm món
 *
 * Tìm theo tên món trong toàn bộ thực đơn của chi nhánh, có tuỳ chọn "bỏ dấu" (mặc định bật)
 * để khách gõ không dấu vẫn ra kết quả, và lọc nhanh theo danh mục trong tập kết quả.
 */
export default function SearchDishPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  // Fallback cho nút "Quay lại": mở thẳng màn này (link/bookmark/F5) thì về Thực đơn của
  // đúng bàn, chứ không rơi ra ngoài ứng dụng.
  const goBack = useGoBack(generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" }))
  const { toast } = useToast()

  const [query, setQuery] = React.useState("")
  const [ignoreDiacritics, setIgnoreDiacritics] = React.useState(true)
  const [activeFilterId, setActiveFilterId] = React.useState<FilterId>(ALL_FILTER_ID)

  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const branchId = tableSession?.branchId
  // QĐ-09: đã yêu cầu tính tiền thì khoá thêm món. Cùng một nguồn sự thật (trạng thái phiên
  // lấy từ backend) với màn Thực đơn và Chi tiết món, nên ba màn không bao giờ nói khác nhau.
  const billLocked = useBillLocked()
  // Chỉ cho thêm món khi Phục vụ đã xác nhận mở bàn — cùng điều kiện với màn Thực đơn:
  // `WAITING_FOR_PAY` vẫn là bàn đã mở, việc chặn gọi thêm ở trạng thái đó do `billLocked` lo.
  const isTableOpenConfirmed =
    tableSession?.status === "SERVING" || tableSession?.status === "WAITING_FOR_PAY"

  // Tìm trên CHÍNH thực đơn chi nhánh đang dùng ở màn Thực đơn (cùng query key nên
  // dùng lại cache, không phát sinh request mới). Backend chưa có endpoint tìm kiếm
  // riêng, nên lọc phía client trên tập đã tải.
  const { data: menuItems = [], isLoading } = useBranchMenu(branchId)

  const rawResults = React.useMemo<BranchMenuItem[]>(() => {
    const q = query.trim()
    if (!q) return []
    const normalize = (text: string) =>
      ignoreDiacritics ? stripDiacritics(text).toLowerCase() : text.toLowerCase()
    const normalizedQuery = normalize(q)
    return menuItems.filter((dish) => normalize(dish.dishName).includes(normalizedQuery))
  }, [menuItems, query, ignoreDiacritics])

  // Danh mục chỉ hiện các mục thực sự có trong kết quả, giữ thứ tự xuất hiện.
  const availableCategories = React.useMemo(() => {
    const seen = new Map<number, string>()
    rawResults.forEach((dish) => {
      if (!seen.has(dish.categoryId)) {
        seen.set(dish.categoryId, dish.categoryName || "Khác")
      }
    })
    return Array.from(seen, ([id, label]) => ({ id, label }))
  }, [rawResults])

  React.useEffect(() => {
    setActiveFilterId(ALL_FILTER_ID)
  }, [query])

  const results =
    activeFilterId === ALL_FILTER_ID
      ? rawResults
      : rawResults.filter((d) => d.categoryId === activeFilterId)

  const quickAdd = useCustomerCartStore((s) => s.quickAdd)

  function handleQuickAdd(dish: BranchMenuItem) {
    // QĐ-09: chặn cả ở hàm, không chỉ làm mờ nút — đề phòng nơi khác gọi thẳng vào đây.
    if (billLocked) {
      toast({
        title: "Đã yêu cầu tính tiền",
        description: "Không thể gọi thêm món. Cần gọi thêm, vui lòng báo nhân viên.",
        variant: "warning",
      })
      return
    }
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

  function goToDishDetail(dishId: string) {
    navigate(generatePath(CUSTOMER_PATHS.DISH_DETAIL, { qrCode: qrCode ?? "", dishId }))
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-page">
      {/* ---- Header: back + ô tìm kiếm ---- */}
      <div className="sticky top-0 z-10 border-b border-border-default bg-surface-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="mx-auto flex w-full max-w-3xl lg:max-w-4xl items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            aria-label="Quay lại"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
          >
            <ChevronLeft className="size-5" />
          </button>
          <SearchInput
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onClear={() => setQuery("")}
            placeholder="Tìm món trong thực đơn..."
            className="flex-1"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-full max-w-3xl lg:max-w-4xl">
          {query.trim() ? (
            <>
              {/* ---- Dòng số kết quả + tuỳ chọn bỏ dấu ---- */}
              <div className="mb-3 flex items-center justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-text-secondary">
                  {results.length} kết quả cho{" "}
                  <span className="font-semibold text-text-primary">
                    &ldquo;{query.trim()}&rdquo;
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => setIgnoreDiacritics((v) => !v)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold transition-colors",
                    ignoreDiacritics
                      ? "bg-status-success-subtle text-status-success"
                      : "bg-surface-muted text-text-tertiary",
                  )}
                >
                  bỏ dấu
                  {ignoreDiacritics ? <Check className="size-3" strokeWidth={3} /> : null}
                </button>
              </div>

              {/* ---- Chip lọc theo danh mục (chỉ hiện khi có kết quả) ---- */}
              {availableCategories.length > 0 ? (
                <div className="mb-4 flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  <Chip
                    label="Tất cả"
                    selected={activeFilterId === ALL_FILTER_ID}
                    onClick={() => setActiveFilterId(ALL_FILTER_ID)}
                  />
                  {availableCategories.map((category) => (
                    <Chip
                      key={category.id}
                      label={category.label}
                      selected={category.id === activeFilterId}
                      onClick={() => setActiveFilterId(category.id)}
                    />
                  ))}
                </div>
              ) : null}

              {/* ---- Danh sách kết quả ---- */}
              {results.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {results.map((dish) => {
                    // BR-05: món hết hàng không hiển thị cho khách — `useBranchMenu`
                    // lấy từ endpoint khách, backend đã lọc sẵn `stockStatus == AVAILABLE`.
                    const showOriginalPrice =
                      dish.hasOverride && dish.effectivePrice < dish.basePrice

                    return (
                      <MenuItemCard
                        key={dish.dishId}
                        name={dish.dishName}
                        description={dish.description || ""}
                        price={dish.effectivePrice}
                        originalPrice={showOriginalPrice ? dish.basePrice : undefined}
                        imageUrl={dish.imageUrl || ""}
                        onClick={() => goToDishDetail(String(dish.dishId))}
                        onAdd={() => handleQuickAdd(dish)}
                        disabled={billLocked}
                        disabledReason="Đã yêu cầu tính tiền — không thể gọi thêm món"
                      />
                    )
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={SearchX}
                  title="Không tìm thấy món phù hợp"
                  description="Thử từ khoá khác hoặc kiểm tra lại chính tả."
                />
              )}
            </>
          ) : isLoading ? (
            <p className="pt-10 text-center text-sm text-text-tertiary">Đang tải thực đơn...</p>
          ) : (
            <p className="pt-10 text-center text-sm text-text-tertiary">
              Nhập tên món bạn muốn tìm, vd: &ldquo;gà nướng&rdquo;, &ldquo;phở&rdquo;...
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

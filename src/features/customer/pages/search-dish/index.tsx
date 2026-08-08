import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { ChevronLeft, Check, SearchX } from "lucide-react"
import { SearchInput } from "@/components/common/SearchInput"
import { Chip } from "@/components/common/Chip"
import { MenuItemCard } from "@/components/common/MenuItemCard"
import { EmptyState } from "@/components/common/EmptyState"
import { useToast } from "@/hooks/use-toast"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import {
  CUSTOMER_CATEGORIES,
  CUSTOMER_DISHES,
  type CustomerDish,
} from "@/features/customer/api/dish-mock"
import { useCustomerCartStore } from "@/features/customer/store/cart.store"
import { cn } from "@/lib/utils"

const ALL_FILTER_ID = "all"

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
  const { toast } = useToast()

  const [query, setQuery] = React.useState("")
  const [ignoreDiacritics, setIgnoreDiacritics] = React.useState(true)
  const [activeFilterId, setActiveFilterId] = React.useState<string>(ALL_FILTER_ID)

  // TODO(api): thay bằng GET /api/branches/:branchId/menu?q=... (debounce khi gọi API thật)
  const rawResults = React.useMemo<CustomerDish[]>(() => {
    const q = query.trim()
    if (!q) return []
    const normalize = (text: string) => (ignoreDiacritics ? stripDiacritics(text).toLowerCase() : text.toLowerCase())
    const normalizedQuery = normalize(q)
    return CUSTOMER_DISHES.filter((dish) => normalize(dish.name).includes(normalizedQuery))
  }, [query, ignoreDiacritics])

  // Danh mục chỉ hiện các mục thực sự có trong kết quả (giữ đúng thứ tự CUSTOMER_CATEGORIES)
  const availableCategories = React.useMemo(() => {
    const idsInResults = new Set(rawResults.map((d) => d.categoryId))
    return CUSTOMER_CATEGORIES.filter((c) => idsInResults.has(c.id))
  }, [rawResults])

  React.useEffect(() => {
    setActiveFilterId(ALL_FILTER_ID)
  }, [query])

  const results =
    activeFilterId === ALL_FILTER_ID
      ? rawResults
      : rawResults.filter((d) => d.categoryId === activeFilterId)

  const quickAdd = useCustomerCartStore((s) => s.quickAdd)

  function handleQuickAdd(dish: CustomerDish) {
    quickAdd({ dishId: dish.id, name: dish.name, imageUrl: dish.imageUrl, unitPrice: dish.price })
    toast({ title: "Đã thêm vào giỏ", description: dish.name, variant: "success" })
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
            onClick={() => navigate(-1)}
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
                  <span className="font-semibold text-text-primary">&ldquo;{query.trim()}&rdquo;</span>
                </p>
                <button
                  type="button"
                  onClick={() => setIgnoreDiacritics((v) => !v)}
                  className={cn(
                    "inline-flex shrink-0 items-center gap-1 rounded-pill px-2.5 py-1 text-xs font-semibold transition-colors",
                    ignoreDiacritics
                      ? "bg-status-success-subtle text-status-success"
                      : "bg-surface-muted text-text-tertiary"
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
                  {results.map((dish) => (
                    <MenuItemCard
                      key={dish.id}
                      name={dish.name}
                      description={dish.shortDescription}
                      price={dish.price}
                      originalPrice={dish.originalPrice}
                      discountPercent={dish.discountPercent}
                      imageUrl={dish.imageUrl}
                      outOfStockLabel={dish.outOfStock ? "Hết hàng" : undefined}
                      onClick={() => goToDishDetail(dish.id)}
                      onAdd={dish.outOfStock ? undefined : () => handleQuickAdd(dish)}
                    />
                  ))}
                </div>
              ) : (
                <EmptyState
                  icon={SearchX}
                  title="Không tìm thấy món phù hợp"
                  description="Thử từ khoá khác hoặc kiểm tra lại chính tả."
                />
              )}
            </>
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
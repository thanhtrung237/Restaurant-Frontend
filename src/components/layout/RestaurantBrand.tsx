import { useAuthStore } from "@/stores/auth.store"
import { useRestaurant } from "@/api/restaurants.api"
import { cn } from "@/lib/utils"

interface RestaurantBrandProps {
  /** Cạnh ô logo: `sm` cho Sidebar (36px), `md` cho NavDrawer (44px). */
  size?: "sm" | "md"
  className?: string
}

/**
 * Ô logo + tên nhà hàng, đọc từ `GET /restaurants/{id}` của tài khoản đang đăng nhập.
 *
 * Trước đây Sidebar và NavDrawer đều viết cứng chữ "P" và tên "Phở Việt", nên đổi logo ở trang
 * Cấu hình xong vẫn thấy logo cũ. Gom vào một chỗ để mọi nơi hiện logo cùng lấy một nguồn —
 * react-query chia sẻ cache theo `qk.restaurants.detail(id)`, và `useUpdateRestaurant` đã
 * `invalidateQueries` nên lưu xong là các thanh điều hướng tự cập nhật.
 *
 * Chưa tải xong hoặc chưa có logo thì hiện chữ cái đầu của tên — không để ô trống nhấp nháy.
 */
export function RestaurantBrand({ size = "sm", className }: RestaurantBrandProps) {
  const restaurantId = useAuthStore((s) => s.account?.restaurantId)
  const { data: restaurant } = useRestaurant(restaurantId)

  const name = restaurant?.name ?? ""
  const logoUrl = restaurant?.logoUrl ?? ""
  const initial = (name.trim()[0] || "•").toUpperCase()

  const box = size === "md" ? "size-11 rounded-xl" : "size-9 rounded-xl"
  const letter = size === "md" ? "text-lg" : "text-base"

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center overflow-hidden bg-brand-primary shadow-xs",
        box,
        className,
      )}
    >
      {logoUrl ? (
        <img
          src={logoUrl}
          alt={name ? `Logo ${name}` : "Logo nhà hàng"}
          className="size-full object-cover"
        />
      ) : (
        <span className={cn("font-extrabold text-text-on-brand font-sans", letter)}>{initial}</span>
      )}
    </div>
  )
}

/** Tên nhà hàng đang đăng nhập — dùng kèm {@link RestaurantBrand}. */
export function useRestaurantName(): string {
  const restaurantId = useAuthStore((s) => s.account?.restaurantId)
  const { data: restaurant } = useRestaurant(restaurantId)
  return restaurant?.name ?? ""
}

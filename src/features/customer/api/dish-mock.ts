/**
 * Dữ liệu mẫu THỰC ĐƠN cho luồng Khách hàng (mobile).
 * TODO(api): thay bằng dữ liệu thật khi có backend:
 *   - GET /api/branches/:branchId/menu -> danh sách Category + Dish (đã áp DishOverride giá/ẩn theo chi nhánh)
 *   - GET /api/branches/:branchId/menu?q=... -> tìm kiếm món
 *
 * Đây là bản rút gọn cho UI mock — KHÔNG map 1-1 với Dish.java/Category.java (đủ trường
 * BaseEntity, restaurantId...) như src/types/models, vì màn Khách hàng không cần các
 * trường quản trị đó.
 */

/** 1 lựa chọn kích cỡ — lựa chọn đầu tiên luôn là mặc định (priceDelta = 0) */
export interface CustomerDishSizeOption {
  id: string
  label: string
  priceDelta: number
}

/** 1 lựa chọn topping — có thể chọn nhiều, có thể mặc định tick sẵn */
export interface CustomerDishToppingOption {
  id: string
  label: string
  priceDelta: number
  defaultChecked?: boolean
}

export interface CustomerDish {
  id: string
  categoryId: string
  name: string
  /** Mô tả ngắn hiển thị trong danh sách/kết quả tìm kiếm */
  shortDescription?: string
  /** Mô tả đầy đủ hiển thị ở màn Chi tiết món */
  description?: string
  /** Giá ở cấu hình mặc định (size đầu tiên, chưa topping) */
  price: number
  originalPrice?: number
  discountPercent?: number
  imageUrl?: string
  /** Món có xuất hiện ở tab "Phổ biến" không */
  popular?: boolean
  outOfStock?: boolean
  sizeOptions?: CustomerDishSizeOption[]
  toppingOptions?: CustomerDishToppingOption[]
}

export interface CustomerCategory {
  id: string
  label: string
}

/** Tab đầu tiên "Phổ biến" là tab ảo (gom các món có popular=true từ mọi danh mục), không phải Category thật */
export const POPULAR_CATEGORY_ID = "pho-bien"

export const CUSTOMER_CATEGORIES: CustomerCategory[] = [
  { id: POPULAR_CATEGORY_ID, label: "Phổ biến" },
  { id: "khai-vi", label: "Khai vị" },
  { id: "mon-chinh", label: "Món chính" },
  { id: "lau", label: "Lẩu" },
]

export const CUSTOMER_DISHES: CustomerDish[] = [
  {
    id: "pho-bo-tai-nam",
    categoryId: "mon-chinh",
    name: "Phở bò tái nạm",
    shortDescription: "Nước dùng ninh 12 tiếng, bánh phở tươi",
    description:
      "Nước dùng bò ninh 12 tiếng từ xương ống, thơm quế hồi. Bánh phở tươi, thịt bò tái và nạm thái mỏng.",
    price: 65000,
    popular: true,
  },
  {
    id: "goi-cuon-tom-thit",
    categoryId: "khai-vi",
    name: "Gỏi cuốn tôm thịt",
    shortDescription: "2 cuốn, kèm nước chấm đặc biệt",
    description:
      "Tôm tươi, thịt luộc, bún, rau thơm cuốn bánh tráng. Kèm nước chấm tương đậu phộng đặc biệt của quán.",
    price: 45000,
    originalPrice: 55000,
    discountPercent: 18,
    popular: true,
    sizeOptions: [
      { id: "small", label: "Nhỏ (2 cuốn)", priceDelta: 0 },
      { id: "large", label: "Lớn (4 cuốn)", priceDelta: 35000 },
    ],
    toppingOptions: [
      { id: "extra-shrimp", label: "Thêm tôm", priceDelta: 15000 },
      { id: "extra-sauce", label: "Thêm nước chấm", priceDelta: 5000, defaultChecked: true },
    ],
  },
  {
    id: "bun-cha-ha-noi",
    categoryId: "mon-chinh",
    name: "Bún chả Hà Nội",
    shortDescription: "Chả nướng than hoa, bún tươi, rau sống",
    description: "Chả miếng và chả băm nướng than hoa, ăn kèm bún tươi, rau sống và nước mắm chua ngọt.",
    price: 70000,
    popular: true,
  },
  {
    id: "com-tam-suon-bi",
    categoryId: "mon-chinh",
    name: "Cơm tấm sườn bì",
    shortDescription: "Sườn nướng, bì, mắm",
    description: "Cơm tấm ăn kèm sườn nướng, bì, chả trứng và nước mắm pha đặc trưng.",
    price: 75000,
    originalPrice: 90000,
    popular: true,
    outOfStock: true,
  },
  {
    id: "com-ga-nuong",
    categoryId: "mon-chinh",
    name: "Cơm gà nướng",
    shortDescription: "Cơm kèm gà nướng xối mỡ",
    description: "Cơm nóng ăn kèm gà nướng xối mỡ hành, dưa leo và nước mắm gừng.",
    price: 65000,
    originalPrice: 75000,
  },
  {
    id: "ga-nuong-mat-ong",
    categoryId: "mon-chinh",
    name: "Gà nướng mật ong",
    shortDescription: "Gà ta nướng mật ong, thơm ngọt",
    description: "Gà ta nguyên miếng ướp mật ong, nướng than hoa cho lớp da vàng óng, thơm ngọt.",
    price: 120000,
  },
  {
    id: "ga-nuong-la-chanh",
    categoryId: "mon-chinh",
    name: "Gà nướng lá chanh",
    shortDescription: "Đậm vị lá chanh, da giòn",
    description: "Gà ta ướp lá chanh thái chỉ, nướng than hoa cho da giòn, thịt thơm đậm vị.",
    price: 135000,
  },
  {
    id: "ga-nuong-muoi-ot",
    categoryId: "mon-chinh",
    name: "Gà nướng muối ớt",
    shortDescription: "Cay nồng, ăn kèm rau răm",
    description: "Gà ta ướp muối ớt cay nồng, nướng than hoa, ăn kèm rau răm và muối tiêu chanh.",
    price: 130000,
  },
  {
    id: "tra-tac",
    categoryId: "khai-vi",
    name: "Trà tắc",
    shortDescription: "Chua ngọt, giải khát",
    description: "Trà tắc chua ngọt mát lạnh, giải khát cho bữa ăn thêm ngon miệng.",
    price: 30000,
    sizeOptions: [
      { id: "less-ice", label: "Ít đá", priceDelta: 0 },
      { id: "normal-ice", label: "Đá bình thường", priceDelta: 0 },
    ],
  },
  {
    id: "bia-saigon",
    categoryId: "khai-vi",
    name: "Bia Sài Gòn",
    shortDescription: "Bia lon 330ml",
    description: "Bia lon Sài Gòn 330ml, phục vụ lạnh.",
    price: 20000,
  },
  {
    id: "lau-thai-hai-san",
    categoryId: "lau",
    name: "Lẩu thái hải sản",
    shortDescription: "Chua cay, hải sản tươi — dùng cho 2-3 người",
    description: "Nước lẩu chua cay đậm vị Thái, đầy đủ tôm/mực/nghêu tươi, dùng kèm bún hoặc mì.",
    price: 250000,
    popular: true,
  },
  {
    id: "lau-ga-la-giang",
    categoryId: "lau",
    name: "Lẩu gà lá giang",
    shortDescription: "Chua thanh lá giang — dùng cho 2-3 người",
    description: "Nước lẩu chua thanh từ lá giang, gà ta dai ngọt, ăn kèm bún tươi.",
    price: 220000,
  },
]

export function getCustomerCategories(): CustomerCategory[] {
  return CUSTOMER_CATEGORIES
}

/** Món thuộc 1 tab: tab "Phổ biến" gom món có popular=true từ mọi danh mục; các tab khác lọc theo categoryId */
export function getDishesByCategory(categoryId: string): CustomerDish[] {
  if (categoryId === POPULAR_CATEGORY_ID) {
    return CUSTOMER_DISHES.filter((d) => d.popular)
  }
  return CUSTOMER_DISHES.filter((d) => d.categoryId === categoryId)
}

export function getDishById(dishId: string): CustomerDish | undefined {
  return CUSTOMER_DISHES.find((d) => d.id === dishId)
}

/** Tìm kiếm không phân biệt hoa/thường, khớp theo tên món */
export function searchDishes(query: string): CustomerDish[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  return CUSTOMER_DISHES.filter((d) => d.name.toLowerCase().includes(q))
}
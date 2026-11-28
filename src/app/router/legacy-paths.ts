import { LEGACY_CUSTOMER_BASE, CUSTOMER_BASE } from "./paths/customer.paths"

const legacyPages = new Map([
  ["/dang-nhap", "/login"],
  ["/dang-nhap-quan-tri", "/platform-login"],
  ["/quen-mat-khau", "/forgot-password"],
  ["/doi-mat-khau-lan-dau", "/first-login-password"],
  ["/khong-co-quyen-truy-cap", "/forbidden"],
])

const legacyAreas = new Map([
  [LEGACY_CUSTOMER_BASE, CUSTOMER_BASE],
  ["/phuc-vu", "/waiter"],
  ["/thu-ngan", "/cashier"],
  ["/quan-ly-chi-nhanh", "/branch-manager"],
  ["/quan-tri-nha-hang", "/restaurant-admin"],
  ["/quan-tri-nen-tang", "/platform-admin"],
])

const staffSegments = new Map([
  ["so-do-ban", "table-map"],
  ["mo-ban", "open-table"],
  ["them-don-mang-ve", "takeaway"],
  ["order-che-bien", "orders-and-prep"],
  ["them-mon", "add-items"],
  ["bep", "kitchen"],
  ["chuyen-gop-ban", "transfer-merge-tables"],
  ["thanh-toan", "checkout"],
  ["chuyen-khoan-qr", "qr-transfer"],
  ["hoa-don-dien-tu", "e-invoices"],
  ["hoa-don", "invoices"],
  ["tra-cuu", "lookup"],
  ["thuc-don", "menu"],
  ["khuyen-mai", "promotions"],
  ["tao-moi", "new"],
  ["chinh-sua", "edit"],
  ["bao-cao", "reports"],
  ["doanh-thu-theo-gio", "hourly-revenue"],
  ["chi-nhanh", "branches"],
  ["cau-hinh", "settings"],
  ["chiet-khau-thu-cong", "manual-discount"],
  ["nhat-ky", "audit-log"],
  ["vai-tro-phan-quyen", "roles-permissions"],
  ["nhan-vien", "staff"],
  ["thue-phi", "taxes-fees"],
  ["het-hang", "out-of-stock"],
  ["danh-muc", "categories"],
  ["nha-hang", "restaurants"],
  ["nhat-ky-he-thong", "system-audit-log"],
])

const customerSegments = new Map([
  ["cho-mo-ban", "waiting-for-table"],
  ["tu-choi", "rejected"],
  ["thuc-don", "menu"],
  ["tim-kiem", "search"],
  ["mon", "dish"],
  ["gio-hang", "cart"],
  ["mon-da-goi", "ordered-items"],
  ["yeu-cau-tinh-tien", "request-bill"],
  ["hoa-don", "invoice"],
  ["thanh-toan-qr", "payment-qr"],
  ["thanh-toan-thanh-cong", "payment-success"],
  ["thanh-toan-that-bai", "payment-failed"],
  ["danh-gia", "review"],
])

export function getLegacyPathTarget(pathname: string): string | undefined {
  const page = legacyPages.get(pathname.replace(/\/+$/, "").toLowerCase())
  if (page) return page

  const [, area, ...segments] = pathname.split("/")
  const legacyArea = `/${area?.toLowerCase()}`
  const base = legacyAreas.get(legacyArea)
  if (!base) return

  if (legacyArea === LEGACY_CUSTOMER_BASE) {
    const [qrCode, ...screen] = segments
    if (!qrCode) return

    // Keep the QR code exactly as it appeared in the printed link.
    return [
      base,
      qrCode,
      ...screen.map((segment) => customerSegments.get(segment.toLowerCase()) ?? segment),
    ].join("/")
  }

  return [
    base,
    ...segments.map((segment) => staffSegments.get(segment.toLowerCase()) ?? segment),
  ].join("/")
}

/**
 * Kiểu dữ liệu cho màn hình Cấu hình (restaurant-admin)
 * CHỈ cấp NHÀ HÀNG — cấu hình riêng của 1 chi nhánh (giờ giấc/TK ngân hàng/tự huỷ phiên,
 * và VAT/phí dịch vụ/ngưỡng chiết khấu/MST riêng) nằm ở trang "Cấu hình chi nhánh".
 * Căn cứ: FR-ADM-03, QĐ-20 (câu #20).
 */

/** Đúng 5 trường `PUT /restaurants/{id}` nhận và in lên hoá đơn (FR-ADM-03). */
export interface RestaurantInfoConfig {
  restaurantName: string
  taxCode: string
  address: string
  phone: string
  /** URL Cloudinary sau khi upload; rỗng = chưa có logo, hiện chữ cái đầu thay thế. */
  logoUrl: string
}

/**
 * Thuế & phí — **chỉ để xem**.
 *
 * QĐ-20 (câu #20): VAT và phí dịch vụ thuộc CẤP CHI NHÁNH (FR-BRN-02 nhóm 2, BR-08 "cấu hình
 * CỦA CHI NHÁNH"), không phải cấp nhà hàng. Trang này chỉ nêu con số mặc định hệ thống dùng khi
 * tạo chi nhánh mới, kèm đường dẫn sang đúng nơi sửa được.
 */
export interface DefaultTaxAndFee {
  vatPercent: string
  serviceFeePercent: string
  vatAppliedOnServiceFee: boolean
}

import { Outlet } from "react-router-dom"

/**
 * Layout cho Khách hàng — Thích ứng linh động với toàn bộ các thiết bị (iPhone, Android, Tablet, Desktop).
 *
 * Responsive:
 * - `min-h-dvh`: theo đúng chiều cao khả dụng trên mobile (hỗ trợ thanh địa chỉ ẩn/hiện).
 * - `w-full`: 100% full-width trên mọi thiết bị di động, không bị giới hạn cứng max-w-md.
 * - Các trang con có thể tràn viền header/banner 100% và co giãn nội dung tối ưu theo từng kích thước màn hình.
 * - `env(safe-area-inset-*)`: khoảng an toàn cho notch / home bar (iOS).
 */
export default function CustomerLayout() {
  return (
    <div
      className="flex min-h-dvh w-full flex-col bg-surface-page"
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <Outlet />
    </div>
  )
}

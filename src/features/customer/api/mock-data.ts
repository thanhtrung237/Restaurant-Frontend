/**
 * Dữ liệu mẫu cho luồng Khách hàng (mobile, quét QR tại bàn).
 * TODO(api): thay các hàm bên dưới bằng gọi API thật khi có backend:
 *   - GET /api/dining-tables/by-qr/:qrCode  -> getTableInfoByQrCode
 *   - POST /api/table-sessions/open-request -> gửi yêu cầu mở bàn
 *   - GET /api/table-sessions/status?qrCode= -> poll trạng thái chờ xác nhận
 */

export interface CustomerTableInfo {
  restaurantName: string
  branchName: string
  tableName: string
}

/** Tra cứu thông tin NH/chi nhánh/bàn theo mã QR — hiện dùng dữ liệu mẫu cố định. */
export function getTableInfoByQrCode(_qrCode: string): CustomerTableInfo {
  return {
    restaurantName: "Nhà hàng Phở Việt",
    branchName: "Chi nhánh Quận 1",
    tableName: "Bàn B01",
  }
}
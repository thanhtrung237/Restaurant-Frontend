/**
 * Danh sách ngân hàng dùng cho mã QR chuyển khoản (FR-PAY-03).
 *
 * `code` là thứ ghi vào `Branch.bankName` và gửi lên BE. BE (`InvoiceServiceImpl
 * .normalizeBankId`) đổi giá trị này thành mã ngân hàng của VietQR rồi ghép vào URL
 * `https://img.vietqr.io/image/<mã>-<số TK>-compact2.png`.
 *
 * ⚠️ KHÔNG mở rộng danh sách này một mình. `normalizeBankId` chỉ nhận đúng 13 mã dưới đây;
 * giá trị lạ rơi vào nhánh `default` và được ghép thẳng vào URL, tạo ra ảnh QR hỏng mà
 * KHÔNG báo lỗi. Muốn thêm ngân hàng thì BE phải bổ sung trước — xem `docs/be-issues.md`.
 *
 * Vì vậy ô chọn ngân hàng phải là DROPDOWN, không cho gõ tự do.
 */
export interface BankOption {
  /** Mã lưu xuống `Branch.bankName` và BE map sang mã VietQR. */
  code: string
  /** Tên hiển thị cho người dùng. */
  name: string
}

export const BANK_OPTIONS: readonly BankOption[] = [
  { code: "VCB", name: "Vietcombank" },
  { code: "TCB", name: "Techcombank" },
  { code: "MB", name: "MB Bank" },
  { code: "ACB", name: "ACB" },
  { code: "VPB", name: "VPBank" },
  { code: "BIDV", name: "BIDV" },
  { code: "CTG", name: "VietinBank" },
  { code: "AGR", name: "Agribank" },
  { code: "TPB", name: "TPBank" },
  { code: "STB", name: "Sacombank" },
  { code: "OCB", name: "OCB" },
  { code: "MSB", name: "MSB" },
  { code: "SHB", name: "SHB" },
]

/**
 * Đổi mã ngân hàng sang tên hiển thị.
 *
 * Dữ liệu cũ có thể đang lưu tên đầy đủ ("Vietcombank") hoặc một giá trị ngoài danh sách.
 * Khi đó trả về nguyên giá trị thay vì rỗng — màn thanh toán không được vỡ chỉ vì dữ liệu
 * chưa chuẩn hoá.
 */
export function getBankLabel(code: string | null | undefined): string {
  if (!code) return ""
  const normalized = code.trim().toUpperCase()
  return BANK_OPTIONS.find((b) => b.code === normalized)?.name ?? code
}

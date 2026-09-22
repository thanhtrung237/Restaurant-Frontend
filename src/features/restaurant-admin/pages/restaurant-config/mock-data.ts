import type { DefaultTaxAndFee } from "./types"

/**
 * Con số mặc định hệ thống dùng khi TẠO CHI NHÁNH MỚI.
 *
 * Trước đây file này giữ dữ liệu giả cho cả trang Cấu hình (tên nhà hàng, MST, danh sách vai
 * trò). Nay trang đã nối API thật nên chỉ còn đúng phần này — và nó **không phải dữ liệu giả**,
 * mà là hằng số mặc định:
 *
 *  - VAT 8% và phí dịch vụ 5% khớp `data.sql` khi khởi tạo chi nhánh;
 *  - "phí dịch vụ chịu VAT" = bật, theo QĐ-17 (câu #7).
 *
 * Sửa thật sự cho từng chi nhánh làm ở trang **Cấu hình chi nhánh · Thuế & phí** (FR-BRN-02
 * nhóm 2). Muốn chỉnh chính con số mặc định này thì phải thêm cột ở cấp nhà hàng — thuộc
 * **đợt đổi schema** (`docs/todo.md` mục 25).
 */
export const DEFAULT_BRANCH_TAX_AND_FEE: DefaultTaxAndFee = {
  vatPercent: "8",
  serviceFeePercent: "5",
  vatAppliedOnServiceFee: true,
}

/**
 * Tầng API dùng chung — mỗi file tương ứng 1 Controller phía backend.
 *
 * Mỗi file gồm 2 lớp:
 * 1. Hàm gọi endpoint thuần (`getBranch`, `createOrder`, ...) — không phụ thuộc React,
 *    dùng được cả ngoài component (vd trong Zustand store, trong loader).
 * 2. Hook React Query (`useBranch`, `useCreateOrder`, ...) — bọc thêm cache + invalidate.
 *
 * Các `features/<feature>/api/index.ts` chỉ re-export lại phần mà feature đó dùng,
 * để nhìn vào là biết 1 màn hình chạm tới những endpoint nào.
 *
 * Endpoint BE chưa có (Báo cáo, Cấu hình nền tảng, Gói & Thanh toán) cố tình KHÔNG có
 * file ở đây — xem ghi chú ở `features/branch-manager/api` và `features/platform-admin/api`.
 */
export * from "./auth.api"
export * from "./accounts.api"
export * from "./assignments.api"
export * from "./roles.api"
export * from "./restaurants.api"
export * from "./branches.api"
export * from "./branch-menu.api"
export * from "./branch-dish-stocks.api"
export * from "./areas.api"
export * from "./tables.api"
export * from "./table-sessions.api"
export * from "./categories.api"
export * from "./dishes.api"
export * from "./dish-overrides.api"
export * from "./option-groups.api"
export * from "./option-items.api"
export * from "./dish-option-groups.api"
export * from "./orders.api"
export * from "./order-details.api"
export * from "./invoices.api"
export * from "./payments.api"
export * from "./manual-discounts.api"
export * from "./promotions.api"
export * from "./audit-logs.api"
export * from "./upload.api"

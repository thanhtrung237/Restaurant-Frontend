import { lazy } from "react"
import { createBrowserRouter, Navigate, useLocation } from "react-router-dom"
import { APP_ROLE } from "@/config/roles"
import RequireAuth from "./guards/RequireAuth"
import RequireRole from "./guards/RequireRole"
import RequireCashierWaiter from "./guards/RequireCashierWaiter"
import RequirePermission from "./guards/RequirePermission"
import RedirectIfAuthenticated from "./guards/RedirectIfAuthenticated"
import RequireTableSession from "./guards/RequireTableSession"

// ---- Layouts ----
import AuthLayout from "@/layouts/AuthLayout"
import CustomerLayout from "@/layouts/CustomerLayout"
import StaffLayout from "@/layouts/StaffLayout"
import PlatformLayout from "@/layouts/PlatformLayout"

// ---- Fallback ----
import NotFoundPage from "./fallback/NotFoundPage"
import RoleHomeRedirect from "./RoleHomeRedirect"
import ForbiddenPage from "./fallback/ForbiddenPage"
import { FORBIDDEN_PATH } from "./post-login-target"
import { AUTH_PATHS, isPlatformHost } from "./paths/auth.paths"
import { CUSTOMER_PATHS } from "./paths/customer.paths"
import { getLegacyPathTarget } from "./legacy-paths"

// ---- Auth pages ----
const LoginPage = lazy(() => import("@/features/auth/pages/login"))
const ForgotPasswordPage = lazy(() => import("@/features/auth/pages/forgot-password"))
const FirstLoginPasswordPage = lazy(() => import("@/features/auth/pages/first-login-password"))

// ---- Customer pages (Mobile / Khách hàng) ----
const TableOpenQrPage = lazy(() => import("@/features/customer/pages/table-open-qr"))
const WaitingTableOpenPage = lazy(() => import("@/features/customer/pages/waiting-table-open"))
const MenuPage = lazy(() => import("@/features/customer/pages/menu"))
const SearchDishPage = lazy(() => import("@/features/customer/pages/search-dish"))
const DishDetailPage = lazy(() => import("@/features/customer/pages/dish-detail"))
const CartPage = lazy(() => import("@/features/customer/pages/cart"))
const OrderedItemsPage = lazy(() => import("@/features/customer/pages/ordered-items"))
const RequestBillPage = lazy(() => import("@/features/customer/pages/request-bill"))
const InvoicePage = lazy(() => import("@/features/customer/pages/invoice"))
const PaymentQrPage = lazy(() => import("@/features/customer/pages/payment-qr"))
const PaymentSuccessPage = lazy(() => import("@/features/customer/pages/payment-success"))
const PaymentFailedPage = lazy(() => import("@/features/customer/pages/payment-failed"))
const ReviewPage = lazy(() => import("@/features/customer/pages/review"))
const OrderRejectedPage = lazy(() => import("@/features/customer/pages/order-rejected"))

// ---- Vận hành sàn / bếp (dùng chung: Phục vụ, Thu ngân*, QL chi nhánh, Quản trị NH — mục 4.2) ----
// *Thu ngân chỉ dùng Sơ đồ bàn (xem tạm tính) và Chuyển/gộp bàn, không dùng các trang order/bếp.
const TableMapPage = lazy(() => import("@/features/shared/floor-ops/table-map"))
// Gọi món & Chế biến dùng chung UI với Bếp (KDS) — xem ghi chú trong kitchen-display/index.tsx
// OrderConfirmPage removed: items now go directly to KDS where kitchen staff confirms them
const OrderDetailPage = lazy(() => import("@/features/shared/floor-ops/order-detail"))
const AddDishPage = lazy(() => import("@/features/shared/floor-ops/add-dish"))
const KitchenDisplayPage = lazy(() => import("@/features/shared/floor-ops/kitchen-display"))
const TransferMergeTablePage = lazy(
  () => import("@/features/shared/floor-ops/transfer-merge-table"),
)

const InvoiceListPage = lazy(() => import("@/features/shared/invoices/InvoiceListPage"))
const QrTransferPaymentPage = lazy(() => import("@/features/cashier/pages/qr-transfer-payment"))
const EInvoicePage = lazy(() => import("@/features/cashier/pages/e-invoice"))
const CheckoutPage = lazy(() => import("@/features/cashier/pages/checkout"))

// ---- Branch manager pages (Desktop / Quản lý chi nhánh) ----
// "Chi nhánh" và "Cấu hình" dùng chung component với Quản trị NH — @/features/shared/branch-detail
const BranchManagerBranchDetailPage = lazy(
  () => import("@/features/branch-manager/pages/branch-detail"),
)
const BranchManagerBranchConfigPage = lazy(
  () => import("@/features/branch-manager/pages/branch-config"),
)
// Thực đơn dùng chung trang và giới hạn thao tác theo vai trò.
const BranchManagerMenuPage = lazy(
  () => import("@/features/restaurant-admin/pages/menu-management"),
)
const BranchManagerPromotionsPage = lazy(() => import("@/features/branch-manager/pages/promotions"))
const BranchManagerPromotionCreatePage = lazy(
  () => import("@/features/branch-manager/pages/promotion-create"),
)
const BranchManagerPromotionEditPage = lazy(
  () => import("@/features/branch-manager/pages/promotion-edit"),
)
const ManualDiscountPage = lazy(() => import("@/features/branch-manager/pages/manual-discount"))
const BranchReportPage = lazy(() => import("@/features/branch-manager/pages/branch-report"))
const RevenueByHourPage = lazy(() => import("@/features/branch-manager/pages/revenue-by-hour"))

// ---- Restaurant admin pages (Desktop / Quản trị nhà hàng) ----
const BranchListPage = lazy(() => import("@/features/restaurant-admin/pages/branch-list"))
const BranchDetailPage = lazy(() => import("@/features/restaurant-admin/pages/branch-detail"))
const BranchTaxFeePage = lazy(() => import("@/features/restaurant-admin/pages/branch-tax-fee"))
const RestaurantBranchConfigPage = lazy(
  () => import("@/features/restaurant-admin/pages/branch-config"),
)
const StaffManagementPage = lazy(() => import("@/features/restaurant-admin/pages/staff-management"))
const BranchStaffPage = lazy(() => import("@/features/branch-manager/pages/branch-staff"))
const RolesPermissionsPage = lazy(
  () => import("@/features/restaurant-admin/pages/roles-permissions"),
)
const CategoryManagementPage = lazy(
  () => import("@/features/restaurant-admin/pages/category-management"),
)
const MenuManagementPage = lazy(() => import("@/features/restaurant-admin/pages/menu-management"))
const PromotionsPage = lazy(() => import("@/features/restaurant-admin/pages/promotions"))
const PromotionCreatePage = lazy(() => import("@/features/restaurant-admin/pages/promotion-create"))
const PromotionEditPage = lazy(() => import("@/features/restaurant-admin/pages/promotion-edit"))
const RestaurantAuditLogPage = lazy(() => import("@/features/restaurant-admin/pages/audit-log"))
const RestaurantReportsPage = lazy(() => import("@/features/restaurant-admin/pages/reports"))
const RestaurantConfigPage = lazy(
  () => import("@/features/restaurant-admin/pages/restaurant-config"),
)

// ---- Platform admin pages (Desktop / Quản trị nền tảng) ----
const PlatformDashboardPage = lazy(() => import("@/features/platform-admin/pages/dashboard"))
const RestaurantListPage = lazy(() => import("@/features/platform-admin/pages/restaurant-list"))
const RestaurantDetailPage = lazy(() => import("@/features/platform-admin/pages/restaurant-detail"))
const SystemAuditLogPage = lazy(() => import("@/features/platform-admin/pages/system-audit-log"))

/**
 * Cây route của toàn hệ thống. Mỗi nhánh dưới đây tương ứng 1-1 với 1 file
 * trong app/router/paths/*.paths.ts — path ở đây và path constant PHẢI khớp nhau.
 */
export const router = createBrowserRouter([
  // ================= AUTH (không cần đăng nhập) =================
  {
    element: <AuthLayout />,
    children: [
      // Đang đăng nhập mà vào /login ⇒ về thẳng trang chủ của vai trò, không hiện form
      // trống làm người dùng tưởng mình bị đăng xuất.
      {
        element: <RedirectIfAuthenticated />,
        children: [
          {
            path: AUTH_PATHS.LOGIN,
            element: isPlatformHost() ? (
              <Navigate to={AUTH_PATHS.PLATFORM_LOGIN} replace />
            ) : (
              <LoginPage key="staff" />
            ),
          },
          { path: AUTH_PATHS.PLATFORM_LOGIN, element: <LoginPage key="platform" platform /> },
        ],
      },
      { path: AUTH_PATHS.FORGOT_PASSWORD, element: <ForgotPasswordPage /> },
      { path: AUTH_PATHS.FIRST_LOGIN_PASSWORD, element: <FirstLoginPasswordPage /> },
    ],
  },

  // ================= KHÁCH HÀNG (mobile, theo mã QR bàn) =================
  {
    path: CUSTOMER_PATHS.TABLE_OPEN_QR,
    element: <CustomerLayout />,
    children: [
      { index: true, element: <TableOpenQrPage /> }, // CUSTOMER_PATHS.TABLE_OPEN_QR
      { path: "waiting-for-table", element: <WaitingTableOpenPage /> }, // WAITING_TABLE_OPEN
      { path: "rejected", element: <OrderRejectedPage /> }, // REJECTED
      {
        element: <RequireTableSession />, // các route bên dưới cần phiên ĐANG PHỤC VỤ
        children: [
          { path: "menu", element: <MenuPage /> }, // MENU
          { path: "menu/search", element: <SearchDishPage /> }, // SEARCH_DISH
          { path: "dish/:dishId", element: <DishDetailPage /> }, // DISH_DETAIL
          { path: "cart", element: <CartPage /> }, // CART
          { path: "ordered-items", element: <OrderedItemsPage /> }, // ORDERED_ITEMS
          { path: "request-bill", element: <RequestBillPage /> }, // REQUEST_BILL
          { path: "invoice", element: <InvoicePage /> }, // INVOICE
          { path: "payment-qr", element: <PaymentQrPage /> }, // PAYMENT_QR
          { path: "payment-success", element: <PaymentSuccessPage /> }, // PAYMENT_SUCCESS
          { path: "payment-failed", element: <PaymentFailedPage /> }, // PAYMENT_FAILED
          { path: "review", element: <ReviewPage /> }, // REVIEW
        ],
      },
    ],
  },

  // ================= NHÂN VIÊN (cần đăng nhập) =================
  {
    element: <RequireAuth />,
    children: [
      // ---- Phục vụ ----
      {
        element: <RequireRole allow={[APP_ROLE.WAITER]} />,
        children: [
          {
            path: "/waiter",
            element: <StaffLayout />,
            children: [
              { index: true, element: <Navigate to="table-map" replace /> },
              { path: "table-map", element: <TableMapPage /> }, // WAITER_PATHS.TABLE_MAP
              // Màn "Mở bàn" riêng đã bị gỡ: không nơi nào điều hướng tới, và store nuôi nó không
              // ai ghi vào nên modal bên trong không bao giờ hiện. Mở bàn thật làm bằng
              // OpenTableModal ngay trên Sơ đồ bàn. Giữ redirect cho URL cũ (bookmark, lịch sử)
              // để người dùng về đúng Sơ đồ bàn của vai trò, không rơi ra ngoài layout.
              {
                path: "table-map/:tableId/open-table",
                element: <Navigate to="/waiter/table-map" replace />,
              },
              { path: "table-map/takeaway/:orderId?", element: <AddDishPage takeaway /> },
              { path: "orders-and-prep", element: <KitchenDisplayPage /> }, // ORDER_AND_PREP -> dùng chung UI Bếp (KDS)
              // ORDER_CONFIRM route removed: items now go directly to KDS where kitchen staff confirms them (PENDING → PREPARING)
              { path: "order/:orderId", element: <OrderDetailPage /> }, // ORDER_DETAIL
              { path: "order/:orderId/add-items", element: <AddDishPage /> }, // ADD_DISH
              { path: "kitchen", element: <KitchenDisplayPage /> }, // KITCHEN_DISPLAY
              { path: "transfer-merge-tables", element: <TransferMergeTablePage /> }, // TRANSFER_MERGE_TABLE
              // Phục vụ KHÔNG có quyền "Xem báo cáo" / "Quản lý nhân viên" (mục 4.2, 4.3) — đã bỏ 2 route này.
            ],
          },
        ],
      },

      // ---- Thu ngân ----
      {
        element: <RequireRole allow={[APP_ROLE.CASHIER]} />,
        children: [
          {
            path: "/cashier",
            element: <StaffLayout />,
            children: [
              { index: true, element: <Navigate to="table-map" replace /> },
              { path: "table-map", element: <TableMapPage /> }, // CASHIER_PATHS.TABLE_MAP — "Xem tạm tính của bàn"
              {
                element: <RequireCashierWaiter />,
                children: [
                  { path: "orders-and-prep", element: <KitchenDisplayPage /> },
                  { path: "order/:orderId", element: <OrderDetailPage /> },
                  { path: "order/:orderId/add-items", element: <AddDishPage /> },
                ],
              },
              { path: "table-map/takeaway/:orderId?", element: <AddDishPage takeaway /> },
              { path: "transfer-merge-tables", element: <TransferMergeTablePage /> }, // CASHIER_PATHS.TRANSFER_MERGE_TABLE — "Chuyển/gộp bàn" (X)
              { path: "checkout/:tableSessionId", element: <CheckoutPage /> }, // CASHIER_PATHS.CHECKOUT — cũng là "Đóng phiên bàn"
              {
                path: "checkout/:tableSessionId/qr-transfer",
                element: <QrTransferPaymentPage />,
              }, // QR_TRANSFER_PAYMENT
              { path: "e-invoices/:invoiceId", element: <EInvoicePage /> }, // E_INVOICE
              { path: "invoices", element: <InvoiceListPage /> }, // CASHIER_PATHS.INVOICES
            ],
          },
        ],
      },

      // ---- Quản lý chi nhánh ----
      // Có đủ 8 phân hệ chính như Quản trị NH nhưng ở PHẠM VI CHI NHÁNH của mình
      // (bảng phân quyền theo màn hình — xem chú thích trong config/permissions.ts).
      {
        element: <RequireRole allow={[APP_ROLE.BRANCH_MANAGER]} />,
        children: [
          {
            path: "/branch-manager",
            element: <StaffLayout />,
            children: [
              { index: true, element: <Navigate to="table-map" replace /> },
              // Vận hành sàn/bếp — QL chi nhánh có X cho toàn bộ nhóm này (mục 4.2), dùng chung
              // component với Phục vụ / Quản trị NH (@/features/shared/floor-ops).
              { path: "table-map", element: <TableMapPage /> }, // BRANCH_MANAGER_PATHS.TABLE_MAP
              { path: "table-map/takeaway/:orderId?", element: <AddDishPage takeaway /> },
              // Màn "Mở bàn" riêng đã bị gỡ: không nơi nào điều hướng tới, và store nuôi nó không
              // ai ghi vào nên modal bên trong không bao giờ hiện. Mở bàn thật làm bằng
              // OpenTableModal ngay trên Sơ đồ bàn. Giữ redirect cho URL cũ (bookmark, lịch sử)
              // để người dùng về đúng Sơ đồ bàn của vai trò, không rơi ra ngoài layout.
              {
                path: "table-map/:tableId/open-table",
                element: <Navigate to="/branch-manager/table-map" replace />,
              },
              { path: "orders-and-prep", element: <KitchenDisplayPage /> }, // ORDER_AND_PREP -> dùng chung UI Bếp (KDS)
              // ORDER_CONFIRM route removed: items now go directly to KDS where kitchen staff confirms them (PENDING → PREPARING)
              { path: "order/:orderId", element: <OrderDetailPage /> }, // ORDER_DETAIL
              { path: "order/:orderId/add-items", element: <AddDishPage /> }, // ADD_DISH
              { path: "kitchen", element: <KitchenDisplayPage /> }, // KITCHEN_DISPLAY
              { path: "transfer-merge-tables", element: <TransferMergeTablePage /> }, // TRANSFER_MERGE_TABLE
              // 8 phân hệ chính — phạm vi chi nhánh của mình
              // Bang 4.2 "Thu tien, dong ban": QL chi nhanh cung duoc dong ban.
              { path: "checkout/:tableSessionId", element: <CheckoutPage /> }, // CHECKOUT
              {
                path: "checkout/:tableSessionId/qr-transfer",
                element: <QrTransferPaymentPage />,
              },
              { path: "menu", element: <BranchManagerMenuPage /> }, // BRANCH_MENU
              {
                element: <RequirePermission permission="BRANCH_PROMOTIONS_VIEW" />,
                children: [{ path: "promotions", element: <BranchManagerPromotionsPage /> }],
              },
              // Giữ quyền quản lý chương trình tách biệt với quyền tra cứu.
              {
                element: <RequirePermission permission="PROMOTIONS" />,
                children: [
                  {
                    path: "promotions/new",
                    element: <BranchManagerPromotionCreatePage />,
                  }, // PROMOTION_CREATE
                  {
                    path: "promotions/:id/edit",
                    element: <BranchManagerPromotionEditPage />,
                  }, // PROMOTION_EDIT
                ],
              },
              { path: "reports", element: <BranchReportPage /> }, // REPORT — không có tab "So sánh chi nhánh"
              {
                path: "reports/hourly-revenue",
                element: <RevenueByHourPage />,
              }, // REVENUE_BY_HOUR
              { path: "branches", element: <BranchManagerBranchDetailPage /> }, // BRANCH — thẳng vào chi tiết chi nhánh mình (3 tab)
              // KHÔNG có màn "Nhân viên" cho QL chi nhánh: Bảng 4.3 để TRỐNG ô "Quản lý nhân
              // viên" của vai trò này, nên màn đó đã bị gỡ hẳn ở Phần B2.
              //
              // Giữ lại một redirect cho URL cũ: người đã lưu bookmark sẽ về Sơ đồ bàn thay vì
              // rơi vào trang 404 nằm ngoài layout (không có menu để đi tiếp).
              { path: "staff", element: <BranchStaffPage /> },
              { path: "settings", element: <BranchManagerBranchConfigPage /> }, // CONFIG — chỉ cấu hình chi nhánh mình
              { path: "manual-discount", element: <ManualDiscountPage /> }, // MANUAL_DISCOUNT
              { path: "audit-log", element: <RestaurantAuditLogPage /> }, // AUDIT_LOG (tương thích ngược) — chỉ đọc (R)
              { path: "roles-permissions", element: <RolesPermissionsPage /> },
              { path: "invoices", element: <InvoiceListPage /> }, // BRANCH_MANAGER_PATHS.INVOICES
              { path: "invoices/:invoiceId", element: <EInvoicePage /> }, // BRANCH_MANAGER_PATHS.E_INVOICE
            ],
          },
        ],
      },

      // ---- Quản trị nhà hàng ----
      {
        element: <RequireRole allow={[APP_ROLE.RESTAURANT_ADMIN]} />,
        children: [
          {
            path: "/restaurant-admin",
            element: <StaffLayout />,
            children: [
              { index: true, element: <Navigate to="table-map" replace /> },
              { path: "table-map", element: <TableMapPage /> }, // SƠ ĐỒ BÀN
              { path: "table-map/takeaway/:orderId?", element: <AddDishPage takeaway /> },
              // Màn "Mở bàn" riêng đã bị gỡ: không nơi nào điều hướng tới, và store nuôi nó không
              // ai ghi vào nên modal bên trong không bao giờ hiện. Mở bàn thật làm bằng
              // OpenTableModal ngay trên Sơ đồ bàn. Giữ redirect cho URL cũ (bookmark, lịch sử)
              // để người dùng về đúng Sơ đồ bàn của vai trò, không rơi ra ngoài layout.
              {
                path: "table-map/:tableId/open-table",
                element: <Navigate to="/restaurant-admin/table-map" replace />,
              },
              { path: "orders-and-prep", element: <KitchenDisplayPage /> }, // GỌI MÓN & CHẾ BIẾN -> dùng chung UI Bếp (KDS)
              // ORDER_CONFIRM route removed: items now go directly to KDS where kitchen staff confirms them (PENDING → PREPARING)
              { path: "order/:orderId", element: <OrderDetailPage /> },
              { path: "order/:orderId/add-items", element: <AddDishPage /> }, // ADD_DISH
              { path: "kitchen", element: <KitchenDisplayPage /> },
              { path: "transfer-merge-tables", element: <TransferMergeTablePage /> },
              // Bang 4.2 "Thu tien, dong ban": Quan tri nha hang cung duoc dong ban.
              { path: "checkout/:tableSessionId", element: <CheckoutPage /> }, // CHECKOUT
              {
                path: "checkout/:tableSessionId/qr-transfer",
                element: <QrTransferPaymentPage />,
              },
              { path: "invoices/:invoiceId", element: <EInvoicePage /> },
              {
                element: <RequirePermission permission="INVOICES" />,
                children: [
                  { path: "invoices", element: <InvoiceListPage /> },
                  { path: "invoices/lookup/:invoiceId", element: <EInvoicePage readOnly /> },
                ],
              },
              { path: "menu", element: <MenuManagementPage /> }, // THỰC ĐƠN
              { path: "promotions", element: <PromotionsPage /> }, // KHUYẾN MÃI
              { path: "promotions/new", element: <PromotionCreatePage /> },
              { path: "promotions/:id/edit", element: <PromotionEditPage /> },
              { path: "reports", element: <RestaurantReportsPage /> }, // BÁO CÁO (đủ 3 tab, kể cả So sánh chi nhánh)
              { path: "branches", element: <BranchListPage /> }, // CHI NHÁNH — danh sách dạng card
              { path: "branches/:branchId", element: <BranchDetailPage /> }, // chi tiết 1 chi nhánh (3 tab)
              {
                path: "branches/:branchId/settings",
                element: <RestaurantBranchConfigPage />,
              }, // cấu hình 1 chi nhánh bất kỳ — nhóm 1 (FR-BRN-02)
              {
                path: "branches/:branchId/taxes-fees",
                element: <BranchTaxFeePage />,
              }, // BRANCH_TAX_FEE — nhóm 2: VAT, phí DV, ngưỡng chiết khấu, MST riêng (CHỈ Quản trị NH)
              {
                path: "branches/:branchId/out-of-stock",
                lazy: async () => {
                  const { default: Component } =
                    await import("@/features/restaurant-admin/pages/out-of-stock")
                  return { Component }
                },
              }, // OUT_OF_STOCK — Danh sách món đang hết hàng (GĐ2)
              { path: "staff", element: <StaffManagementPage /> }, // NHÂN VIÊN (3 tab)
              { path: "settings", element: <RestaurantConfigPage /> }, // CẤU HÌNH — chỉ cấp nhà hàng
              { path: "roles-permissions", element: <RolesPermissionsPage /> },
              { path: "categories", element: <CategoryManagementPage /> },
              { path: "audit-log", element: <RestaurantAuditLogPage /> },
            ],
          },
        ],
      },

      // ---- Quản trị nền tảng ----
      {
        element: <RequireRole allow={[APP_ROLE.PLATFORM_ADMIN]} />,
        children: [
          {
            path: "/platform-admin",
            element: <PlatformLayout />,
            children: [
              { index: true, element: <PlatformDashboardPage /> }, // PLATFORM_ADMIN_PATHS.DASHBOARD
              { path: "restaurants", element: <RestaurantListPage /> }, // RESTAURANT_LIST
              {
                path: "restaurants/:restaurantId",
                element: <RestaurantDetailPage />,
              }, // RESTAURANT_DETAIL
              { path: "settings", element: <Navigate to="/platform-admin" replace /> },
              { path: "system-audit-log", element: <SystemAuditLogPage /> }, // SYSTEM_AUDIT_LOG
            ],
          },
        ],
      },
    ],
  },

  // ================= FALLBACK =================
  { path: FORBIDDEN_PATH, element: <ForbiddenPage /> },
  /*
   * "/" đưa về trang chủ THEO VAI TRÒ, chỉ về /login khi chưa đăng nhập.
   *
   * Trước đây "/" redirect cứng sang /dang-nhap, nên mọi điều hướng lỡ rơi vào "/" đều ném
   * người đang làm việc ra màn đăng nhập. `RoleHomeRedirect` viết sẵn cho việc này từ trước
   * nhưng chưa được gắn vào route nào.
   */
  { path: "/", element: <RoleHomeRedirect /> },
  { path: "*", element: <LegacyRouteRedirect /> },
])

function LegacyRouteRedirect() {
  const location = useLocation()
  const pathname = getLegacyPathTarget(location.pathname)
  if (!pathname) return <NotFoundPage />

  return (
    <Navigate
      to={{ pathname, search: location.search, hash: location.hash }}
      state={location.state}
      replace
    />
  )
}

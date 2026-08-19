import { lazy } from "react";
import { createBrowserRouter, Navigate } from "react-router-dom";
import { APP_ROLE } from "@/config/roles";
import RequireAuth from "./guards/RequireAuth";
import RequireRole from "./guards/RequireRole";
import RequireTableSession from "./guards/RequireTableSession";

// ---- Layouts ----
import AuthLayout from "@/layouts/AuthLayout";
import CustomerLayout from "@/layouts/CustomerLayout";
import StaffLayout from "@/layouts/StaffLayout";
import PlatformLayout from "@/layouts/PlatformLayout";

// ---- Fallback ----
import NotFoundPage from "./fallback/NotFoundPage";
import ForbiddenPage from "./fallback/ForbiddenPage";

// ---- Auth pages ----
const LoginPage = lazy(() => import("@/features/auth/pages/login"));
const ForgotPasswordPage = lazy(
  () => import("@/features/auth/pages/forgot-password"),
);
const FirstLoginPasswordPage = lazy(
  () => import("@/features/auth/pages/first-login-password"),
);

// ---- Customer pages (Mobile / Khách hàng) ----
const TableOpenQrPage = lazy(
  () => import("@/features/customer/pages/table-open-qr"),
);
const WaitingTableOpenPage = lazy(
  () => import("@/features/customer/pages/waiting-table-open"),
);
const MenuPage = lazy(() => import("@/features/customer/pages/menu"));
const SearchDishPage = lazy(
  () => import("@/features/customer/pages/search-dish"),
);
const DishDetailPage = lazy(
  () => import("@/features/customer/pages/dish-detail"),
);
const CartPage = lazy(() => import("@/features/customer/pages/cart"));
const OrderedItemsPage = lazy(
  () => import("@/features/customer/pages/ordered-items"),
);
const RequestBillPage = lazy(
  () => import("@/features/customer/pages/request-bill"),
);
const InvoicePage = lazy(() => import("@/features/customer/pages/invoice"));
const PaymentQrPage = lazy(
  () => import("@/features/customer/pages/payment-qr"),
);
const PaymentSuccessPage = lazy(
  () => import("@/features/customer/pages/payment-success"),
);
const PaymentFailedPage = lazy(
  () => import("@/features/customer/pages/payment-failed"),
);
const ReviewPage = lazy(() => import("@/features/customer/pages/review"));
const OrderRejectedPage = lazy(
  () => import("@/features/customer/pages/order-rejected"),
);

// ---- Vận hành sàn / bếp (dùng chung: Phục vụ, Thu ngân*, QL chi nhánh, Quản trị NH — mục 4.2) ----
// *Thu ngân chỉ dùng Sơ đồ bàn (xem tạm tính) và Chuyển/gộp bàn, không dùng các trang order/bếp.
const TableMapPage = lazy(
  () => import("@/features/shared/floor-ops/table-map"),
);
const OpenTablePage = lazy(
  () => import("@/features/shared/floor-ops/open-table"),
);
// Gọi món & Chế biến dùng chung UI với Bếp (KDS) — xem ghi chú trong kitchen-display/index.tsx
const OrderConfirmPage = lazy(
  () => import("@/features/shared/floor-ops/order-confirm"),
);
const OrderDetailPage = lazy(
  () => import("@/features/shared/floor-ops/order-detail"),
);
const AddDishPage = lazy(
  () => import("@/features/shared/floor-ops/add-dish"),
);
const KitchenDisplayPage = lazy(
  () => import("@/features/shared/floor-ops/kitchen-display"),
);
const TransferMergeTablePage = lazy(
  () => import("@/features/shared/floor-ops/transfer-merge-table"),
);

// ---- Cashier pages (Desktop / Thu ngân) ----
const CheckoutPage = lazy(() => import("@/features/cashier/pages/checkout"));
const QrTransferPaymentPage = lazy(
  () => import("@/features/cashier/pages/qr-transfer-payment"),
);
const EInvoicePage = lazy(() => import("@/features/cashier/pages/e-invoice"));

// ---- Branch manager pages (Desktop / Quản lý chi nhánh) ----
// "Chi nhánh" và "Cấu hình" dùng chung component với Quản trị NH — @/features/shared/branch-detail
const BranchManagerBranchDetailPage = lazy(
  () => import("@/features/branch-manager/pages/branch-detail"),
);
const BranchManagerBranchConfigPage = lazy(
  () => import("@/features/branch-manager/pages/branch-config"),
);
// "Thực đơn" dùng chung nguyên component của Quản trị NH (không phân biệt phạm vi trong UI mock)
const BranchManagerMenuPage = lazy(
  () => import("@/features/restaurant-admin/pages/menu-management"),
);
const BranchManagerPromotionsPage = lazy(
  () => import("@/features/branch-manager/pages/promotions"),
);
const BranchManagerPromotionCreatePage = lazy(
  () => import("@/features/branch-manager/pages/promotion-create"),
);
const BranchManagerStaffPage = lazy(
  () => import("@/features/branch-manager/pages/staff"),
);
const ManualDiscountPage = lazy(
  () => import("@/features/branch-manager/pages/manual-discount"),
);
const BranchReportPage = lazy(
  () => import("@/features/branch-manager/pages/branch-report"),
);
const RevenueByHourPage = lazy(
  () => import("@/features/branch-manager/pages/revenue-by-hour"),
);

// ---- Restaurant admin pages (Desktop / Quản trị nhà hàng) ----
const BranchListPage = lazy(
  () => import("@/features/restaurant-admin/pages/branch-list"),
);
const BranchDetailPage = lazy(
  () => import("@/features/restaurant-admin/pages/branch-detail"),
);
const RestaurantBranchConfigPage = lazy(
  () => import("@/features/restaurant-admin/pages/branch-config"),
);
const StaffManagementPage = lazy(
  () => import("@/features/restaurant-admin/pages/staff-management"),
);
const RolesPermissionsPage = lazy(
  () => import("@/features/restaurant-admin/pages/roles-permissions"),
);
const CategoryManagementPage = lazy(
  () => import("@/features/restaurant-admin/pages/category-management"),
);
const MenuManagementPage = lazy(
  () => import("@/features/restaurant-admin/pages/menu-management"),
);
const PromotionsPage = lazy(
  () => import("@/features/restaurant-admin/pages/promotions"),
);
const PromotionCreatePage = lazy(
  () => import("@/features/restaurant-admin/pages/promotion-create"),
);
const RestaurantAuditLogPage = lazy(
  () => import("@/features/restaurant-admin/pages/audit-log"),
);
const RestaurantReportsPage = lazy(
  () => import("@/features/restaurant-admin/pages/reports"),
);
const RestaurantConfigPage = lazy(
  () => import("@/features/restaurant-admin/pages/restaurant-config"),
);

// ---- Platform admin pages (Desktop / Quản trị nền tảng) ----
const PlatformDashboardPage = lazy(
  () => import("@/features/platform-admin/pages/dashboard"),
);
const RestaurantListPage = lazy(
  () => import("@/features/platform-admin/pages/restaurant-list"),
);
const RestaurantDetailPage = lazy(
  () => import("@/features/platform-admin/pages/restaurant-detail"),
);
const PlatformConfigPage = lazy(
  () => import("@/features/platform-admin/pages/platform-config"),
);
const SystemAuditLogPage = lazy(
  () => import("@/features/platform-admin/pages/system-audit-log"),
);
const SubscriptionBillingPage = lazy(
  () => import("@/features/platform-admin/pages/subscription-billing"),
);

/**
 * Cây route của toàn hệ thống. Mỗi nhánh dưới đây tương ứng 1-1 với 1 file
 * trong app/router/paths/*.paths.ts — path ở đây và path constant PHẢI khớp nhau.
 */
export const router = createBrowserRouter([
  // ================= AUTH (không cần đăng nhập) =================
  {
    element: <AuthLayout />,
    children: [
      { path: "/dang-nhap", element: <LoginPage /> }, // AUTH_PATHS.LOGIN
      { path: "/quen-mat-khau", element: <ForgotPasswordPage /> }, // AUTH_PATHS.FORGOT_PASSWORD
      { path: "/doi-mat-khau-lan-dau", element: <FirstLoginPasswordPage /> }, // AUTH_PATHS.FIRST_LOGIN_PASSWORD
    ],
  },

  // ================= KHÁCH HÀNG (mobile, theo mã QR bàn) =================
  {
    path: "/ban/:qrCode",
    element: <CustomerLayout />,
    children: [
      { index: true, element: <TableOpenQrPage /> }, // CUSTOMER_PATHS.TABLE_OPEN_QR
      { path: "cho-mo-ban", element: <WaitingTableOpenPage /> }, // WAITING_TABLE_OPEN
      { path: "tu-choi", element: <OrderRejectedPage /> }, // REJECTED
      {
        element: <RequireTableSession />, // các route bên dưới cần phiên ĐANG PHỤC VỤ
        children: [
          { path: "thuc-don", element: <MenuPage /> }, // MENU
          { path: "thuc-don/tim-kiem", element: <SearchDishPage /> }, // SEARCH_DISH
          { path: "mon/:dishId", element: <DishDetailPage /> }, // DISH_DETAIL
          { path: "gio-hang", element: <CartPage /> }, // CART
          { path: "mon-da-goi", element: <OrderedItemsPage /> }, // ORDERED_ITEMS
          { path: "yeu-cau-tinh-tien", element: <RequestBillPage /> }, // REQUEST_BILL
          { path: "hoa-don", element: <InvoicePage /> }, // INVOICE
          { path: "thanh-toan-qr", element: <PaymentQrPage /> }, // PAYMENT_QR
          { path: "thanh-toan-thanh-cong", element: <PaymentSuccessPage /> }, // PAYMENT_SUCCESS
          { path: "thanh-toan-that-bai", element: <PaymentFailedPage /> }, // PAYMENT_FAILED
          { path: "danh-gia", element: <ReviewPage /> }, // REVIEW
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
            path: "/phuc-vu",
            element: <StaffLayout />,
            children: [
              { index: true, element: <Navigate to="so-do-ban" replace /> },
              { path: "so-do-ban", element: <TableMapPage /> }, // WAITER_PATHS.TABLE_MAP
              { path: "so-do-ban/:tableId/mo-ban", element: <OpenTablePage /> }, // OPEN_TABLE
              { path: "order-che-bien", element: <KitchenDisplayPage /> }, // ORDER_AND_PREP -> dùng chung UI Bếp (KDS)
              {
                path: "order-che-bien/:orderId/xac-nhan",
                element: <OrderConfirmPage />,
              }, // ORDER_CONFIRM
              { path: "order/:orderId", element: <OrderDetailPage /> }, // ORDER_DETAIL
              { path: "order/:orderId/them-mon", element: <AddDishPage /> }, // ADD_DISH
              { path: "bep", element: <KitchenDisplayPage /> }, // KITCHEN_DISPLAY
              { path: "chuyen-gop-ban", element: <TransferMergeTablePage /> }, // TRANSFER_MERGE_TABLE
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
            path: "/thu-ngan",
            element: <StaffLayout />,
            children: [
              { index: true, element: <Navigate to="so-do-ban" replace /> },
              { path: "so-do-ban", element: <TableMapPage /> }, // CASHIER_PATHS.TABLE_MAP — "Xem tạm tính của bàn"
              { path: "chuyen-gop-ban", element: <TransferMergeTablePage /> }, // CASHIER_PATHS.TRANSFER_MERGE_TABLE — "Chuyển/gộp bàn" (X)
              { path: "thanh-toan/:tableSessionId", element: <CheckoutPage /> }, // CASHIER_PATHS.CHECKOUT — cũng là "Đóng phiên bàn"
              {
                path: "thanh-toan/:tableSessionId/chuyen-khoan-qr",
                element: <QrTransferPaymentPage />,
              }, // QR_TRANSFER_PAYMENT
              { path: "hoa-don-dien-tu/:invoiceId", element: <EInvoicePage /> }, // E_INVOICE
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
            path: "/quan-ly-chi-nhanh",
            element: <StaffLayout />,
            children: [
              { index: true, element: <Navigate to="so-do-ban" replace /> },
              // Vận hành sàn/bếp — QL chi nhánh có X cho toàn bộ nhóm này (mục 4.2), dùng chung
              // component với Phục vụ / Quản trị NH (@/features/shared/floor-ops).
              { path: "so-do-ban", element: <TableMapPage /> }, // BRANCH_MANAGER_PATHS.TABLE_MAP
              { path: "so-do-ban/:tableId/mo-ban", element: <OpenTablePage /> }, // OPEN_TABLE
              { path: "order-che-bien", element: <KitchenDisplayPage /> }, // ORDER_AND_PREP -> dùng chung UI Bếp (KDS)
              {
                path: "order-che-bien/:orderId/xac-nhan",
                element: <OrderConfirmPage />,
              }, // ORDER_CONFIRM
              { path: "order/:orderId", element: <OrderDetailPage /> }, // ORDER_DETAIL
              { path: "order/:orderId/them-mon", element: <AddDishPage /> }, // ADD_DISH
              { path: "bep", element: <KitchenDisplayPage /> }, // KITCHEN_DISPLAY
              { path: "chuyen-gop-ban", element: <TransferMergeTablePage /> }, // TRANSFER_MERGE_TABLE
              // 8 phân hệ chính — phạm vi chi nhánh của mình
              { path: "thuc-don", element: <BranchManagerMenuPage /> }, // MENU
              { path: "khuyen-mai", element: <BranchManagerPromotionsPage /> }, // PROMOTIONS
              {
                path: "khuyen-mai/tao-moi",
                element: <BranchManagerPromotionCreatePage />,
              }, // PROMOTION_CREATE
              { path: "bao-cao", element: <BranchReportPage /> }, // REPORT — không có tab "So sánh chi nhánh"
              {
                path: "bao-cao/doanh-thu-theo-gio",
                element: <RevenueByHourPage />,
              }, // REVENUE_BY_HOUR
              { path: "chi-nhanh", element: <BranchManagerBranchDetailPage /> }, // BRANCH — thẳng vào chi tiết chi nhánh mình (3 tab)
              { path: "nhan-vien", element: <BranchManagerStaffPage /> }, // STAFF — 2 tab (Nhân viên + Nhật ký), chỉ xem
              { path: "cau-hinh", element: <BranchManagerBranchConfigPage /> }, // CONFIG — chỉ cấu hình chi nhánh mình
              { path: "chiet-khau-thu-cong", element: <ManualDiscountPage /> }, // MANUAL_DISCOUNT
              { path: "nhat-ky", element: <RestaurantAuditLogPage /> }, // AUDIT_LOG (tương thích ngược) — chỉ đọc (R)
              // KHÔNG có: "Vai trò & phân quyền" và cấu hình cấp NHÀ HÀNG (VAT/phí DV/MST)
              // — các quyền này chỉ Quản trị NH mới có (mục 4.3).
            ],
          },
        ],
      },

      // ---- Quản trị nhà hàng ----
      {
        element: <RequireRole allow={[APP_ROLE.RESTAURANT_ADMIN]} />,
        children: [
          {
            path: "/quan-tri-nha-hang",
            element: <StaffLayout />,
            children: [
              { index: true, element: <Navigate to="so-do-ban" replace /> },
              { path: "so-do-ban", element: <TableMapPage /> }, // SƠ ĐỒ BÀN
              { path: "so-do-ban/:tableId/mo-ban", element: <OpenTablePage /> },
              { path: "order-che-bien", element: <KitchenDisplayPage /> }, // GỌI MÓN & CHẾ BIẾN -> dùng chung UI Bếp (KDS)
              {
                path: "order-che-bien/:orderId/xac-nhan",
                element: <OrderConfirmPage />,
              },
              { path: "order/:orderId", element: <OrderDetailPage /> },
              { path: "order/:orderId/them-mon", element: <AddDishPage /> }, // ADD_DISH
              { path: "bep", element: <KitchenDisplayPage /> },
              { path: "chuyen-gop-ban", element: <TransferMergeTablePage /> },
              { path: "thuc-don", element: <MenuManagementPage /> }, // THỰC ĐƠN
              { path: "khuyen-mai", element: <PromotionsPage /> }, // KHUYẾN MÃI
              { path: "khuyen-mai/tao-moi", element: <PromotionCreatePage /> },
              { path: "bao-cao", element: <RestaurantReportsPage /> }, // BÁO CÁO (đủ 3 tab, kể cả So sánh chi nhánh)
              { path: "chi-nhanh", element: <BranchListPage /> }, // CHI NHÁNH — danh sách dạng card
              { path: "chi-nhanh/:branchId", element: <BranchDetailPage /> }, // chi tiết 1 chi nhánh (3 tab)
              {
                path: "chi-nhanh/:branchId/cau-hinh",
                element: <RestaurantBranchConfigPage />,
              }, // cấu hình 1 chi nhánh bất kỳ
              { path: "nhan-vien", element: <StaffManagementPage /> }, // NHÂN VIÊN (3 tab)
              { path: "cau-hinh", element: <RestaurantConfigPage /> }, // CẤU HÌNH — chỉ cấp nhà hàng
              { path: "vai-tro-phan-quyen", element: <RolesPermissionsPage /> },
              { path: "danh-muc", element: <CategoryManagementPage /> },
              { path: "nhat-ky", element: <RestaurantAuditLogPage /> },
            ],
          },
        ],
      },

      // ---- Quản trị nền tảng ----
      {
        element: <RequireRole allow={[APP_ROLE.PLATFORM_ADMIN]} />,
        children: [
          {
            path: "/quan-tri-nen-tang",
            element: <PlatformLayout />,
            children: [
              { index: true, element: <PlatformDashboardPage /> }, // PLATFORM_ADMIN_PATHS.DASHBOARD
              { path: "nha-hang", element: <RestaurantListPage /> }, // RESTAURANT_LIST
              {
                path: "nha-hang/:restaurantId",
                element: <RestaurantDetailPage />,
              }, // RESTAURANT_DETAIL
              { path: "cau-hinh", element: <PlatformConfigPage /> }, // PLATFORM_CONFIG
              { path: "nhat-ky-he-thong", element: <SystemAuditLogPage /> }, // SYSTEM_AUDIT_LOG
              {
                path: "goi-va-thanh-toan",
                element: <SubscriptionBillingPage />,
              }, // SUBSCRIPTION_BILLING
            ],
          },
        ],
      },
    ],
  },

  // ================= FALLBACK =================
  { path: "/khong-co-quyen-truy-cap", element: <ForbiddenPage /> },
  { path: "/", element: <Navigate to="/dang-nhap" replace /> }, // redirect về trang đăng nhập khi vào trang chủ
  { path: "*", element: <NotFoundPage /> },
]);
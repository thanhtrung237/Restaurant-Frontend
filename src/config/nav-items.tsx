import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  ChefHat,
  Building2,
  Settings2,
  BarChart3,
  Users,
  BookOpen,
  Tag,
  ScrollText,
  Store,
  SlidersHorizontal,
  Package,
  CreditCard,
  Clock,
  ReceiptText,
} from "lucide-react";
import { APP_ROLE, type AppRole } from "@/config/roles";
import {
  WAITER_PATHS,
  CASHIER_PATHS,
  BRANCH_MANAGER_PATHS,
  RESTAURANT_ADMIN_PATHS,
  PLATFORM_ADMIN_PATHS,
} from "@/app/router/paths";
import { type PermissionKey, hasPermission } from "./permissions";

export interface NavItem {
  label: string;
  /**
   * Nhãn rút gọn cho BottomNav (mobile 375px) — Figma dùng "Đơn món" thay vì
   * "Gọi món & Chế biến". Bỏ trống thì BottomNav dùng luôn `label`.
   * Cố ý để ở đây thay vì tạo bảng nhãn riêng, để menu vẫn chỉ có MỘT nguồn.
   */
  shortLabel?: string;
  path: string;
  icon: LucideIcon;
  permission?: PermissionKey;
  /**
   * Chỉ hiện ở điều hướng MOBILE (NavDrawer / BottomNav), ẩn khỏi Sidebar và SidebarRail
   * của desktop.
   *
   * Dùng cho mục mà bản Figma Desktop cố ý không đưa vào sidebar vì đã có lối vào khác
   * ngay trong trang (vd "Nhật ký hoạt động" của Quản trị NH là một tab trong trang Nhân
   * viên), nhưng bản Mobile lại cần vì ở đó không có hàng tab đó.
   */
  mobileOnly?: boolean;
  /**
   * Các đường dẫn khác cũng làm mục này sáng trên Sidebar.
   *
   * Dùng cho màn là TAB bên trong một mục menu: Figma Desktop cho thấy khi ở
   * "Vai trò & phân quyền" hay "Nhật ký hoạt động", mục sáng vẫn là "Nhân viên" — vì hai
   * màn đó là tab trong trang Nhân viên, không phải mục menu riêng.
   */
  activeAlsoOn?: string[];
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

/**
 * 8 phân hệ chính của Nhà hàng theo thiết kế Figma (Desktop / Quản lý).
 * Mỗi mục được gắn một permission tương ứng để hệ thống tự động lọc theo quyền vai trò.
 */
export const RESTAURANT_MANAGEMENT_NAV: NavItem[] = [
  {
    label: "Sơ đồ bàn",
    path: RESTAURANT_ADMIN_PATHS.TABLE_MAP,
    icon: LayoutGrid,
    permission: "TABLE_MAP",
  },
  {
    label: "Gọi món & Chế biến",
    shortLabel: "Đơn món",
    path: RESTAURANT_ADMIN_PATHS.ORDER_AND_PREP,
    icon: ChefHat,
    permission: "ORDER_AND_PREP",
    // "Order chi tiết" / "Thêm món" là màn con — Figma vẫn sáng mục này
    activeAlsoOn: [RESTAURANT_ADMIN_PATHS.ORDER_DETAIL],
  },
  {
    label: "Thực đơn",
    path: RESTAURANT_ADMIN_PATHS.MENU,
    icon: BookOpen,
    permission: "MENU",
  },
  {
    label: "Khuyến mãi",
    path: RESTAURANT_ADMIN_PATHS.PROMOTIONS,
    icon: Tag,
    permission: "PROMOTIONS",
  },
  {
    label: "Báo cáo",
    path: RESTAURANT_ADMIN_PATHS.REPORTS,
    icon: BarChart3,
    permission: "REPORTS",
  },
  {
    label: "Chi nhánh",
    path: RESTAURANT_ADMIN_PATHS.BRANCH,
    icon: Building2,
    permission: "BRANCHES",
  },
  {
    label: "Nhân viên",
    path: RESTAURANT_ADMIN_PATHS.STAFF,
    icon: Users,
    permission: "STAFF",
    // "Vai trò & phân quyền" và "Nhật ký hoạt động" là TAB trong trang Nhân viên
    activeAlsoOn: [
      RESTAURANT_ADMIN_PATHS.ROLES_PERMISSIONS,
      RESTAURANT_ADMIN_PATHS.AUDIT_LOG,
    ],
  },
  {
    label: "Cấu hình",
    path: RESTAURANT_ADMIN_PATHS.CONFIG,
    icon: SlidersHorizontal,
    permission: "CONFIG",
  },
  // CHỈ mobile: Figma "Menu Drawer · Mobile" có mục thứ 9 này, nhưng Figma Desktop
  // ("Quản lý thực đơn.png" và các màn khác) KHÔNG có nó trong sidebar — với Quản trị NH,
  // nhật ký là một tab trong trang Nhân viên. Bản mobile không có hàng tab đó nên cần lối
  // vào riêng. QL chi nhánh thì khác: nhật ký chi nhánh mình là mục độc lập ở CẢ hai.
  {
    label: "Nhật ký hoạt động",
    shortLabel: "Nhật ký",
    path: RESTAURANT_ADMIN_PATHS.AUDIT_LOG,
    icon: Clock,
    permission: "AUDIT_LOG",
    mobileOnly: true,
  },
];

export const NAV_ITEMS_BY_ROLE: Record<
  Exclude<AppRole, "CUSTOMER">,
  NavGroup[]
> = {
  // Quản trị nhà hàng: Toàn quyền truy cập 8 phân hệ chính chuẩn theo ảnh thiết kế
  [APP_ROLE.RESTAURANT_ADMIN]: [
    {
      items: RESTAURANT_MANAGEMENT_NAV,
    },
  ],

  // Phục vụ: vận hành sàn/bếp (mục 4.2) — không có báo cáo/nhân viên/menu/khuyến mãi/cấu hình
  [APP_ROLE.WAITER]: [
    {
      items: [
        {
          label: "Sơ đồ bàn",
          path: WAITER_PATHS.TABLE_MAP,
          icon: LayoutGrid,
          permission: "TABLE_MAP",
        },
        // "Gọi món & Chế biến" mở thẳng bảng Bếp (KDS) — đã gộp, không còn mục "Bếp" tách riêng.
        {
          label: "Gọi món & Chế biến",
          shortLabel: "Đơn món",
          path: WAITER_PATHS.ORDER_AND_PREP,
          icon: ChefHat,
          permission: "ORDER_AND_PREP",
          activeAlsoOn: [WAITER_PATHS.ORDER_DETAIL],
        },
        {
          label: "Chuyển / gộp bàn",
          shortLabel: "Chuyển bàn",
          path: WAITER_PATHS.TRANSFER_MERGE_TABLE,
          icon: LayoutGrid,
          permission: "TABLE_MAP",
        },
      ],
    },
  ],

  // Thu ngân: xem tạm tính (sơ đồ bàn), chuyển/gộp bàn, thu tiền — không có gọi món/bếp
  [APP_ROLE.CASHIER]: [
    {
      items: [
        {
          label: "Sơ đồ bàn",
          path: CASHIER_PATHS.TABLE_MAP,
          icon: LayoutGrid,
          permission: "TABLE_MAP",
        },
        {
          label: "Chuyển / gộp bàn",
          shortLabel: "Chuyển bàn",
          path: CASHIER_PATHS.TRANSFER_MERGE_TABLE,
          icon: LayoutGrid,
          permission: "TABLE_MAP",
        },
        {
          label: "Hóa đơn",
          path: CASHIER_PATHS.INVOICES,
          icon: ReceiptText,
          permission: "INVOICES",
        },
      ],
    },
  ],

  // Quản lý chi nhánh — phạm vi CHI NHÁNH được phân công (BR-18).
  // Theo Bảng 4.3, cột "QL chi nhánh" để TRỐNG ở: Menu nhà hàng, danh mục, nhóm tuỳ chọn,
  // Khuyến mãi, Quản lý nhân viên, Vai trò & phân quyền ⇒ KHÔNG có mục "Khuyến mãi" và
  // "Nhân viên" trong menu. Mục "Thực đơn" ở đây là MENU CHI NHÁNH (đè giá / ẩn món /
  // món riêng / báo hết món) nên dùng khoá BRANCH_MENU, không phải MENU.
  // Nhật ký chi nhánh mình là quyền CHỈ ĐỌC (R) nên tách thành mục riêng — trước đây
  // vào được nhờ mục "Nhân viên", nhưng mục đó đã bị bỏ theo đặc tả.
  [APP_ROLE.BRANCH_MANAGER]: [
    {
      items: [
        {
          label: "Sơ đồ bàn",
          path: BRANCH_MANAGER_PATHS.TABLE_MAP,
          icon: LayoutGrid,
          permission: "TABLE_MAP",
        },
        {
          label: "Gọi món & Chế biến",
          shortLabel: "Đơn món",
          path: BRANCH_MANAGER_PATHS.ORDER_AND_PREP,
          icon: ChefHat,
          permission: "ORDER_AND_PREP",
          activeAlsoOn: [BRANCH_MANAGER_PATHS.ORDER_DETAIL],
        },
        {
          label: "Thực đơn",
          path: BRANCH_MANAGER_PATHS.MENU,
          icon: BookOpen,
          permission: "BRANCH_MENU",
        },
        {
          label: "Báo cáo",
          path: BRANCH_MANAGER_PATHS.REPORT,
          icon: BarChart3,
          permission: "REPORTS",
        },
        {
          label: "Chi nhánh",
          path: BRANCH_MANAGER_PATHS.BRANCH,
          icon: Building2,
          permission: "BRANCHES",
        },
        {
          label: "Cấu hình",
          path: BRANCH_MANAGER_PATHS.CONFIG,
          icon: SlidersHorizontal,
          permission: "CONFIG",
        },
        {
          label: "Nhật ký hoạt động",
          shortLabel: "Nhật ký",
          path: BRANCH_MANAGER_PATHS.AUDIT_LOG,
          icon: Clock,
          permission: "AUDIT_LOG",
        },
        {
          label: "Hóa đơn",
          path: BRANCH_MANAGER_PATHS.INVOICES,
          icon: ReceiptText,
          permission: "INVOICES",
        },
      ],
    },
  ],

  // Quản trị nền tảng
  [APP_ROLE.PLATFORM_ADMIN]: [
    {
      items: [
        {
          label: "Nhà hàng",
          path: PLATFORM_ADMIN_PATHS.RESTAURANT_LIST,
          icon: Store,
        },
        {
          label: "Gói dịch vụ",
          path: PLATFORM_ADMIN_PATHS.SUBSCRIPTION,
          icon: Package,
        },
        {
          label: "Thanh toán",
          path: PLATFORM_ADMIN_PATHS.BILLING,
          icon: CreditCard,
        },
        {
          label: "Cấu hình nền tảng",
          path: PLATFORM_ADMIN_PATHS.PLATFORM_CONFIG,
          icon: Settings2,
        },
        {
          label: "Nhật ký hệ thống",
          path: PLATFORM_ADMIN_PATHS.SYSTEM_AUDIT_LOG,
          icon: ScrollText,
        },
      ],
    },
  ],
};

/**
 * Lấy danh sách menu items hiển thị cho vai trò cụ thể, đã lọc qua quyền (permissions).
 */
/** Bề mặt điều hướng đang hỏi menu — quyết định có áp `mobileOnly` hay không. */
export type NavSurface = "desktop" | "mobile";

export function getNavGroupsForRole(
  role: AppRole,
  surface: NavSurface = "mobile",
): NavGroup[] {
  const groups = NAV_ITEMS_BY_ROLE[role as Exclude<AppRole, "CUSTOMER">] || [];

  // Lọc theo quyền cho MỌI vai trò, kể cả Quản trị NH — ROLE_PERMISSIONS đã liệt kê
  // đủ quyền của vai trò này nên không cần (và không nên) có lối tắt bỏ qua bộ lọc.
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (surface === "desktop" && item.mobileOnly) return false;
        if (!item.permission) return true;
        return hasPermission(role, item.permission);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

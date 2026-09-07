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
  path: string;
  icon: LucideIcon;
  permission?: PermissionKey;
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
    path: RESTAURANT_ADMIN_PATHS.ORDER_AND_PREP,
    icon: ChefHat,
    permission: "ORDER_AND_PREP",
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
  },
  {
    label: "Cấu hình",
    path: RESTAURANT_ADMIN_PATHS.CONFIG,
    icon: SlidersHorizontal,
    permission: "CONFIG",
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
          path: WAITER_PATHS.ORDER_AND_PREP,
          icon: ChefHat,
          permission: "ORDER_AND_PREP",
        },
        {
          label: "Chuyển / gộp bàn",
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
          path: CASHIER_PATHS.TRANSFER_MERGE_TABLE,
          icon: LayoutGrid,
          permission: "TABLE_MAP",
        },
      ],
    },
  ],

  // Quản lý chi nhánh — sidebar hiển thị GIỐNG HỆT Quản trị nhà hàng (cùng 1 nhóm, cùng
  // 8 mục, cùng label/icon/thứ tự), chỉ khác path trỏ về phạm vi chi nhánh của mình
  // (BRANCH_MANAGER_PATHS). Lưu ý: dữ liệu hiển thị trong từng trang vẫn hẹp hơn Quản trị
  // NH (Chi nhánh đi thẳng vào chi tiết chi nhánh mình; Cấu hình chỉ có cấu hình chi nhánh;
  // Nhân viên chỉ 2 tab, không có Vai trò & phân quyền; Báo cáo không có tab So sánh chi
  // nhánh) — xem chú thích trong config/permissions.ts. Đây CHỈ là sidebar, không đổi route.
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
          path: BRANCH_MANAGER_PATHS.ORDER_AND_PREP,
          icon: ChefHat,
          permission: "ORDER_AND_PREP",
        },
        {
          label: "Thực đơn",
          path: BRANCH_MANAGER_PATHS.MENU,
          icon: BookOpen,
          permission: "MENU",
        },
        {
          label: "Khuyến mãi",
          path: BRANCH_MANAGER_PATHS.PROMOTIONS,
          icon: Tag,
          permission: "PROMOTIONS",
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
          label: "Nhân viên",
          path: BRANCH_MANAGER_PATHS.STAFF,
          icon: Users,
          permission: "STAFF",
        },
        {
          label: "Cấu hình",
          path: BRANCH_MANAGER_PATHS.CONFIG,
          icon: SlidersHorizontal,
          permission: "CONFIG",
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
export function getNavGroupsForRole(role: AppRole): NavGroup[] {
  const groups = NAV_ITEMS_BY_ROLE[role as Exclude<AppRole, "CUSTOMER">] || [];

  // Nếu là Quản trị nhà hàng, luôn cho phép hiển thị đầy đủ
  if (role === APP_ROLE.RESTAURANT_ADMIN) {
    return groups;
  }

  // Với các role khác, tự động lọc bỏ các menu item mà role không có quyền
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => {
        if (!item.permission) return true;
        return hasPermission(role, item.permission);
      }),
    }))
    .filter((group) => group.items.length > 0);
}

import * as React from "react"
import { Outlet, useLocation, useNavigate } from "react-router-dom"
import { MoreHorizontal, Building2, PanelLeftClose, PanelLeftOpen } from "lucide-react"
import { Sidebar } from "@/components/layout/Sidebar"
import { SidebarRail } from "@/components/layout/SidebarRail"
import { NavDrawer } from "@/components/layout/NavDrawer"
import { MobileHeader } from "@/components/layout/MobileHeader"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { BottomNav, type BottomNavItem } from "@/components/layout/BottomNav"
import { BranchSwitcher } from "@/components/layout/BranchSwitcher"
import { useAuthStore } from "@/stores/auth.store"
import {
  BOTTOM_NAV_MORE_KEY,
  findActiveNavItem,
  getBottomNavItems,
  navItemRequiresBranch,
} from "@/config/nav-utils"
import { isSubScreenRoute } from "@/config/sub-screen-routes"
import { PageHeaderContext, usePageHeaderState, usePageHeaderValue } from "@/hooks/use-page-header"
import { useStaffWebSocket } from "@/hooks/use-staff-websocket"

const DESKTOP_SIDEBAR_QUERY = "(min-width: 64rem)"

function subscribeToDesktopSidebar(onChange: () => void) {
  const mediaQuery = window.matchMedia(DESKTOP_SIDEBAR_QUERY)
  mediaQuery.addEventListener("change", onChange)
  return () => mediaQuery.removeEventListener("change", onChange)
}

function isDesktopSidebar() {
  return window.matchMedia(DESKTOP_SIDEBAR_QUERY).matches
}

/**
 * Layout dùng chung cho khu vực NHÂN VIÊN: Phục vụ, Thu ngân, Quản lý chi nhánh,
 * Quản trị nhà hàng.
 *
 * Bố cục điều hướng mặc định:
 *  - lg+ (≥1024, PC)       : Sidebar đầy đủ, có thể thu gọn.
 *  - md–lg (768–1023, Tab) : SidebarRail chỉ icon + chip chi nhánh, có thể mở rộng.
 *  - <md (Mobile)          : MobileHeader (biến thể "app") + BottomNav + NavDrawer.
 *
 * Mọi biến thể lấy mục menu từ cùng một nguồn `getNavGroupsForRole(role)` thông qua
 * `config/nav-utils.ts`, nên không bao giờ hiện mục mà vai trò không có quyền.
 */
export default function StaffLayout() {
  const pageHeaderState = usePageHeaderState()
  return (
    <PageHeaderContext.Provider value={pageHeaderState}>
      <StaffLayoutInner />
    </PageHeaderContext.Provider>
  )
}

function StaffLayoutInner() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = useAuthStore((s) => s.role)
  const branchId = useAuthStore((s) => s.branchId)
  const desktopSidebar = React.useSyncExternalStore(subscribeToDesktopSidebar, isDesktopSidebar)
  const [sidebarExpanded, setSidebarExpanded] = React.useState<boolean | null>(null)
  const isSidebarExpanded = sidebarExpanded ?? desktopSidebar
  const sidebarToggleLabel = isSidebarExpanded ? "Thu gọn thanh bên" : "Mở rộng thanh bên"
  const restoreSidebarFocus = React.useRef(false)
  const focusSidebarToggle = React.useCallback((button: HTMLButtonElement | null) => {
    if (button && restoreSidebarFocus.current) {
      restoreSidebarFocus.current = false
      button.focus({ preventScroll: true })
    }
  }, [])

  // A3: Kết nối WebSocket real-time (T-01) — tự ngắt/kết nối lại khi branchId thay đổi
  useStaffWebSocket()

  // Ghi lại đường dẫn lúc MỞ drawer thay vì giữ một cờ boolean. Nhờ vậy drawer tự đóng
  // khi route đổi (yêu cầu 4.7) mà không cần setState trong effect — điều hướng từ nút
  // back hay redirect cũng đóng đúng, không bị nháy một khung hình.
  const [drawerOpenedAt, setDrawerOpenedAt] = React.useState<string | null>(null)
  const isDrawerOpen = drawerOpenedAt === location.pathname

  const setIsDrawerOpen = React.useCallback(
    (open: boolean) => setDrawerOpenedAt(open ? location.pathname : null),
    [location.pathname],
  )

  const activeItem = role ? findActiveNavItem(role, location.pathname) : undefined

  // Tiêu đề mobile: mặc định là nhãn mục menu đang active, trang có thể ghi đè
  // bằng `usePageHeader({ title, subtitle })` — phương án P2.
  const pageHeader = usePageHeaderValue()
  const headerTitle = pageHeader.title ?? activeItem?.label ?? ""

  // Màn con (Order chi tiết, Chốt bàn, Tạo khuyến mãi...) dùng header có nút quay lại
  // thay vì header "app" — danh sách khai báo tập trung ở config/sub-screen-routes.ts.
  const isSubScreen = isSubScreenRoute(location.pathname)

  const bottomNavItems: BottomNavItem[] = React.useMemo(() => {
    if (!role) return []
    return getBottomNavItems(role, "Thêm", MoreHorizontal).map((entry) => ({
      key: entry.key,
      label: entry.label,
      icon: entry.icon,
    }))
  }, [role])

  // Khoá active của BottomNav chính là path của mục đang active (xem nav-utils).
  const bottomNavActiveKey = activeItem?.path ?? ""

  // Đang ở chế độ "Tất cả chi nhánh" nhưng mở phân hệ cần chi nhánh cụ thể.
  const needsBranchSelection = branchId === null && navItemRequiresBranch(activeItem)

  function handleBottomNavChange(key: string) {
    // "Thêm" MỞ drawer, không điều hướng.
    if (key === BOTTOM_NAV_MORE_KEY) {
      setIsDrawerOpen(true)
      return
    }
    // Điều hướng thẳng theo path của nav item. Không còn switch-case suy ra basePath
    // từ role — cách cũ bỏ sót Thu ngân nên vai trò này rơi vào /quan-tri-nha-hang.
    if (key !== location.pathname) {
      navigate(key)
    }
  }

  const sidebarToggle = (
    <button
      ref={focusSidebarToggle}
      type="button"
      aria-label={sidebarToggleLabel}
      title={sidebarToggleLabel}
      aria-controls="staff-sidebar-expanded"
      aria-expanded={isSidebarExpanded}
      onClick={() => {
        restoreSidebarFocus.current = true
        setSidebarExpanded(!isSidebarExpanded)
      }}
      className={`flex h-11 shrink-0 cursor-pointer items-center gap-3 rounded-lg text-sm font-medium text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-primary ${
        isSidebarExpanded ? "mx-3 mb-2 px-3" : "mb-1 w-11 justify-center"
      }`}
    >
      {isSidebarExpanded ? (
        <>
          <PanelLeftClose aria-hidden="true" className="size-4.5" />
          <span>Thu gọn</span>
        </>
      ) : (
        <PanelLeftOpen aria-hidden="true" className="size-5" />
      )}
    </button>
  )

  return (
    <div className="flex min-h-dvh bg-surface-page">
      <div className="sticky top-0 z-30 hidden h-dvh shrink-0 md:block">
        <Sidebar
          className={isSidebarExpanded ? "flex" : "hidden"}
          toggle={isSidebarExpanded ? sidebarToggle : null}
        />
        <SidebarRail
          className={isSidebarExpanded ? "hidden" : "flex"}
          toggle={isSidebarExpanded ? null : sidebarToggle}
        />
      </div>

      <main className="flex min-w-0 flex-1 flex-col overflow-x-hidden pb-[calc(4rem_+_env(safe-area-inset-bottom))] md:pb-0">
        {/* Mobile: header dạng app. Ẩn từ md trở lên vì đã có Sidebar/Rail. */}
        <div className="md:hidden">
          <MobileHeader
            variant={isSubScreen ? "back" : "app"}
            title={headerTitle}
            subtitle={pageHeader.subtitle}
            headerActions={pageHeader.headerActions}
            rightActions={
              isSubScreen ? <NotificationBell className="size-11 shrink-0" /> : undefined
            }
          />
        </div>

        {needsBranchSelection ? <SelectBranchEmptyState /> : <Outlet />}
      </main>

      {/* Mobile: thanh dưới + drawer. Thu ngân chỉ có 2 mục nên không có "Thêm" —
          đăng xuất đi qua MobileHeader. */}
      {bottomNavItems.length > 0 ? (
        <BottomNav
          variant="custom"
          items={bottomNavItems}
          activeKey={bottomNavActiveKey}
          onChange={handleBottomNavChange}
          className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
        />
      ) : null}

      <NavDrawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen} />
    </div>
  )
}

/**
 * Hiện khi Quản trị NH đang ở chế độ "Tất cả chi nhánh" mà mở phân hệ cần chi nhánh
 * cụ thể (sơ đồ bàn, gọi món & chế biến, thanh toán...).
 */
function SelectBranchEmptyState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-16 text-center">
      <span className="flex size-14 items-center justify-center rounded-2xl bg-brand-primary-subtle text-brand-primary">
        <Building2 className="size-7" />
      </span>
      <div className="max-w-sm">
        <h2 className="text-lg font-bold text-text-primary">Chọn một chi nhánh để tiếp tục</h2>
        <p className="mt-1.5 text-sm text-text-secondary">
          Màn hình này làm việc trên dữ liệu của một chi nhánh cụ thể. Bạn đang ở chế độ xem tổng
          hợp tất cả chi nhánh.
        </p>
      </div>
      <BranchSwitcher variant="full" className="text-sm font-semibold text-brand-primary" />
    </div>
  )
}

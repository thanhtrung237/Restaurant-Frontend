import { useBranchOperationalPermissions } from "@/api/operational-permissions.api"
import { getStaffPaymentPaths } from "@/app/router/paths/staff-payment.paths"
import * as React from "react"
import { Link, useLocation, useNavigate, useSearchParams, generatePath } from "react-router-dom"
import { useTakeawayOrders } from "@/api/takeaway-orders.api"
import { ServiceModeLinks, TakeawayOrders } from "../TakeawayOrders"
import { takeawayCreatePath } from "@/app/router/paths/takeaway.paths"
import { StaffCallNotice } from "@/features/shared/floor-ops/StaffCallNotice"
import { Bell, CalendarCheck, Plus, ArrowRightLeft, CircleAlert, ShoppingBag } from "lucide-react"
import { Chip } from "@/components/common/Chip"
import { PageHeader } from "@/components/layout/PageHeader"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { TableCard, type TableDisplayStatus } from "@/components/common/TableCard"
import { SearchInput } from "@/components/common/SearchInput"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE } from "@/config/roles"
import {
  WAITER_PATHS,
  CASHIER_PATHS,
  BRANCH_MANAGER_PATHS,
  RESTAURANT_ADMIN_PATHS,
} from "@/app/router/paths"
import { OpenTableModal } from "../OpenTableModal"
import { useCashierWaiter } from "@/hooks/use-cashier-waiter"
import { ReservationModal } from "../ReservationModal"
import { ReservationListPanel } from "../ReservationListPanel"
import { cn } from "@/lib/utils"
import {
  useTablesByBranch,
  useOpenSessionsByBranch,
  useBranch,
} from "@/features/shared/floor-ops/api"
import type { DiningTable, TableSession } from "@/types/models"
import { TABLE_DISPLAY_STATUS_LABEL } from "@/types/enums"

/**
 * Kết hợp DiningTable + TableSession để tạo TableItem với displayStatus.
 * Logic:
 * - TableSession.status = WAITING_FOR_OPEN → displayStatus = "WAITING_OPEN"
 * - TableSession.status = SERVING → displayStatus = "OCCUPIED"
 * - TableSession.status = WAITING_FOR_PAY → displayStatus = "AWAITING_PAYMENT"
 * - TableSession.status = RESERVED → displayStatus = "RESERVED"
 * - TableSession.status = MERGED → displayStatus = "MERGED"
 * - Không có session → dùng DiningTable.status trực tiếp
 */
interface TableItem extends DiningTable {
  session?: TableSession
  displayStatus: TableDisplayStatus
  customStatusLabel?: string
  subLabel?: string
  elapsedMinutes?: number
  timeText?: string
  guestCount?: number
  subtotal?: string
  hasAlert?: boolean
}

const EMPTY_TABLES: DiningTable[] = []
const EMPTY_SESSIONS: TableSession[] = []
const UNASSIGNED_AREA = "unassigned"

function groupTablesByArea(tables: TableItem[]) {
  const groups = new Map<
    string,
    { key: string; label: string; name?: string; tables: TableItem[] }
  >()

  for (const table of tables) {
    const name = table.areaName?.trim() || undefined
    const key =
      table.areaId != null
        ? `area-${table.areaId}`
        : name
          ? `name-${name.toLowerCase()}`
          : UNASSIGNED_AREA
    const group = groups.get(key)
    if (group) {
      group.tables.push(table)
      if (name && !group.name) {
        group.name = name
        group.label = name
      }
    } else {
      const label = name ?? (table.areaId != null ? `Khu vực #${table.areaId}` : "Chưa phân khu")
      groups.set(key, { key, label, name, tables: [table] })
    }
  }

  const unassigned = groups.get(UNASSIGNED_AREA)
  groups.delete(UNASSIGNED_AREA)
  return unassigned ? [...groups.values(), unassigned] : [...groups.values()]
}

function normalizeSearch(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/đ/g, "d")
    .trim()
}

function computeDisplayStatus(table: DiningTable, session?: TableSession): TableDisplayStatus {
  if (!session) return table.status

  switch (session.status) {
    case "WAITING_FOR_OPEN":
      return "WAITING_OPEN"
    case "SERVING":
      return "OCCUPIED"
    case "WAITING_FOR_PAY":
      return "AWAITING_PAYMENT"
    case "RESERVED":
      return "RESERVED"
    case "MERGED":
      return "MERGED"
    case "CLOSED":
    case "CANCELLED":
      return table.status // Session đã đóng, dùng trạng thái bàn
    default:
      return table.status
  }
}

function computeElapsedMinutes(session?: TableSession): number | undefined {
  if (!session?.openedAt) return undefined
  const opened = new Date(session.openedAt)
  const now = new Date()
  return Math.floor((now.getTime() - opened.getTime()) / 60000)
}

function mergeTableData(tables: DiningTable[], sessions: TableSession[]): TableItem[] {
  const sessionsByTable = new Map<number, TableSession>()
  sessions.forEach((s) => {
    if (s.tableId != null) sessionsByTable.set(s.tableId, s)
  })

  return tables.map((table) => {
    const session = sessionsByTable.get(table.id)
    const displayStatus = computeDisplayStatus(table, session)
    const elapsedMinutes = computeElapsedMinutes(session)

    const item: TableItem = {
      ...table,
      session,
      displayStatus,
      elapsedMinutes,
      guestCount: session?.guestCount,
    }

    // Tùy chỉnh subLabel theo trạng thái
    if (displayStatus === "WAITING_OPEN") {
      item.subLabel = "Vừa quét QR"
      item.subtotal = "—"
    } else if (displayStatus === "AVAILABLE") {
      item.subLabel = "Nhấn để mở bàn"
    } else if (displayStatus === "RESERVED") {
      // FR-SRV-01: bàn ĐẶT TRƯỚC hiển thị kèm GIỜ HẸN và TÊN KHÁCH đã đặt.
      // `reservationName` là cột của luồng đặt bàn qua phiên (POST /table-sessions);
      // luồng cũ `POST /tables/{id}/reserve` ghi vào customer_name và KHÔNG được
      // TableSessionResponse trả về — xem docs/be-issues.md.
      if (session?.reservationTime) {
        const time = new Date(session.reservationTime)
        item.timeText = time.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      }
      const reservedInfo = [
        item.timeText,
        session?.reservationName,
        session?.guestCount ? `${session.guestCount} khách` : null,
      ].filter(Boolean)
      if (reservedInfo.length > 0) {
        item.subLabel = reservedInfo.join(" · ")
      }
    }

    // TODO: Tính subtotal từ orders của session (cần API GET /orders/session/{id})
    // Hiện tại để placeholder
    if (displayStatus === "OCCUPIED" || displayStatus === "AWAITING_PAYMENT") {
      item.subtotal = "—"
    }

    return item
  })
}

/** ORDER_DETAIL theo role — Thu ngân không có màn Order chi tiết (chỉ xem tạm tính). */
const ORDER_DETAIL_PATH_BY_ROLE: Partial<Record<string, string>> = {
  [APP_ROLE.WAITER]: WAITER_PATHS.ORDER_DETAIL,
  [APP_ROLE.BRANCH_MANAGER]: BRANCH_MANAGER_PATHS.ORDER_DETAIL,
  [APP_ROLE.RESTAURANT_ADMIN]: RESTAURANT_ADMIN_PATHS.ORDER_DETAIL,
}

/**
 * Bộ lọc nhanh dạng chip cho TABLET và MOBILE (Figma "Sơ đồ bàn · Tablet (834)" và
 * "Sơ đồ bàn · Mobile (375)").
 *
 * Desktop dùng hàng chú giải có chấm màu (STATUS_LEGENDS bên dưới) vì còn chỗ hiển thị
 * đủ 6 trạng thái; màn hẹp chỉ giữ 4 lựa chọn hay dùng nhất.
 *
 * `shortLabel` dành cho mobile 375px — Figma rút gọn "Đang phục vụ" thành "Phục vụ" và
 * "Chờ thanh toán" thành "Chờ TT" để 4 chip nằm vừa một hàng.
 */
const QUICK_FILTERS: Array<{
  status: TableDisplayStatus | "ALL"
  label: string
  shortLabel: string
}> = [
  { status: "ALL", label: "Tất cả", shortLabel: "Tất cả" },
  { status: "AVAILABLE", label: "Trống", shortLabel: "Trống" },
  { status: "OCCUPIED", label: "Đang phục vụ", shortLabel: "Phục vụ" },
  { status: "AWAITING_PAYMENT", label: "Chờ thanh toán", shortLabel: "Chờ TT" },
]

/**
 * Danh mục chú giải trạng thái (Status Legend) hiển thị ở đầu sơ đồ bàn
 */
const STATUS_LEGENDS: Array<{
  status: TableDisplayStatus
  label: string
  dotClass: string
}> = [
  { status: "AVAILABLE", label: TABLE_DISPLAY_STATUS_LABEL.AVAILABLE, dotClass: "bg-[#9CA3AF]" },
  {
    status: "WAITING_OPEN",
    label: TABLE_DISPLAY_STATUS_LABEL.WAITING_OPEN,
    dotClass: "bg-[#2E90FA]",
  },
  { status: "OCCUPIED", label: TABLE_DISPLAY_STATUS_LABEL.OCCUPIED, dotClass: "bg-[#F0522B]" },
  {
    status: "AWAITING_PAYMENT",
    label: TABLE_DISPLAY_STATUS_LABEL.AWAITING_PAYMENT,
    dotClass: "bg-[#F59E0B]",
  },
  { status: "RESERVED", label: "Đặt trước", dotClass: "bg-[#7F56D9]" },
  { status: "MERGED", label: "Đã gộp", dotClass: "bg-[#667085]" },
]

/**
 * Sơ đồ bàn (Desktop / Sơ đồ bàn) — Tỉ lệ chuẩn 1440x1024
 * Hiển thị tổng quan các bàn ăn của nhà hàng, thống kê số lượng bàn theo trạng thái,
 * thanh tìm kiếm & lọc nhanh, và kích hoạt modal mở bàn khi nhân viên tương tác.
 */
export default function TableMapPage() {
  const branchId = useAuthStore((s) => s.branchId)
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  if (branchId && params.get("mode") === "takeaway") {
    return <TakeawayOrders key={branchId} branchId={branchId} tableMapPath={pathname} />
  }
  return <BranchTableMap key={branchId} branchId={branchId ?? undefined} />
}

function BranchTableMap({ branchId }: { branchId?: number }) {
  const { allowed: canAlsoServe } = useCashierWaiter()
  const canReserve = useBranchOperationalPermissions(branchId).can("RESERVE_TABLE")
  const { toast } = useToast()
  const { pathname } = useLocation()
  const { data: takeawayOrders } = useTakeawayOrders(branchId)
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const targetTableId = Number(params.get("table"))
  const staffCallId = Number(params.get("staffCall"))
  const role = useAuthStore((s) => s.role)

  // State cho modal và filter
  const [isModalOpen, setIsModalOpen] = React.useState(false)
  const [selectedTableForOpen, setSelectedTableForOpen] = React.useState<TableItem | null>(null)
  const [isReservationModalOpen, setIsReservationModalOpen] = React.useState(false)
  const [isReservationPanelOpen, setIsReservationPanelOpen] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedFilter, setSelectedFilter] = React.useState<TableDisplayStatus | "ALL">("ALL")
  const [areaFilter, setAreaFilter] = React.useState("all")
  const [minimumSeats, setMinimumSeats] = React.useState(0)

  // Fetch data từ API, tự động refresh mỗi 1 giây
  const tablesQuery = useTablesByBranch(branchId, undefined, { refetchInterval: 1000 })
  const sessionsQuery = useOpenSessionsByBranch(branchId, { refetchInterval: 1000 })
  const tablesData = tablesQuery.data ?? EMPTY_TABLES
  const sessionsData = sessionsQuery.data ?? EMPTY_SESSIONS
  const mapLoading = tablesQuery.isLoading || sessionsQuery.isLoading
  const mapError = tablesQuery.isError || sessionsQuery.isError
  const hasSnapshot = tablesQuery.data !== undefined && sessionsQuery.data !== undefined
  const canUseTables = hasSnapshot && !mapError
  const retryingMap =
    (tablesQuery.isError && tablesQuery.isFetching) ||
    (sessionsQuery.isError && sessionsQuery.isFetching)

  React.useEffect(() => {
    if (!mapError) return
    setIsModalOpen(false)
    setSelectedTableForOpen(null)
    setIsReservationModalOpen(false)
    setIsReservationPanelOpen(false)
  }, [mapError])

  function retryMap() {
    if (tablesQuery.isError) void tablesQuery.refetch()
    if (sessionsQuery.isError) void sessionsQuery.refetch()
  }

  // Merge data
  const tables = React.useMemo(
    () =>
      mergeTableData(tablesData, sessionsData).filter(
        (table) => table.displayStatus !== "INACTIVE",
      ),
    [tablesData, sessionsData],
  )

  // Cấu hình chi nhánh — cần `reservationHoldMinutes` để cảnh báo lịch sắp quá giờ (BR-29).
  const { data: branch } = useBranch(branchId)
  // Chi nhánh ngừng hoạt động (FR-BRN-01): không mở phiên mới, không nhận đặt bàn mới.
  // BE chỉ chặn ở luồng khách quét QR nên FE phải ẩn/khoá các lối vào phía nhân viên.
  const isBranchInactive = branch?.status === "INACTIVE"

  // Bàn còn trống để đặt trước (BR-29: chỉ đặt được bàn không có phiên nào đang mở).
  const availableTables = React.useMemo(
    () => tables.filter((t) => t.displayStatus === "AVAILABLE"),
    [tables],
  )

  const reservedCount = React.useMemo(
    () => sessionsData.filter((s) => s.status === "RESERVED").length,
    [sessionsData],
  )

  // Thống kê số lượng
  const totalCount = tables.length
  const occupiedCount = tables.filter((t) => t.displayStatus === "OCCUPIED").length
  const awaitingPaymentCount = tables.filter((t) => t.displayStatus === "AWAITING_PAYMENT").length

  // Dòng phụ của header mobile (StaffLayout) — Figma mobile hiển thị
  // "12 bàn · 5 đang phục vụ" ngay dưới tiêu đề. Trên mobile header riêng của trang
  // này bị ẩn nên số liệu phải đẩy lên header chung.
  const headerStatus = mapError
    ? "Sơ đồ bàn chưa cập nhật"
    : mapLoading
      ? "Đang tải sơ đồ bàn…"
      : !hasSnapshot
        ? "Chọn chi nhánh để xem bàn"
        : undefined
  const headerSubtitle = headerStatus ?? `${totalCount} bàn · ${occupiedCount} đang phục vụ`
  const tableAreas = React.useMemo(() => groupTablesByArea(tables), [tables])
  const selectedArea = tableAreas.some((area) => area.key === areaFilter) ? areaFilter : "all"
  const seatOptions = React.useMemo(() => {
    const capacities = tablesData.map((table) => table.capacity ?? 0).filter((seats) => seats > 0)
    return [...new Set([minimumSeats, 2, 3, 4, 5, 6, 7, 8, ...capacities])]
      .filter((seats) => seats > 0)
      .sort((a, b) => a - b)
  }, [tablesData, minimumSeats])
  const hasFilters =
    targetTableId > 0 ||
    searchQuery.trim() !== "" ||
    selectedFilter !== "ALL" ||
    selectedArea !== "all" ||
    minimumSeats > 0
  const filteredAreas = React.useMemo(() => {
    const query = normalizeSearch(searchQuery)
    return tableAreas
      .filter((area) => targetTableId > 0 || selectedArea === "all" || area.key === selectedArea)
      .map((area) => ({
        ...area,
        tables: area.tables.filter((table) =>
          targetTableId > 0
            ? table.id === targetTableId
            : (selectedFilter === "ALL" || table.displayStatus === selectedFilter) &&
              (minimumSeats === 0 || (table.capacity ?? 0) >= minimumSeats) &&
              (!query ||
                normalizeSearch(area.label).includes(query) ||
                normalizeSearch(table.name).includes(query) ||
                normalizeSearch(table.subLabel ?? "").includes(query)),
        ),
      }))
      .filter((area) => area.tables.length > 0)
  }, [tableAreas, targetTableId, searchQuery, selectedFilter, selectedArea, minimumSeats])

  function resetFilters() {
    if (params.has("table")) {
      const next = new URLSearchParams(params)
      next.delete("table")
      next.delete("staffCall")
      setParams(next, { replace: true })
    }
    setSearchQuery("")
    setSelectedFilter("ALL")
    setAreaFilter("all")
    setMinimumSeats(0)
  }

  function handleTableClick(table: TableItem, areaLabel: string) {
    if (!canUseTables) return
    const checkoutPath = getStaffPaymentPaths(role)?.CHECKOUT
    if (table.displayStatus === "AWAITING_PAYMENT" && table.session?.id && checkoutPath) {
      navigate(generatePath(checkoutPath, { tableSessionId: String(table.session.id) }))
      return
    }

    // Mở chi tiết đơn khi cần xem hoặc xử lý món.
    if (table.displayStatus === "OCCUPIED" || table.displayStatus === "AWAITING_PAYMENT") {
      const orderDetailPath = canAlsoServe
        ? CASHIER_PATHS.ORDER_DETAIL
        : role
          ? ORDER_DETAIL_PATH_BY_ROLE[role]
          : undefined
      if (orderDetailPath && table.session?.id) {
        // TODO: Cần lấy orderId thực từ session, hiện tạm dùng sessionId
        navigate(generatePath(orderDetailPath, { orderId: String(table.session.id) }))
        return
      }
      // Thu ngân ở bàn "Đang phục vụ": chỉ xem tạm tính trên sơ đồ bàn, không có Order chi tiết
      toast({
        title: table.name,
        description: `Tạm tính hiện tại: ${table.subtotal ?? "0đ"}.`,
      })
      return
    }

    // Bàn trống, chờ mở bàn, hoặc đặt trước — mở modal Mở bàn
    if (isBranchInactive) {
      toast({
        title: "Chi nhánh đang ngừng hoạt động",
        description: "Không thể mở bàn mới. Kích hoạt lại chi nhánh ở trang Chi nhánh.",
      })
      return
    }
    setSelectedTableForOpen({ ...table, areaName: areaLabel })
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setSelectedTableForOpen(null)
  }

  return (
    <div className="@container/table-map flex min-h-screen flex-1 flex-col bg-surface-page">
      {/* ============================================================
          1. HEADER BAR: TIÊU ĐỀ + THỐNG KÊ + ACTIONS
          Theo Figma "Desktop / Sơ đồ bàn": vùng tiêu đề là thanh nền TRẮNG
          (surface-card) có đường kẻ dưới, tách hẳn khỏi phần nội dung nền xám
          (surface-page). Legend trạng thái và nhãn khu vực nằm dưới, trên nền xám.
          ============================================================ */}
      <PageHeader
        title="Sơ đồ bàn"
        actionsClassName="min-w-0 lg:shrink-0"
        subtitle={
          headerStatus ??
          `${totalCount} bàn · ${occupiedCount} đang phục vụ · ${awaitingPaymentCount} chờ thanh toán`
        }
        mobileSubtitle={headerSubtitle}
        actions={
          <div className="flex min-w-0 w-full flex-nowrap items-center justify-end gap-2">
            {/* Ô tìm kiếm — ẩn ở tablet cho đỡ chật (Figma 834 không có ô này) */}
            <div className="hidden w-36 shrink-0 lg:block @min-[63rem]/table-map:w-40 @min-[76rem]/table-map:w-64">
              <SearchInput
                aria-label="Tìm bàn"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onClear={() => setSearchQuery("")}
                placeholder="Tìm bàn, khu vực…"
                size="default"
                variant="pill"
              />
            </div>

            {/* Chuông thông báo real-time qua WebSocket (FR-SRV-03, FR-CUS-10, FR-CUS-07) */}
            <NotificationBell variant="header" className="shrink-0" />
            {branchId && (
              <Link
                to={takeawayCreatePath(pathname)}
                title="Đơn mang về"
                className={cn(
                  buttonVariants({ variant: "outline" }),
                  "h-10 px-2.5 @min-[63rem]/table-map:px-3.5",
                )}
              >
                <ShoppingBag aria-hidden="true" className="@min-[63rem]/table-map:hidden" />
                <span className="sr-only @min-[63rem]/table-map:not-sr-only">+ Đơn mang về</span>
              </Link>
            )}

            {/* Nút Danh sách đặt — số đếm lấy từ phiên ĐẶT TRƯỚC thật */}
            <Button
              type="button"
              variant="outline"
              disabled={!canUseTables}
              title="Danh sách đặt"
              onClick={() => setIsReservationPanelOpen(true)}
              className="h-10 gap-1.5 border-border-strong bg-surface-card px-2.5 text-sm font-semibold text-text-primary shadow-2xs hover:bg-surface-muted hover:text-text-primary @min-[63rem]/table-map:px-3.5"
            >
              <CalendarCheck className="size-4 text-text-secondary" />
              <span className="sr-only @min-[63rem]/table-map:not-sr-only">Danh sách đặt</span>
              {canUseTables && reservedCount > 0 ? (
                <span className="flex size-5 items-center justify-center rounded-full bg-[#2E90FA] text-[11px] font-bold text-white">
                  {reservedCount}
                </span>
              ) : null}
            </Button>

            {/* Nút Chuyển / Gộp bàn (FR-SRV-06) */}
            <Button
              type="button"
              variant="outline"
              disabled={!canUseTables}
              title="Chuyển / Gộp bàn"
              onClick={() => {
                const transferPath =
                  role === APP_ROLE.BRANCH_MANAGER
                    ? BRANCH_MANAGER_PATHS.TRANSFER_MERGE_TABLE
                    : role === APP_ROLE.RESTAURANT_ADMIN
                      ? RESTAURANT_ADMIN_PATHS.TRANSFER_MERGE_TABLE
                      : role === APP_ROLE.CASHIER
                        ? CASHIER_PATHS.TRANSFER_MERGE_TABLE
                        : WAITER_PATHS.TRANSFER_MERGE_TABLE
                navigate(transferPath)
              }}
              className="h-10 gap-1.5 border-border-strong bg-surface-card px-2.5 text-sm font-semibold text-text-primary shadow-2xs hover:bg-surface-muted hover:text-text-primary @min-[63rem]/table-map:px-3.5"
            >
              <ArrowRightLeft className="size-4 text-text-secondary" />
              <span className="sr-only @min-[63rem]/table-map:not-sr-only">Chuyển / Gộp bàn</span>
            </Button>

            {isBranchInactive || !canReserve ? null : (
              <>
                {/* Nút Đặt bàn — mở modal ĐẶT TRƯỚC.
              Trước đây nút này mở OpenTableModal, tức MỞ BÀN ngay cho khách vãng lai —
              sai nghiệp vụ: đặt bàn là giữ chỗ theo giờ hẹn (FR-TBL-03). */}
                <Button
                  type="button"
                  disabled={!canUseTables}
                  onClick={() => {
                    if (availableTables.length === 0) {
                      toast({
                        title: "Không còn bàn trống",
                        description: "Tất cả các bàn hiện đang có khách hoặc đã được đặt.",
                      })
                      return
                    }
                    setIsReservationModalOpen(true)
                  }}
                  className="h-10 gap-1.5 bg-brand-primary px-3 text-sm font-semibold text-text-on-brand shadow-xs hover:bg-brand-primary-hover @min-[63rem]/table-map:px-4"
                >
                  <Plus className="size-4" strokeWidth={2.5} />
                  <span>Đặt bàn</span>
                </Button>
              </>
            )}
          </div>
        }
      />

      {branchId && <ServiceModeLinks path={pathname} mode="table" count={takeawayOrders?.length} />}
      {staffCallId > 0 && <StaffCallNotice notificationId={staffCallId} />}
      {targetTableId > 0 && (
        <div className="px-4 pt-4 sm:px-8">
          <Button type="button" variant="outline" onClick={resetFilters}>
            Hiện tất cả bàn
          </Button>
        </div>
      )}
      {isBranchInactive ? (
        <div
          role="status"
          className="mx-6 mt-6 rounded-xl border border-status-warning/40 bg-status-warning/10 px-4 py-3 text-sm text-text-primary sm:mx-8"
        >
          <strong>Chi nhánh đang ngừng hoạt động.</strong> Không thể mở bàn hoặc đặt bàn mới; dữ
          liệu lịch sử vẫn xem được.
        </div>
      ) : null}

      <div className="flex items-center gap-2 px-4 pt-4 sm:px-8 lg:hidden">
        <div className="min-w-0 flex-1">
          <SearchInput
            aria-label="Tìm bàn"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onClear={() => setSearchQuery("")}
            placeholder="Tìm bàn, khu vực…"
            className="h-11 text-base"
          />
        </div>
        <Button
          type="button"
          size="icon"
          variant="outline"
          aria-label={`Danh sách đặt bàn${canUseTables && reservedCount > 0 ? ` (${reservedCount} lịch)` : ""}`}
          onClick={() => setIsReservationPanelOpen(true)}
          disabled={!canUseTables}
          className="relative border-border-default bg-surface-card text-text-primary md:hidden"
        >
          <CalendarCheck aria-hidden="true" />
          {canUseTables && reservedCount > 0 ? (
            <span
              aria-hidden="true"
              className="absolute -right-1 -top-1 min-w-5 rounded-full bg-status-info-subtle px-1 text-[11px] leading-5 text-sky-900"
            >
              {reservedCount}
            </span>
          ) : null}
        </Button>
      </div>

      {/* Chú giải có chấm màu — chỉ desktop, màn hẹp dùng chip lọc bên dưới */}
      <div
        role="group"
        aria-label="Lọc trạng thái bàn"
        className="hidden flex-wrap items-center gap-6 px-6 pt-6 sm:px-8 lg:flex"
      >
        {STATUS_LEGENDS.map((legend) => {
          const isSelected = selectedFilter === legend.status
          return (
            <button
              key={legend.status}
              type="button"
              aria-pressed={isSelected}
              onClick={() =>
                setSelectedFilter(selectedFilter === legend.status ? "ALL" : legend.status)
              }
              className={cn(
                "group flex items-center gap-2 text-sm font-medium transition-colors cursor-pointer py-1",
                isSelected
                  ? "text-text-primary font-semibold"
                  : "text-text-secondary hover:text-text-primary",
              )}
            >
              <span
                className={cn(
                  "size-2.5 rounded-full transition-transform group-hover:scale-125",
                  legend.dotClass,
                  isSelected && "ring-2 ring-brand-primary/40 scale-110",
                )}
              />
              <span>{legend.label}</span>
            </button>
          )
        })}
      </div>

      {/* Chip lọc nhanh — tablet & mobile */}
      <div
        role="group"
        aria-label="Lọc trạng thái bàn"
        className="flex items-center gap-2 overflow-x-auto px-4 pt-2 pb-1 max-md:flex-wrap max-md:overflow-visible [-ms-overflow-style:none] [scrollbar-width:none] sm:px-8 lg:hidden [&::-webkit-scrollbar]:hidden"
      >
        {QUICK_FILTERS.map((filter) => (
          <Chip
            key={filter.status}
            aria-label={filter.label}
            selected={selectedFilter === filter.status}
            onClick={() => setSelectedFilter(filter.status)}
            className="h-11 shrink-0 cursor-pointer"
          >
            <span className="sm:hidden">{filter.shortLabel}</span>
            <span className="hidden sm:inline">{filter.label}</span>
          </Chip>
        ))}
      </div>

      <div className="space-y-5 px-4 pb-6 pt-4 sm:px-8 sm:pb-8 lg:space-y-7 lg:pt-6">
        {hasSnapshot && totalCount > 0 ? (
          <div
            role="group"
            aria-label="Lọc theo khu vực và sức chứa"
            className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-3"
          >
            {tableAreas.length > 1 ? (
              <Select value={selectedArea} onValueChange={setAreaFilter}>
                <SelectTrigger
                  aria-label="Khu vực"
                  className="w-full min-w-0 sm:w-48 [&>span]:truncate"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="max-w-[calc(100vw-2rem)]">
                  <SelectItem value="all">Tất cả khu vực</SelectItem>
                  {tableAreas.map((area) => (
                    <SelectItem key={area.key} value={area.key} className="break-words">
                      {area.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : null}
            <Select
              value={String(minimumSeats)}
              onValueChange={(value) => setMinimumSeats(Number(value))}
            >
              <SelectTrigger
                aria-label="Sức chứa tối thiểu"
                className="w-full min-w-0 sm:w-44 [&>span]:truncate"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="0">Mọi sức chứa</SelectItem>
                {seatOptions.map((seats) => (
                  <SelectItem key={seats} value={String(seats)}>
                    Từ {seats} chỗ
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters && filteredAreas.length > 0 ? (
              <Button
                type="button"
                variant="link"
                onClick={resetFilters}
                className="col-span-2 w-fit px-0 sm:px-3"
              >
                Đặt lại bộ lọc
              </Button>
            ) : null}
          </div>
        ) : null}
        {mapError ? (
          <div className="flex flex-wrap items-center justify-between gap-4 rounded-card border border-amber-200 bg-amber-50 p-4 text-amber-950">
            <div role="alert" className="flex min-w-0 items-start gap-2.5">
              <CircleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-semibold">
                  {hasSnapshot ? "Chưa cập nhật được sơ đồ bàn" : "Không tải được sơ đồ bàn"}
                </p>
                <p className="mt-1 text-sm">
                  {hasSnapshot
                    ? "Dữ liệu có thể đã cũ. Thử tải lại để tiếp tục thao tác trên bàn."
                    : "Chưa lấy được dữ liệu bàn hoặc phiên phục vụ. Vui lòng thử lại."}
                </p>
              </div>
            </div>
            <Button type="button" variant="outline" onClick={retryMap} disabled={retryingMap}>
              {retryingMap ? "Đang tải lại…" : "Thử lại"}
            </Button>
          </div>
        ) : !hasSnapshot ? (
          <p
            role="status"
            className="rounded-card border border-border-default bg-surface-card p-6 text-center text-sm text-text-secondary"
          >
            {headerStatus}
          </p>
        ) : null}

        {hasSnapshot && filteredAreas.length > 0 ? (
          filteredAreas.map((area) => (
            <section key={area.key} aria-label={area.label} className="space-y-2.5 lg:space-y-3.5">
              <div className="flex items-baseline justify-between gap-3">
                <h2 className="min-w-0 break-words text-base font-bold text-text-primary">
                  {area.label}
                </h2>
                <span className="shrink-0 text-sm text-text-secondary">
                  {area.tables.length} bàn
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3 lg:grid-cols-4 lg:gap-4">
                {area.tables.map((table) => (
                  <TableCard
                    key={table.id}
                    table={table}
                    displayStatus={table.displayStatus}
                    customStatusLabel={table.customStatusLabel}
                    subLabel={
                      table.displayStatus === "AVAILABLE" && !canUseTables
                        ? undefined
                        : table.subLabel
                    }
                    elapsedMinutes={table.elapsedMinutes}
                    timeText={table.timeText}
                    guestCount={table.guestCount}
                    subtotal={table.subtotal}
                    topRightIcon={
                      table.hasAlert ? (
                        <Bell aria-hidden="true" className="size-3.5 text-brand-primary" />
                      ) : undefined
                    }
                    compactOnMobile
                    disabled={!canUseTables}
                    onClick={() => handleTableClick(table, area.label)}
                  />
                ))}
              </div>
            </section>
          ))
        ) : canUseTables ? (
          <div className="rounded-card border border-border-default bg-surface-card p-6 text-center">
            <p className="font-semibold text-text-primary">
              {totalCount === 0 ? "Chi nhánh chưa có bàn" : "Không tìm thấy bàn nào phù hợp"}
            </p>
            {totalCount > 0 ? (
              <Button type="button" variant="outline" onClick={resetFilters} className="mt-3">
                Đặt lại bộ lọc
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* ============================================================
          4. MODAL MỞ BÀN (POPUP DIALOG)
          ============================================================ */}
      <OpenTableModal
        isOpen={canUseTables && isModalOpen}
        table={selectedTableForOpen}
        session={selectedTableForOpen?.session}
        onClose={handleCloseModal}
      />

      {/* ============================================================
          5. ĐẶT BÀN TRƯỚC (FR-TBL-03)
          ============================================================ */}
      <ReservationModal
        isOpen={canUseTables && canReserve && isReservationModalOpen}
        availableTables={availableTables}
        holdMinutes={branch?.reservationHoldMinutes}
        onClose={() => setIsReservationModalOpen(false)}
      />

      <ReservationListPanel
        open={canUseTables && isReservationPanelOpen}
        onOpenChange={setIsReservationPanelOpen}
        sessions={sessionsData}
        holdMinutes={branch?.reservationHoldMinutes}
        canCancel={canReserve}
        onCreateReservation={
          isBranchInactive || !canReserve
            ? undefined
            : () => {
                if (availableTables.length === 0) {
                  toast({
                    title: "Không còn bàn trống",
                    description: "Tất cả các bàn hiện đang có khách hoặc đã được đặt.",
                  })
                  return
                }
                setIsReservationModalOpen(true)
              }
        }
      />
    </div>
  )
}

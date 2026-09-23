import * as React from "react";
import { useNavigate, generatePath } from "react-router-dom";
import { Bell, CalendarCheck, Plus } from "lucide-react";
import { Chip } from "@/components/common/Chip";
import { PageHeader } from "@/components/layout/PageHeader";
import { NotificationBell } from "@/components/layout/NotificationBell";
import { FAB } from "@/components/common/FAB";
import { FAB_POSITION_CLASS } from "@/components/layout/StickyActionBar";
import {
  TableCard,
  type TableDisplayStatus,
} from "@/components/common/TableCard";
import { SearchInput } from "@/components/common/SearchInput";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth.store";
import { APP_ROLE } from "@/config/roles";
import {
  WAITER_PATHS,
  CASHIER_PATHS,
  BRANCH_MANAGER_PATHS,
  RESTAURANT_ADMIN_PATHS,
} from "@/app/router/paths";
import { OpenTableModal } from "../OpenTableModal";
import { ReservationModal } from "../ReservationModal";
import { ReservationListPanel } from "../ReservationListPanel";
import { cn } from "@/lib/utils";
import {
  useTablesByBranch,
  useOpenSessionsByBranch,
  useBranch,
} from "@/features/shared/floor-ops/api";
import type { DiningTable, TableSession } from "@/types/models";
import { TABLE_DISPLAY_STATUS_LABEL } from "@/types/enums";

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
  session?: TableSession;
  displayStatus: TableDisplayStatus;
  customStatusLabel?: string;
  subLabel?: string;
  elapsedMinutes?: number;
  timeText?: string;
  guestCount?: number;
  subtotal?: string;
  hasAlert?: boolean;
}

function computeDisplayStatus(
  table: DiningTable,
  session?: TableSession,
): TableDisplayStatus {
  if (!session) return table.status;
  
  switch (session.status) {
    case "WAITING_FOR_OPEN":
      return "WAITING_OPEN";
    case "SERVING":
      return "OCCUPIED";
    case "WAITING_FOR_PAY":
      return "AWAITING_PAYMENT";
    case "RESERVED":
      return "RESERVED";
    case "MERGED":
      return "MERGED";
    case "CLOSED":
    case "CANCELLED":
      return table.status; // Session đã đóng, dùng trạng thái bàn
    default:
      return table.status;
  }
}

function computeElapsedMinutes(session?: TableSession): number | undefined {
  if (!session?.openedAt) return undefined;
  const opened = new Date(session.openedAt);
  const now = new Date();
  return Math.floor((now.getTime() - opened.getTime()) / 60000);
}

function mergeTableData(
  tables: DiningTable[],
  sessions: TableSession[],
): TableItem[] {
  const sessionsByTable = new Map<number, TableSession>();
  sessions.forEach((s) => sessionsByTable.set(s.tableId, s));

  return tables.map((table) => {
    const session = sessionsByTable.get(table.id);
    const displayStatus = computeDisplayStatus(table, session);
    const elapsedMinutes = computeElapsedMinutes(session);

    const item: TableItem = {
      ...table,
      session,
      displayStatus,
      elapsedMinutes,
      guestCount: session?.guestCount,
    };

    // Tùy chỉnh subLabel theo trạng thái
    if (displayStatus === "WAITING_OPEN") {
      item.subLabel = "— khách · vừa quét QR";
      item.subtotal = "—";
    } else if (displayStatus === "AVAILABLE") {
      item.subLabel = "Nhấn để mở bàn";
    } else if (displayStatus === "RESERVED") {
      // FR-SRV-01: bàn ĐẶT TRƯỚC hiển thị kèm GIỜ HẸN và TÊN KHÁCH đã đặt.
      // `reservationName` là cột của luồng đặt bàn qua phiên (POST /table-sessions);
      // luồng cũ `POST /tables/{id}/reserve` ghi vào customer_name và KHÔNG được
      // TableSessionResponse trả về — xem docs/be-issues.md.
      if (session?.reservationTime) {
        const time = new Date(session.reservationTime);
        item.timeText = time.toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        });
      }
      const reservedInfo = [
        item.timeText,
        session?.reservationName,
        session?.guestCount ? `${session.guestCount} khách` : null,
      ].filter(Boolean);
      if (reservedInfo.length > 0) {
        item.subLabel = reservedInfo.join(" · ");
      }
    }

    // TODO: Tính subtotal từ orders của session (cần API GET /orders/session/{id})
    // Hiện tại để placeholder
    if (displayStatus === "OCCUPIED" || displayStatus === "AWAITING_PAYMENT") {
      item.subtotal = "—";
    }

    return item;
  });
}

/** ORDER_DETAIL theo role — Thu ngân không có màn Order chi tiết (chỉ xem tạm tính). */
const ORDER_DETAIL_PATH_BY_ROLE: Partial<Record<string, string>> = {
  [APP_ROLE.WAITER]: WAITER_PATHS.ORDER_DETAIL,
  [APP_ROLE.BRANCH_MANAGER]: BRANCH_MANAGER_PATHS.ORDER_DETAIL,
  [APP_ROLE.RESTAURANT_ADMIN]: RESTAURANT_ADMIN_PATHS.ORDER_DETAIL,
};

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
  status: TableDisplayStatus | "ALL";
  label: string;
  shortLabel: string;
}> = [
  { status: "ALL", label: "Tất cả", shortLabel: "Tất cả" },
  { status: "AVAILABLE", label: "Trống", shortLabel: "Trống" },
  { status: "OCCUPIED", label: "Đang phục vụ", shortLabel: "Phục vụ" },
  { status: "AWAITING_PAYMENT", label: "Chờ thanh toán", shortLabel: "Chờ TT" },
];

/**
 * Danh mục chú giải trạng thái (Status Legend) hiển thị ở đầu sơ đồ bàn
 */
const STATUS_LEGENDS: Array<{
  status: TableDisplayStatus;
  label: string;
  dotClass: string;
}> = [
  { status: "AVAILABLE", label: TABLE_DISPLAY_STATUS_LABEL.AVAILABLE, dotClass: "bg-[#9CA3AF]" },
  { status: "WAITING_OPEN", label: TABLE_DISPLAY_STATUS_LABEL.WAITING_OPEN, dotClass: "bg-[#2E90FA]" },
  { status: "OCCUPIED", label: TABLE_DISPLAY_STATUS_LABEL.OCCUPIED, dotClass: "bg-[#F0522B]" },
  {
    status: "AWAITING_PAYMENT",
    label: TABLE_DISPLAY_STATUS_LABEL.AWAITING_PAYMENT,
    dotClass: "bg-[#F59E0B]",
  },
  { status: "RESERVED", label: "Đặt trước", dotClass: "bg-[#7F56D9]" },
  { status: "MERGED", label: "Đã gộp", dotClass: "bg-[#667085]" },
];

/**
 * Sơ đồ bàn (Desktop / Sơ đồ bàn) — Tỉ lệ chuẩn 1440x1024
 * Hiển thị tổng quan các bàn ăn của nhà hàng, thống kê số lượng bàn theo trạng thái,
 * thanh tìm kiếm & lọc nhanh, và kích hoạt modal mở bàn khi nhân viên tương tác.
 */
export default function TableMapPage() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const role = useAuthStore((s) => s.role);
  const branchId = useAuthStore((s) => s.branchId);

  // State cho modal và filter
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedTableForOpen, setSelectedTableForOpen] = React.useState<TableItem | null>(null);
  const [isReservationModalOpen, setIsReservationModalOpen] = React.useState(false);
  const [isReservationPanelOpen, setIsReservationPanelOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [selectedFilter, setSelectedFilter] = React.useState<TableDisplayStatus | "ALL">("ALL");

  // Fetch data từ API, tự động refresh mỗi 1 giây
  const { data: tablesData = [], isLoading: tablesLoading } = useTablesByBranch(
    branchId ?? undefined,
    undefined,
    { refetchInterval: 1000 },
  );
  const { data: sessionsData = [], isLoading: sessionsLoading } = useOpenSessionsByBranch(
    branchId ?? undefined,
    { refetchInterval: 1000 },
  );

  // Merge data
  const tables = React.useMemo(
    () => mergeTableData(tablesData, sessionsData),
    [tablesData, sessionsData],
  );

  // Cấu hình chi nhánh — cần `reservationHoldMinutes` để cảnh báo lịch sắp quá giờ (BR-29).
  const { data: branch } = useBranch(branchId ?? undefined);
  // Chi nhánh ngừng hoạt động (FR-BRN-01): không mở phiên mới, không nhận đặt bàn mới.
  // BE chỉ chặn ở luồng khách quét QR nên FE phải ẩn/khoá các lối vào phía nhân viên.
  const isBranchInactive = branch?.status === "INACTIVE";

  // Bàn còn trống để đặt trước (BR-29: chỉ đặt được bàn không có phiên nào đang mở).
  const availableTables = React.useMemo(
    () => tables.filter((t) => t.displayStatus === "AVAILABLE"),
    [tables],
  );

  const reservedCount = React.useMemo(
    () => sessionsData.filter((s) => s.status === "RESERVED").length,
    [sessionsData],
  );

  // Thống kê số lượng
  const totalCount = tables.length;
  const occupiedCount = tables.filter(
    (t) => t.displayStatus === "OCCUPIED",
  ).length;
  const awaitingPaymentCount = tables.filter(
    (t) => t.displayStatus === "AWAITING_PAYMENT",
  ).length;

  // Dòng phụ của header mobile (StaffLayout) — Figma mobile hiển thị
  // "12 bàn · 5 đang phục vụ" ngay dưới tiêu đề. Trên mobile header riêng của trang
  // này bị ẩn nên số liệu phải đẩy lên header chung.
  const headerSubtitle =
    tablesLoading || sessionsLoading
      ? "Đang tải..."
      : `${totalCount} bàn · ${occupiedCount} đang phục vụ`;
  // Lọc danh sách bàn theo từ khóa tìm kiếm và trạng thái được chọn
  const filteredTables = React.useMemo(() => {
    return tables.filter((table) => {
      const matchSearch =
        !searchQuery.trim() ||
        table.name.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        (table.subLabel &&
          table.subLabel
            .toLowerCase()
            .includes(searchQuery.toLowerCase().trim()));

      const matchStatus =
        selectedFilter === "ALL" || table.displayStatus === selectedFilter;

      return matchSearch && matchStatus;
    });
  }, [tables, searchQuery, selectedFilter]);

  function handleTableClick(table: TableItem) {
    // Bàn "Chờ thanh toán" — Thu ngân bấm vào để mở màn Thanh toán
    if (
      table.displayStatus === "AWAITING_PAYMENT" &&
      role === APP_ROLE.CASHIER
    ) {
      if (table.session?.id) {
        navigate(
          generatePath(CASHIER_PATHS.CHECKOUT, {
            tableSessionId: String(table.session.id),
          }),
        );
      }
      return;
    }

    // Bàn "Đang phục vụ" (hoặc "Chờ thanh toán" ở role không phải Thu ngân) — mở Order chi tiết
    if (
      table.displayStatus === "OCCUPIED" ||
      table.displayStatus === "AWAITING_PAYMENT"
    ) {
      const orderDetailPath = role
        ? ORDER_DETAIL_PATH_BY_ROLE[role]
        : undefined;
      if (orderDetailPath && table.session?.id) {
        // TODO: Cần lấy orderId thực từ session, hiện tạm dùng sessionId
        navigate(generatePath(orderDetailPath, { orderId: String(table.session.id) }));
        return;
      }
      // Thu ngân ở bàn "Đang phục vụ": chỉ xem tạm tính trên sơ đồ bàn, không có Order chi tiết
      toast({
        title: table.name,
        description: `Tạm tính hiện tại: ${table.subtotal ?? "0đ"}.`,
      });
      return;
    }

    // Bàn trống, chờ mở bàn, hoặc đặt trước — mở modal Mở bàn
    if (isBranchInactive) {
      toast({
        title: "Chi nhánh đang ngừng hoạt động",
        description: "Không thể mở bàn mới. Kích hoạt lại chi nhánh ở trang Chi nhánh.",
      });
      return;
    }
    setSelectedTableForOpen(table);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedTableForOpen(null);
  }

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page">
      {/* ============================================================
          1. HEADER BAR: TIÊU ĐỀ + THỐNG KÊ + ACTIONS
          Theo Figma "Desktop / Sơ đồ bàn": vùng tiêu đề là thanh nền TRẮNG
          (surface-card) có đường kẻ dưới, tách hẳn khỏi phần nội dung nền xám
          (surface-page). Legend trạng thái và nhãn khu vực nằm dưới, trên nền xám.
          ============================================================ */}
      <PageHeader
        title="Sơ đồ bàn"
        subtitle={
          tablesLoading || sessionsLoading
            ? "Đang tải..."
            : `${totalCount} bàn · ${occupiedCount} đang phục vụ · ${awaitingPaymentCount} chờ thanh toán`
        }
        mobileSubtitle={headerSubtitle}
        actions={
          <>
          {/* Ô tìm kiếm — ẩn ở tablet cho đỡ chật (Figma 834 không có ô này) */}
          <div className="hidden w-56 lg:block lg:w-64">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Tìm bàn..."
              size="default"
              variant="pill"
            />
          </div>

          {/* Chuông thông báo real-time qua WebSocket (FR-SRV-03, FR-CUS-10, FR-CUS-07) */}
          <NotificationBell variant="header" />

          {/* Nút Danh sách đặt — số đếm lấy từ phiên ĐẶT TRƯỚC thật */}
          <Button
            type="button"
            variant="outline"
            onClick={() => setIsReservationPanelOpen(true)}
            className="h-10 border-border-strong bg-surface-card px-4 text-sm font-semibold text-text-primary hover:bg-surface-muted hover:text-text-primary gap-2 shadow-2xs"
          >
            <CalendarCheck className="size-4 text-text-secondary" />
            {/* Tablet chỉ hiện icon + số đếm, desktop mới có chữ (Figma 834) */}
            <span className="hidden lg:inline">Danh sách đặt</span>
            <span className="sr-only lg:hidden">Danh sách đặt</span>
            {reservedCount > 0 ? (
              <span className="flex size-5 items-center justify-center rounded-full bg-[#2E90FA] text-[11px] font-bold text-white">
                {reservedCount}
              </span>
            ) : null}
          </Button>

          {isBranchInactive ? null : (
          <>
          {/* Nút Đặt bàn — mở modal ĐẶT TRƯỚC.
              Trước đây nút này mở OpenTableModal, tức MỞ BÀN ngay cho khách vãng lai —
              sai nghiệp vụ: đặt bàn là giữ chỗ theo giờ hẹn (FR-TBL-03). */}
          <Button
            type="button"
            onClick={() => {
              if (availableTables.length === 0) {
                toast({
                  title: "Không còn bàn trống",
                  description: "Tất cả các bàn hiện đang có khách hoặc đã được đặt.",
                });
                return;
              }
              setIsReservationModalOpen(true);
            }}
            className="h-10 bg-brand-primary px-5 text-sm font-semibold text-text-on-brand hover:bg-brand-primary-hover shadow-xs gap-1.5"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            <span>Đặt bàn</span>
          </Button>
          </>
          )}
          </>
        }
      />

      {isBranchInactive ? (
        <div
          role="status"
          className="mx-6 mt-6 rounded-xl border border-status-warning/40 bg-status-warning/10 px-4 py-3 text-sm text-text-primary sm:mx-8"
        >
          <strong>Chi nhánh đang ngừng hoạt động.</strong> Không thể mở bàn hoặc đặt bàn mới; dữ
          liệu lịch sử vẫn xem được.
        </div>
      ) : null}

      {/* ============================================================
          2. STATUS LEGEND / FILTER BAR
          ============================================================ */}
      {/* Chú giải có chấm màu — chỉ desktop, màn hẹp dùng chip lọc bên dưới */}
      <div className="hidden flex-wrap items-center gap-6 px-6 pt-6 sm:px-8 lg:flex">
        {STATUS_LEGENDS.map((legend) => {
          const isSelected = selectedFilter === legend.status;
          return (
            <button
              key={legend.status}
              type="button"
              onClick={() =>
                setSelectedFilter(
                  selectedFilter === legend.status ? "ALL" : legend.status,
                )
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
          );
        })}

        {selectedFilter !== "ALL" && (
          <button
            type="button"
            onClick={() => setSelectedFilter("ALL")}
            className="text-xs font-semibold text-brand-primary hover:underline ml-2"
          >
            Xóa bộ lọc
          </button>
        )}
      </div>

      {/* Chip lọc nhanh — tablet & mobile */}
      <div className="flex items-center gap-2 overflow-x-auto px-4 pt-4 pb-1 [-ms-overflow-style:none] [scrollbar-width:none] sm:px-8 lg:hidden [&::-webkit-scrollbar]:hidden">
        {QUICK_FILTERS.map((filter) => (
          <Chip
            key={filter.status}
            selected={selectedFilter === filter.status}
            onClick={() => setSelectedFilter(filter.status)}
            className="cursor-pointer"
          >
            <span className="sm:hidden">{filter.shortLabel}</span>
            <span className="hidden sm:inline">{filter.label}</span>
          </Chip>
        ))}
      </div>

      {/* ============================================================
          3. AREA SECTION & TABLE GRID
          ============================================================ */}
      <div className="space-y-4 px-6 pb-6 pt-6 sm:px-8 sm:pb-8">
        {/* Phân khu */}
        <h2 className="text-xs font-bold uppercase tracking-wider text-text-tertiary">
          KHU VỰC TẦNG 1
        </h2>

        {/* Lưới 12 bàn: 4 cột x 3 dòng */}
        {filteredTables.length > 0 ? (
          <div className="grid grid-cols-1 gap-4.5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredTables.map((table) => {
              // Icon phụ góc trên phải cho bàn B01 (chuông gọi phục vụ / thông báo)
              const topRightIcon = table.hasAlert ? (
                <span className="flex size-6 items-center justify-center rounded-full bg-[#FEEBE4] text-[#F0522B]">
                  <Bell className="size-3.5" />
                </span>
              ) : null;

              return (
                <TableCard
                  key={table.id}
                  table={table}
                  displayStatus={table.displayStatus}
                  customStatusLabel={table.customStatusLabel}
                  subLabel={table.subLabel}
                  elapsedMinutes={table.elapsedMinutes}
                  timeText={table.timeText}
                  guestCount={table.guestCount}
                  subtotal={table.subtotal}
                  topRightIcon={topRightIcon}
                  onClick={() => handleTableClick(table)}
                />
              );
            })}
          </div>
        ) : (
          <div className="flex h-64 flex-col items-center justify-center rounded-card border border-dashed border-border-strong bg-surface-card p-6 text-center">
            <p className="text-sm font-semibold text-text-secondary">
              Không tìm thấy bàn nào phù hợp
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Hãy thử tìm kiếm với từ khóa khác hoặc tắt bớt bộ lọc trạng thái.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchQuery("");
                setSelectedFilter("ALL");
              }}
              className="mt-4 text-xs"
            >
              Đặt lại bộ lọc
            </Button>
          </div>
        )}
      </div>

      {/* ============================================================
          4. MODAL MỞ BÀN (POPUP DIALOG)
          ============================================================ */}
      <OpenTableModal
        isOpen={isModalOpen}
        table={selectedTableForOpen}
        session={selectedTableForOpen?.session}
        onClose={handleCloseModal}
      />

      {/* FAB — CHỈ mobile. Tablet/PC đã có nút "Danh sách đặt" và "Đặt bàn" trên thanh
          tiêu đề, nhưng ở mobile thanh đó bị ẩn nên đây là lối vào duy nhất.
          Mở PANEL danh sách (không mở thẳng modal đặt bàn): theo FR-TBL-03, Phục vụ cần
          nhận bàn từ màn hình đặt trước, nên xem danh sách là thao tác chính. Muốn đặt
          mới thì bấm "Đặt bàn mới" ở chân panel.
          Vị trí lấy từ hằng số chung để mọi FAB xếp tầng nhất quán với BottomNav. */}
      <div className={FAB_POSITION_CLASS}>
        <FAB
          variant="circle"
          aria-label={`Danh sách đặt bàn${reservedCount > 0 ? ` (${reservedCount} lịch)` : ""}`}
          title="Danh sách đặt bàn"
          icon={<CalendarCheck className="size-6 text-white" strokeWidth={2.5} />}
          onClick={() => setIsReservationPanelOpen(true)}
          className="shadow-lg"
        />
        {reservedCount > 0 ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-1 -top-1 flex min-w-5 items-center justify-center rounded-full bg-[#2E90FA] px-1.5 text-[11px] font-bold text-white shadow-xs"
          >
            {reservedCount}
          </span>
        ) : null}
      </div>

      {/* ============================================================
          5. ĐẶT BÀN TRƯỚC (FR-TBL-03)
          ============================================================ */}
      <ReservationModal
        isOpen={isReservationModalOpen}
        availableTables={availableTables}
        onClose={() => setIsReservationModalOpen(false)}
      />

      <ReservationListPanel
        open={isReservationPanelOpen}
        onOpenChange={setIsReservationPanelOpen}
        sessions={sessionsData}
        holdMinutes={branch?.reservationHoldMinutes}
        onCreateReservation={isBranchInactive ? undefined : () => {
          if (availableTables.length === 0) {
            toast({
              title: "Không còn bàn trống",
              description: "Tất cả các bàn hiện đang có khách hoặc đã được đặt.",
            });
            return;
          }
          setIsReservationModalOpen(true);
        }}
      />
    </div>
  );
}
import * as React from "react";
import { useNavigate, generatePath } from "react-router-dom";
import { Bell, CalendarCheck, Plus } from "lucide-react";
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
import { cn } from "@/lib/utils";
import {
  useTablesByBranch,
  useOpenSessionsByBranch,
} from "@/features/shared/floor-ops/api";
import type { DiningTable, TableSession } from "@/types/models";

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
    } else if (displayStatus === "RESERVED" && session?.reservationTime) {
      const time = new Date(session.reservationTime);
      item.timeText = time.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
      });
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
 * Danh mục chú giải trạng thái (Status Legend) hiển thị ở đầu sơ đồ bàn
 */
const STATUS_LEGENDS: Array<{
  status: TableDisplayStatus;
  label: string;
  dotClass: string;
}> = [
  { status: "AVAILABLE", label: "Trống", dotClass: "bg-[#9CA3AF]" },
  { status: "WAITING_OPEN", label: "Chờ mở bàn", dotClass: "bg-[#2E90FA]" },
  { status: "OCCUPIED", label: "Đang phục vụ", dotClass: "bg-[#F0522B]" },
  {
    status: "AWAITING_PAYMENT",
    label: "Chờ thanh toán",
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

  // Thống kê số lượng
  const totalCount = tables.length;
  const occupiedCount = tables.filter(
    (t) => t.displayStatus === "OCCUPIED",
  ).length;
  const awaitingPaymentCount = tables.filter(
    (t) => t.displayStatus === "AWAITING_PAYMENT",
  ).length;

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
    setSelectedTableForOpen(table);
    setIsModalOpen(true);
  }

  function handleCloseModal() {
    setIsModalOpen(false);
    setSelectedTableForOpen(null);
  }

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page p-6 sm:p-8 space-y-6">
      {/* ============================================================
          1. HEADER ROW: TIÊU ĐỀ + THỐNG KÊ + ACTIONS
          ============================================================ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Tiêu đề & Subtitle thống kê */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Sơ đồ bàn
          </h1>
          {tablesLoading || sessionsLoading ? (
            <p className="mt-1 text-sm text-text-tertiary">Đang tải...</p>
          ) : (
            <p className="mt-1 text-sm text-text-tertiary">
              {totalCount} bàn · {occupiedCount} đang phục vụ ·{" "}
              {awaitingPaymentCount} chờ thanh toán
            </p>
          )}
        </div>

        {/* Action bar: Search, Bell notification, Danh sách đặt, Đặt bàn */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Ô tìm kiếm */}
          <div className="w-56 sm:w-64">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onClear={() => setSearchQuery("")}
              placeholder="Tìm bàn..."
              size="default"
              variant="pill"
            />
          </div>

          {/* Chuông thông báo */}
          <button
            type="button"
            className="relative flex size-10 items-center justify-center rounded-full border border-border-default bg-surface-card text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary shadow-2xs"
            title="Thông báo"
          >
            <Bell className="size-4" />
            <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-text-on-brand shadow-xs">
              4
            </span>
          </button>

          {/* Nút Danh sách đặt */}
          <Button
            type="button"
            variant="outline"
            onClick={() =>
              toast({
                title: "Danh sách đặt bàn",
                description: "Hiện có 3 lịch đặt trước trong ngày.",
              })
            }
            className="h-10 rounded-pill border-border-strong bg-surface-card px-4 text-sm font-semibold text-text-primary hover:bg-surface-muted hover:text-text-primary gap-2 shadow-2xs"
          >
            <CalendarCheck className="size-4 text-text-secondary" />
            <span>Danh sách đặt</span>
            <span className="flex size-5 items-center justify-center rounded-full bg-[#2E90FA] text-[11px] font-bold text-white">
              3
            </span>
          </Button>

          {/* Nút Đặt bàn */}
          <Button
            type="button"
            onClick={() => {
              const availableTable = tables.find(
                (t) => t.displayStatus === "AVAILABLE",
              );
              if (availableTable) {
                setSelectedTableForOpen(availableTable);
                setIsModalOpen(true);
              } else {
                toast({
                  title: "Thông báo",
                  description: "Tất cả các bàn hiện đang có khách hoặc đã đặt.",
                });
              }
            }}
            className="h-10 rounded-pill bg-brand-primary px-5 text-sm font-semibold text-text-on-brand hover:bg-brand-primary-hover shadow-xs gap-1.5"
          >
            <Plus className="size-4" strokeWidth={2.5} />
            <span>Đặt bàn</span>
          </Button>
        </div>
      </div>

      {/* ============================================================
          2. STATUS LEGEND / FILTER BAR
          ============================================================ */}
      <div className="flex flex-wrap items-center gap-6 pt-1">
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

      {/* ============================================================
          3. AREA SECTION & TABLE GRID
          ============================================================ */}
      <div className="space-y-4 pt-2">
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
    </div>
  );
}
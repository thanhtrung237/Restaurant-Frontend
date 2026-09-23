import * as React from "react";
import { KDSTicket } from "@/components/common/KDSTicket";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import { Scale, X, RefreshCw } from "lucide-react";
import {
  useBranch,
  useChangeOrderDetailStatus,
  useConfirmWeight,
  useMarkServed,
  useOpenSessionsByBranch,
} from "@/features/shared/floor-ops/api";
import { ApiError, getErrorMessage } from "@/lib/http";
import type { OrderDetail } from "@/types/models";
import type { OrderDetailStatus } from "@/types/enums";
import {
  formatWeight,
  toKg,
  fromKg,
  WEIGHT_INPUT_CONFIG,
  type WeightUnit,
} from "@/lib/weight";

/**
 * Thời gian trôi qua trên thẻ KDS, theo Figma:
 *  - dưới 1 phút  -> "vừa gửi"
 *  - dưới 60 phút -> "N phút"
 *  - từ 1 giờ     -> "Nh Mm"
 * (Trước đây hiển thị "1h trước" — không khớp Figma và mất phần phút.)
 */
function formatTimeAgo(minutesAgo: number): string {
  if (minutesAgo < 1) return "vừa gửi";
  if (minutesAgo < 60) return `${minutesAgo} phút`;
  return `${Math.floor(minutesAgo / 60)}h ${minutesAgo % 60}m`;
}

type KDSColumn = "AWAITING_CONFIRM" | "COOKING";
type KDSFilter = "ALL" | "AWAITING_CONFIRM" | "COOKING";

interface KDSTicketItem {
  id: number;
  orderDetailId: number;
  tableSessionId: number;
  tableName: string;
  timeAgo: string;
  dishName: string;
  quantity: number;
  note?: string;
  hint?: string;
  requiresWeighing: boolean;
  /** Khối lượng đã cân (kg) — chỉ có khi món đã qua bước "Nhập số cân" (PENDING_WEIGHT → PREPARING). */
  weightKg?: number;
  /** Các tùy chọn đã chọn (size, topping, etc.) */
  options?: Array<{ id: number; optionItemId: number; optionItemName: string; priceSnapshot: number }>;
  column: KDSColumn;
  status: OrderDetailStatus;
}

/**
 * Bếp (KDS) — Kitchen Display System
 * Hiển thị các món ăn đang chờ chế biến từ tất cả bàn của chi nhánh.
 * 
 * API: GET /table-sessions/branch/{branchId}/open (lấy danh sách sessions)
 *      GET /order-details/session/{tableSessionId} cho mỗi session (poll 5s)
 *      PUT /order-details/{id}/status
 *      POST /order-details/{id}/confirm-weight
 *      POST /order-details/{id}/mark-served
 */
export default function KitchenDisplayPage() {
  const { toast } = useToast();

  const branchId = useAuthStore((s) => s.branchId);

  const [mobileTab, setMobileTab] = React.useState<KDSColumn>("AWAITING_CONFIRM");
  const [weighModalTicket, setWeighModalTicket] = React.useState<KDSTicketItem | null>(null);
  const [weightInput, setWeightInput] = React.useState("1.2");
  const [weightUnit, setWeightUnit] = React.useState<WeightUnit>("kg");
  const [filter, setFilter] = React.useState<KDSFilter>("ALL");

  // Fetch all open sessions (làm mới mỗi 1 giây)
  const { data: sessions = [], isLoading: sessionsLoading } = useOpenSessionsByBranch(
    branchId ?? undefined,
    { refetchInterval: 1000 }
  );

  // Aggregate all order details từ tất cả sessions (để đơn giản, tôi sẽ fetch từng session)
  // Trong production, backend nên có endpoint GET /order-details/branch/{branchId}
  const [allOrderDetails, setAllOrderDetails] = React.useState<
    Array<{ sessionId: number; tableName: string; detail: OrderDetail }>
  >([]);

  // Mutations
  // PENDING → PREPARING vẫn dùng PUT /status: backend KHÔNG có endpoint riêng cho bước này.
  const changeStatusMutation = useChangeOrderDetailStatus();
  // PREPARING → SERVED dùng POST /mark-served thay cho PUT /status, vì endpoint này:
  //  - validate đúng chuyển trạng thái (chỉ nhận PREPARING, sai thì trả 409),
  //  - đẩy WebSocket `notifyItemStatusChanged` để khách và Phục vụ thấy ngay (T-01).
  // PUT /status không làm cả hai việc trên — nó set thẳng trạng thái, không kiểm tra gì.
  const markServedMutation = useMarkServed();
  const confirmWeightMutation = useConfirmWeight();

  // Fetch order details cho tất cả sessions (làm mới mỗi 1 giây)
  React.useEffect(() => {
    if (!sessions.length) {
      setAllOrderDetails([]);
      return;
    }

    const fetchInterval = setInterval(async () => {
      const promises = sessions.map(async (session) => {
        try {
          // Endpoint này là public, không cần Authorization header
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1"}/order-details/session/${session.id}`
          );
          if (!response.ok) return [];
          const data = await response.json();
          return (data.data || []).map((detail: OrderDetail) => ({
            sessionId: session.id,
            tableName: session.tableName || `Bàn ${session.tableId}`,
            detail,
          }));
        } catch {
          return [];
        }
      });

      const results = await Promise.all(promises);
      setAllOrderDetails(results.flat());
    }, 1000);

    // Initial fetch
    (async () => {
      const promises = sessions.map(async (session) => {
        try {
          const response = await fetch(
            `${import.meta.env.VITE_API_BASE_URL || "http://localhost:8080/api/v1"}/order-details/session/${session.id}`,
            {
              headers: {
                Authorization: `Bearer ${useAuthStore.getState().accessToken}`,
              },
            }
          );
          if (!response.ok) return [];
          const data = await response.json();
          return (data.data || []).map((detail: OrderDetail) => ({
            sessionId: session.id,
            tableName: session.tableName || `Bàn ${session.tableId}`,
            detail,
          }));
        } catch {
          return [];
        }
      });

      const results = await Promise.all(promises);
      setAllOrderDetails(results.flat());
    })();

    return () => clearInterval(fetchInterval);
  }, [sessions]);

  // Convert OrderDetail to KDSTicketItem
  const tickets = React.useMemo((): KDSTicketItem[] => {
    return allOrderDetails
      .filter(({ detail }) => {
        // Chỉ hiển thị món chưa phục vụ hoặc đã hủy
        return detail.status !== "SERVED" && detail.status !== "CANCELLED";
      })
      .map(({ sessionId, tableName, detail }) => {
        let column: KDSColumn = "AWAITING_CONFIRM";
        if (detail.status === "PREPARING") column = "COOKING";
        else if (detail.status === "PENDING_WEIGHT") column = "AWAITING_CONFIRM";

        const createdAt = detail.createdAt ? new Date(detail.createdAt) : new Date();
        const minutesAgo = Math.floor((Date.now() - createdAt.getTime()) / 60000);
        const timeAgo = formatTimeAgo(minutesAgo);

        return {
          id: detail.id,
          orderDetailId: detail.id,
          tableSessionId: sessionId,
          tableName,
          timeAgo,
          dishName: detail.dishName || "Món ăn",
          quantity: detail.quantity,
          note: detail.note,
          hint:
            detail.status === "PENDING_WEIGHT"
              ? "Bán theo cân · cần cân trước khi gửi bếp"
              : detail.weightKg != null
                ? `Khối lượng: ${formatWeight(detail.weightKg)}`
                : undefined,
          requiresWeighing: detail.status === "PENDING_WEIGHT",
          weightKg: detail.weightKg,
          options: detail.options,
          column,
          status: detail.status,
        };
      });
  }, [allOrderDetails]);

  const totalCount = tickets.length;
  const byColumn = React.useMemo(() => {
    const groups: Record<KDSColumn, KDSTicketItem[]> = {
      AWAITING_CONFIRM: [],
      COOKING: [],
    };
    for (const t of tickets) {
      if (groups[t.column]) {
        groups[t.column].push(t);
      }
    }
    return groups;
  }, [tickets]);

  const totalProcessing = byColumn.AWAITING_CONFIRM.length + byColumn.COOKING.length;

  // Subtitle theo Figma: "<Tên chi nhánh> · N dòng món đang xử lý".
  // Bỏ phần tên nếu chưa tải xong để không hiện dấu "·" cụt.
  const { data: branch } = useBranch(branchId ?? undefined);
  const buildSubtitle = (count: number) =>
    [branch?.name, `${count} dòng món đang xử lý`].filter(Boolean).join(" · ");

  const FILTER_TABS: Array<{ value: KDSFilter; label: string }> = [
    { value: "ALL", label: "Tất cả" },
    { value: "AWAITING_CONFIRM", label: "Chờ xác nhận" },
    { value: "COOKING", label: "Đang chế biến" },
  ];

  const MOBILE_TABS: Array<{
    value: KDSColumn;
    label: string;
    dotColor: string;
  }> = [
    {
      value: "AWAITING_CONFIRM",
      label: "Chờ xác nhận",
      dotColor: "bg-status-info",
    },
    {
      value: "COOKING",
      label: "Đang chế biến",
      dotColor: "bg-status-warning",
    },
  ];

  /**
   * Đưa 1 thẻ về đúng trạng thái trước khi bấm, dùng khi API từ chối.
   * `ticket.status` là trạng thái đọc từ server ở nhịp poll gần nhất.
   */
  function revertTicketStatus(ticket: KDSTicketItem) {
    setAllOrderDetails((prev) =>
      prev.map((item) =>
        item.detail.id === ticket.orderDetailId
          ? { ...item, detail: { ...item.detail, status: ticket.status } }
          : item
      )
    );
  }

  async function handleAction(ticket: KDSTicketItem) {
    try {
      if (ticket.column === "AWAITING_CONFIRM") {
        if (ticket.requiresWeighing) {
          setWeighModalTicket(ticket);
          setWeightUnit("kg");
          setWeightInput("1.2");
        } else {
          // Chuyển từ PENDING → PREPARING
          // Cập nhật giao diện ngay lập tức
          setAllOrderDetails((prev) =>
            prev.map((item) =>
              item.detail.id === ticket.orderDetailId
                ? { ...item, detail: { ...item.detail, status: "PREPARING" } }
                : item
            )
          );
          await changeStatusMutation.mutateAsync({
            id: ticket.orderDetailId,
            status: "PREPARING",
          });
          toast({
            title: "Đã xác nhận món",
            description: `${ticket.dishName} (${ticket.tableName}) đã chuyển sang Đang chế biến.`,
          });
        }
      } else if (ticket.column === "COOKING") {
        // Chuyển từ PREPARING → SERVED
        // Cập nhật giao diện ngay lập tức
        setAllOrderDetails((prev) =>
          prev.map((item) =>
            item.detail.id === ticket.orderDetailId
              ? { ...item, detail: { ...item.detail, status: "SERVED" } }
              : item
          )
        );
        await markServedMutation.mutateAsync(ticket.orderDetailId);
        toast({
          title: "Đã phục vụ",
          description: `${ticket.dishName} (${ticket.tableName}) đã mang ra bàn khách.`,
          variant: "success",
        });
      }
    } catch (error) {
      // Hoàn lại optimistic update: mark-served validate trạng thái ở server nên có thể
      // từ chối (409) khi dòng món vừa bị đổi ở nơi khác — ví dụ Phục vụ huỷ món sau bếp.
      // Không hoàn lại thì thẻ sẽ hiển thị sai cho tới nhịp poll kế tiếp.
      revertTicketStatus(ticket);

      const isConflict = error instanceof ApiError && error.status === 409;
      toast({
        title: isConflict ? "Trạng thái món đã thay đổi" : "Lỗi",
        description: isConflict
          ? `${ticket.dishName} (${ticket.tableName}) vừa được cập nhật ở nơi khác. Danh sách đang được làm mới.`
          : getErrorMessage(error),
        variant: "danger",
      });
    }
  }

  async function handleConfirmWeight() {
    if (!weighModalTicket) return;
    try {
      const rawValue = Number.parseFloat(weightInput);
      if (Number.isNaN(rawValue) || rawValue <= 0) {
        toast({
          title: "Số cân không hợp lệ",
          description: `Vui lòng nhập số cân lớn hơn 0${weightUnit === "g" ? " gram" : " kg"}.`,
          variant: "danger",
        });
        return;
      }

      // FE cho chọn đơn vị kg/g, nhưng BE luôn nhận & tính theo kg — quy đổi trước khi gửi.
      const weightKg = toKg(rawValue, weightUnit);

      // Cập nhật giao diện ngay lập tức
      setAllOrderDetails((prev) =>
        prev.map((item) =>
          item.detail.id === weighModalTicket.orderDetailId
            ? { ...item, detail: { ...item.detail, status: "PREPARING", weightKg } }
            : item
        )
      );

      await confirmWeightMutation.mutateAsync({
        id: weighModalTicket.orderDetailId,
        body: { weightKg },
      });

      toast({
        title: "Đã ghi nhận số cân",
        description: `${weighModalTicket.dishName} (${formatWeight(weightKg)}) đã chuyển sang Đang chế biến.`,
        variant: "success",
      });
      setWeighModalTicket(null);
    } catch (error) {
      toast({
        title: "Lỗi xác nhận cân",
        description: error instanceof Error ? error.message : "Không thể xác nhận số cân.",
        variant: "danger",
      });
    }
  }

  /** Đổi đơn vị nhập cân (kg ⇄ g), quy đổi giá trị đang nhập sang đơn vị mới để giữ nguyên khối lượng thực. */
  function handleWeightUnitChange(nextUnit: WeightUnit) {
    if (nextUnit === weightUnit) return;
    const currentValue = Number.parseFloat(weightInput);
    if (!Number.isNaN(currentValue)) {
      const weightKg = toKg(currentValue, weightUnit);
      const converted = fromKg(weightKg, nextUnit);
      // g nên là số nguyên, kg giữ tối đa 2 chữ số thập phân cho gọn khi hiển thị lại
      const rounded = nextUnit === "g" ? Math.round(converted) : Math.round(converted * 100) / 100;
      setWeightInput(String(rounded));
    }
    setWeightUnit(nextUnit);
  }

  const COLUMN_META: Record<
    KDSColumn,
    { title: string; dotClass: string; visibleInFilter: KDSFilter[] }
  > = {
    AWAITING_CONFIRM: {
      title: "Chờ xác nhận",
      dotClass: "bg-status-info",
      visibleInFilter: ["ALL", "AWAITING_CONFIRM"],
    },
    COOKING: {
      title: "Đang chế biến",
      dotClass: "bg-status-warning",
      visibleInFilter: ["ALL", "COOKING"],
    },
  };

  const visibleColumns = (Object.keys(COLUMN_META) as KDSColumn[]).filter(
    (col) => COLUMN_META[col].visibleInFilter.includes(filter),
  );

  const mobileTickets = byColumn[mobileTab];

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page">
      {/* ============================================================
          A. GIAO DIỆN MOBILE (< md) - KHỚP MOCKUP 375PX
          ============================================================ */}
      <div className="flex flex-col md:hidden">
        {/* 1. Header riêng ĐÃ BỎ: trùng hoàn toàn với MobileHeader biến thể "app" của
            StaffLayout (avatar · tiêu đề + dòng phụ · đăng xuất). Tiêu đề và dòng phụ
            nay đẩy lên đó bằng usePageHeader. */}

        {/* 2. Mobile Pill Filter Tabs */}
        <div className="flex items-center gap-2 px-4 pt-3 pb-2 overflow-x-auto no-scrollbar select-none">
          {MOBILE_TABS.map((tab) => {
            const isSelected = mobileTab === tab.value;
            const count = byColumn[tab.value].length;

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setMobileTab(tab.value)}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-xs font-bold transition-all shrink-0 cursor-pointer select-none",
                  isSelected
                    ? "bg-status-info text-white shadow-xs"
                    : "border border-border-strong bg-surface-card text-text-secondary hover:bg-surface-muted",
                )}
              >
                <span
                  className={cn(
                    "size-2 rounded-full",
                    isSelected ? "bg-white" : tab.dotColor,
                  )}
                />
                <span>{tab.label}</span>
                <span className="ml-0.5">{count}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Mobile Ticket Cards List */}
        <div className="flex flex-col gap-3 p-4">
          {mobileTickets.length > 0 ? (
            mobileTickets.map((ticket) => {
              const isWeighing = ticket.requiresWeighing;

              // Card món chờ cân (VD: Tôm hùm hấp bia)
              if (isWeighing) {
                return (
                  <div
                    key={ticket.id}
                    className="flex flex-col rounded-[20px] border border-status-warning/50 bg-status-warning-subtle/40 p-4 shadow-2xs transition-all"
                  >
                    {/* Badge Chờ cân */}
                    <div className="mb-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-status-warning-subtle px-2.5 py-0.5 text-xs font-bold text-status-warning">
                        <span className="size-1.5 rounded-full bg-status-warning" />
                        Chờ cân
                      </span>
                    </div>

                    {/* Header: Bàn + Thời gian */}
                    <div className="flex items-center justify-between">
                      <span className="rounded-md bg-surface-muted px-2.5 py-0.5 text-xs font-bold text-text-primary">
                        {ticket.tableName}
                      </span>
                      <span className="text-xs text-text-tertiary">
                        {ticket.timeAgo}
                      </span>
                    </div>

                    {/* Món & Hướng dẫn */}
                    <div className="my-3 space-y-1">
                      <h3 className="text-base font-bold text-text-primary">
                        {ticket.quantity ?? 1}× {ticket.dishName}
                      </h3>
                      {ticket.options && ticket.options.length > 0 ? (
                        <div className="space-y-0.5">
                          {ticket.options.map((opt) => (
                            <p key={opt.id} className="text-xs text-brand-primary">
                              + {opt.optionItemName}
                            </p>
                          ))}
                        </div>
                      ) : null}
                      <p className="text-xs font-normal text-brand-primary">
                        {ticket.hint || "Bán theo cân · cần cân trước khi gửi bếp"}
                      </p>
                    </div>

                    {/* Nút Nhập số cân */}
                    <button
                      type="button"
                      onClick={() => {
                        setWeighModalTicket(ticket);
                        setWeightUnit("kg");
                        setWeightInput("1.2");
                      }}
                      className="flex h-11 w-full items-center justify-center rounded-[14px] bg-status-danger text-sm font-bold text-white shadow-2xs transition-all hover:bg-status-danger/90 active:scale-[0.99] cursor-pointer"
                    >
                      Nhập số cân
                    </button>
                  </div>
                );
              }

              // Card món thông thường (Chờ xác nhận / Đang nấu / Đã sẵn sàng)
              return (
                <div
                  key={ticket.id}
                  className="flex flex-col rounded-[20px] bg-surface-card p-4 shadow-2xs transition-all border border-border-default"
                >
                  {/* Header: Bàn + Thời gian */}
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-surface-muted px-2.5 py-0.5 text-xs font-bold text-text-primary">
                      {ticket.tableName}
                    </span>
                    <span className="text-xs text-text-tertiary">
                      {ticket.timeAgo}
                    </span>
                  </div>

                  {/* Món & Ghi chú */}
                  <div className="my-3 space-y-1">
                    <h3 className="text-base font-bold text-text-primary">
                      {ticket.quantity ?? 1}× {ticket.dishName}
                    </h3>
                    {ticket.options && ticket.options.length > 0 ? (
                      <div className="space-y-0.5">
                        {ticket.options.map((opt) => (
                          <p key={opt.id} className="text-xs text-brand-primary">
                            + {opt.optionItemName}
                          </p>
                        ))}
                      </div>
                    ) : null}
                    {ticket.note ? (
                      <p className="text-xs font-normal text-brand-primary">
                        {ticket.note}
                      </p>
                    ) : null}
                    {ticket.weightKg != null ? (
                      <p className="flex items-center gap-1 text-xs font-medium text-text-tertiary">
                        <Scale className="size-3" />
                        Khối lượng: {formatWeight(ticket.weightKg)}
                      </p>
                    ) : null}
                  </div>

                  {/* Nút hành động tương ứng trạng thái */}
                  {ticket.column === "AWAITING_CONFIRM" && (
                    <button
                      type="button"
                      onClick={() => handleAction(ticket)}
                      className="flex h-11 w-full items-center justify-center rounded-[14px] bg-status-info text-sm font-bold text-white shadow-2xs transition-all hover:bg-status-info/90 active:scale-[0.99] cursor-pointer"
                    >
                      Xác nhận
                    </button>
                  )}
                  {ticket.column === "COOKING" && (
                    <button
                      type="button"
                      onClick={() => handleAction(ticket)}
                      className="flex h-11 w-full items-center justify-center rounded-[14px] bg-status-warning text-sm font-bold text-white shadow-2xs transition-all hover:bg-status-warning/90 active:scale-[0.99] cursor-pointer"
                    >
                      Đã phục vụ
                    </button>
                  )}
                </div>
              );
            })
          ) : (
            <div className="flex h-40 flex-col items-center justify-center rounded-[20px] border border-dashed border-border-strong bg-surface-card p-6 text-center text-xs text-text-tertiary">
              <p className="font-medium">Không có món nào trong mục này</p>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          B. GIAO DIỆN DESKTOP (md+) - 3 CỘT KDS NGUYÊN BẢN
          ============================================================ */}
      <div className="hidden md:flex flex-1 flex-col">
        <PageHeader
          className="md:block"
          title="Hàng món chờ chế biến"
          subtitle={
            <span className="flex items-center gap-2">
              {sessionsLoading ? "Đang tải..." : buildSubtitle(totalCount)}
              {sessionsLoading && (
                <RefreshCw className="size-3.5 animate-spin text-text-tertiary" />
              )}
            </span>
          }
          mobileSubtitle={
            sessionsLoading ? "Đang tải..." : buildSubtitle(totalProcessing)
          }
          actions={FILTER_TABS.map((tab) => {
            const isSelected = filter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setFilter(tab.value)}
                className={cn(
                  "h-9 rounded-pill px-4 text-sm font-semibold transition-colors cursor-pointer",
                  isSelected
                    ? "bg-brand-primary text-text-on-brand shadow-xs"
                    : "border border-border-default bg-surface-card text-text-secondary hover:border-border-strong hover:text-text-primary",
                )}
              >
                {tab.label}
              </button>
            );
          })}
        />

        {/* 2 Cột KDS Desktop */}
        <div
          className={cn(
            "grid flex-1 gap-6 px-6 py-6 sm:px-8 sm:py-8",
            visibleColumns.length === 1
              ? "grid-cols-1 max-w-3xl"
              : "grid-cols-1 md:grid-cols-2",
          )}
        >
          {visibleColumns.map((col) => {
            const meta = COLUMN_META[col];
            const items = byColumn[col];

            return (
              <div
                key={col}
                className="flex flex-col gap-4 rounded-card bg-surface-muted/60 p-4"
              >
                {/* Header cột */}
                <div className="flex items-center justify-between px-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={cn("size-2.5 rounded-full", meta.dotClass)}
                    />
                    <h2 className="text-sm font-bold text-text-primary">
                      {meta.title}
                    </h2>
                  </div>
                  <span className="flex size-6 items-center justify-center rounded-full bg-surface-card text-xs font-bold text-text-secondary shadow-2xs">
                    {items.length}
                  </span>
                </div>

                {/* Danh sách phiếu */}
                <div className="flex flex-col gap-3">
                  {items.length > 0 ? (
                    items.map((ticket) => (
                      <KDSTicket
                        key={ticket.id}
                        tableName={ticket.tableName}
                        timeAgo={ticket.timeAgo}
                        dishName={ticket.dishName}
                        quantity={ticket.quantity}
                        note={ticket.note}
                        hint={ticket.hint}
                        options={ticket.options}
                        badgeLabel={
                          ticket.requiresWeighing ? "Chờ cân" : undefined
                        }
                        status={
                          ticket.requiresWeighing
                            ? "weighing"
                            : col === "AWAITING_CONFIRM"
                              ? "pending"
                              : "cooking"
                        }
                        onAction={() => handleAction(ticket)}
                      />
                    ))
                  ) : (
                    <div className="flex h-32 items-center justify-center rounded-card border border-dashed border-border-default bg-surface-card/60 text-center text-xs text-text-tertiary">
                      Không có món nào trong mục này
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ============================================================
          MODAL: NHẬP SỐ CÂN CHO MÓN BÁN THEO CÂN (dùng chung mobile + desktop)
          ============================================================ */}
      {weighModalTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex size-9 items-center justify-center rounded-xl bg-[#FEF3E2] text-[#D97706]">
                  <Scale className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#101828]">
                    Nhập số cân
                  </h3>
                  <p className="text-xs text-[#667085]">
                    {weighModalTicket.tableName} · {weighModalTicket.dishName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setWeighModalTicket(null)}
                className="rounded-full p-1 text-[#98A2B3] hover:bg-gray-100 hover:text-[#101828]"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#344054]">
                  Khối lượng thực tế
                </label>
                {/* Toggle đơn vị nhập: kg hoặc g. Luôn quy đổi sang kg trước khi gửi BE. */}
                <div className="flex items-center rounded-lg border border-[#D0D5DD] p-0.5">
                  {(["kg", "g"] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => handleWeightUnitChange(unit)}
                      className={cn(
                        "rounded-md px-2.5 py-1 text-xs font-bold transition-colors cursor-pointer",
                        weightUnit === unit
                          ? "bg-[#F0522B] text-white"
                          : "text-[#667085] hover:bg-gray-50",
                      )}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>
              <div className="relative">
                <input
                  type="number"
                  step={WEIGHT_INPUT_CONFIG[weightUnit].step}
                  min={WEIGHT_INPUT_CONFIG[weightUnit].min}
                  value={weightInput}
                  onChange={(e) => setWeightInput(e.target.value)}
                  className="h-12 w-full rounded-xl border border-[#D0D5DD] px-4 pr-12 text-lg font-bold text-[#101828] focus:border-[#F0522B] focus:outline-none"
                  placeholder={weightUnit === "kg" ? "1.2" : "750"}
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-[#667085]">
                  {weightUnit}
                </span>
              </div>
            </div>

            {/* Phím chọn nhanh — đổi theo đơn vị đang chọn */}
            <div className="flex items-center gap-2">
              {WEIGHT_INPUT_CONFIG[weightUnit].quickValues.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => setWeightInput(w)}
                  className={cn(
                    "flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-all cursor-pointer",
                    weightInput === w
                      ? "border-[#F0522B] bg-[#FFF4F0] text-[#F0522B]"
                      : "border-[#E4E7EC] bg-white text-[#475467] hover:bg-gray-50",
                  )}
                >
                  {w} {weightUnit}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setWeighModalTicket(null)}
                className="h-11 flex-1 rounded-xl border border-[#D0D5DD] bg-white text-sm font-bold text-[#344054] hover:bg-gray-50 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmWeight}
                className="h-11 flex-1 rounded-xl bg-[#F0522B] text-sm font-bold text-white hover:bg-[#E0441D] cursor-pointer"
              >
                Xác nhận & Gửi bếp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
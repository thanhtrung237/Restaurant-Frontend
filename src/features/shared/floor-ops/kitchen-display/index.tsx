import * as React from "react";
import { KDSTicket } from "@/components/common/KDSTicket";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import { Scale, X, RefreshCw, Utensils, CheckSquare, Printer } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  useBranch,
  useChangeOrderDetailStatus,
  useBatchConfirmOrderDetails,
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

/**
 * In phiếu bếp trực tiếp thông qua cửa sổ in trình duyệt (hỗ trợ máy in nhiệt 80mm/58mm)
 */
function printKitchenSlip(params: {
  branchName?: string;
  tableName: string;
  items: KDSTicketItem[];
}) {
  const { branchName = "Phở Việt", tableName, items } = params;
  if (!items.length) return;

  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(
    now.getMinutes()
  ).padStart(2, "0")} ${String(now.getDate()).padStart(2, "0")}/${String(
    now.getMonth() + 1
  ).padStart(2, "0")}/${now.getFullYear()}`;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) return;

  const itemsHtml = items
    .map((item) => {
      const optionsHtml =
        item.options && item.options.length > 0
          ? `<div style="font-size: 11px; color: #555; padding-left: 8px;">+ ${item.options
              .map((o) => o.optionItemName)
              .join(", ")}</div>`
          : "";
      const noteHtml = item.note
        ? `<div style="font-size: 11px; font-style: italic; color: #d00; padding-left: 8px;">* Ghi chú: ${item.note}</div>`
        : "";
      const weightHtml =
        item.weightKg != null ? ` (${item.weightKg} kg)` : "";

      return `
        <tr style="border-bottom: 1px dashed #ccc;">
          <td style="padding: 6px 0; font-size: 14px; font-weight: bold; vertical-align: top;">
            ${item.dishName}${weightHtml}
            ${optionsHtml}
            ${noteHtml}
          </td>
          <td style="padding: 6px 0; text-align: right; font-size: 15px; font-weight: bold; vertical-align: top; width: 40px;">
            x${item.quantity}
          </td>
        </tr>
      `;
    })
    .join("");

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Phiếu Bếp - ${tableName}</title>
        <style>
          @page {
            size: 80mm auto;
            margin: 3mm;
          }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #000;
            margin: 0;
            padding: 8px;
            font-size: 12px;
          }
          .header {
            text-align: center;
            border-bottom: 2px dashed #000;
            padding-bottom: 6px;
            margin-bottom: 8px;
          }
          .title {
            font-size: 18px;
            font-weight: 900;
            letter-spacing: 1px;
            margin: 2px 0;
          }
          .meta {
            font-size: 13px;
            margin: 3px 0;
          }
          .table-name {
            font-size: 20px;
            font-weight: 900;
            margin: 4px 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          .footer {
            text-align: center;
            border-top: 2px dashed #000;
            padding-top: 6px;
            margin-top: 10px;
            font-size: 11px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase;">${branchName}</div>
          <div class="title">*** PHIẾU BẾP ***</div>
          <div class="table-name">BÀN: ${tableName}</div>
          <div class="meta">Giờ in: ${timeStr}</div>
        </div>
        <table>
          <thead>
            <tr style="border-bottom: 1px solid #000; font-size: 12px;">
              <th style="text-align: left; padding-bottom: 4px;">TÊN MÓN</th>
              <th style="text-align: right; padding-bottom: 4px;">SL</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        <div class="footer">
          Tổng số món: <strong>${items.length} món</strong><br/>
          <em>--- Chúc quý khách ngon miệng ---</em>
        </div>
      </body>
    </html>
  `);
  doc.close();

  setTimeout(() => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch (e) {
      console.error("Print kitchen slip failed:", e);
    } finally {
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }
  }, 300);
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

  // Modal xác nhận nhiều món cùng bàn
  const [batchModalState, setBatchModalState] = React.useState<{
    isOpen: boolean;
    tableName: string;
    tableSessionId: number;
    items: KDSTicketItem[];
    selectedIds: Set<number>;
  } | null>(null);

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
  // PENDING → PREPARING vẫn dùng PUT /status hoặc batchConfirm:
  const changeStatusMutation = useChangeOrderDetailStatus();
  const batchConfirmMutation = useBatchConfirmOrderDetails();
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
          return;
        }

        // Kiểm tra xem bàn này còn những món nào đang ở trạng thái CHỜ XÁC NHẬN (PENDING)
        // Lấy tất cả món chờ xác nhận cùng tableSessionId (loại trừ các món cần cân riêng)
        const tablePendingItems = tickets.filter(
          (t) =>
            t.tableSessionId === ticket.tableSessionId &&
            t.column === "AWAITING_CONFIRM" &&
            !t.requiresWeighing
        );

        // Nếu bàn có nhiều hơn 1 món đang chờ xác nhận -> mở modal chọn các món cần xác nhận
        // Riêng món vừa bấm thì tích sẵn
        if (tablePendingItems.length > 1) {
          setBatchModalState({
            isOpen: true,
            tableName: ticket.tableName,
            tableSessionId: ticket.tableSessionId,
            items: tablePendingItems,
            selectedIds: new Set([ticket.orderDetailId]),
          });
          return;
        }

        // Nếu bàn chỉ có đúng 1 món chờ xác nhận -> xác nhận ngay lập tức
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
        printKitchenSlip({
          branchName: branch?.name,
          tableName: ticket.tableName,
          items: [ticket],
        });
        toast({
          title: "Đã xác nhận & In phiếu",
          description: `${ticket.dishName} (${ticket.tableName}) đã chuyển sang Đang chế biến.`,
        });
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

  // Toggle chọn/bỏ chọn món trong modal xác nhận theo bàn
  function handleToggleBatchItem(id: number) {
    if (!batchModalState) return;
    setBatchModalState((prev) => {
      if (!prev) return null;
      const next = new Set(prev.selectedIds);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return { ...prev, selectedIds: next };
    });
  }

  // Chọn tất cả hoặc bỏ chọn tất cả món trong modal
  function handleToggleSelectAllBatch() {
    if (!batchModalState) return;
    const allSelected = batchModalState.selectedIds.size === batchModalState.items.length;
    setBatchModalState((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        selectedIds: allSelected ? new Set() : new Set(prev.items.map((i) => i.orderDetailId)),
      };
    });
  }

  // Thực hiện xác nhận hàng loạt các món đã chọn trong modal
  async function handleBatchConfirmSubmit() {
    if (!batchModalState || batchModalState.selectedIds.size === 0) {
      toast({
        title: "Chưa chọn món",
        description: "Vui lòng chọn ít nhất một món để xác nhận.",
        variant: "danger",
      });
      return;
    }

    const selectedList = Array.from(batchModalState.selectedIds);
    const tableName = batchModalState.tableName;
    const selectedCount = selectedList.length;

    try {
      // Optimistic update cho các món đã chọn
      setAllOrderDetails((prev) =>
        prev.map((item) =>
          batchModalState.selectedIds.has(item.detail.id)
            ? { ...item, detail: { ...item.detail, status: "PREPARING" } }
            : item
        )
      );

      // Gọi API batch confirm ở backend
      await batchConfirmMutation.mutateAsync({
        orderDetailIds: selectedList,
      });

      // Lấy danh sách các món thực tế được chọn để in phiếu bếp
      const selectedItemsToPrint = batchModalState.items.filter((item) =>
        batchModalState.selectedIds.has(item.orderDetailId)
      );

      // In phiếu bếp qua trình duyệt (hỗ trợ máy in nhiệt 80mm/58mm)
      printKitchenSlip({
        branchName: branch?.name,
        tableName: tableName,
        items: selectedItemsToPrint,
      });

      toast({
        title: "Đã xác nhận & In phiếu bếp",
        description: `Đã xác nhận và in phiếu cho ${selectedCount} món của ${tableName}.`,
        variant: "success",
      });

      setBatchModalState(null);
    } catch (error) {
      toast({
        title: "Lỗi xác nhận món",
        description: getErrorMessage(error),
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

      {/* Modal xác nhận nhiều món cùng bàn */}
      {batchModalState && batchModalState.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#EAECF0]">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#EFF8FF] text-[#175CD3]">
                  <Utensils className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#101828]">
                    Xác nhận món theo bàn — {batchModalState.tableName}
                  </h3>
                  <p className="text-xs text-[#667085] mt-0.5">
                    Bàn này có {batchModalState.items.length} món đang chờ. Bạn có thể xác nhận nhiều món cùng lúc:
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setBatchModalState(null)}
                className="rounded-lg p-1 text-[#98A2B3] hover:bg-gray-100 cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Sub-header: Chọn tất cả */}
            <div className="flex items-center justify-between py-3 px-1 border-b border-[#F2F4F7]">
              <label
                className="flex items-center gap-2 text-xs font-semibold text-[#344054] cursor-pointer select-none"
                onClick={handleToggleSelectAllBatch}
              >
                <Checkbox
                  checked={
                    batchModalState.selectedIds.size === batchModalState.items.length
                      ? true
                      : batchModalState.selectedIds.size > 0
                        ? "indeterminate"
                        : false
                  }
                  onCheckedChange={handleToggleSelectAllBatch}
                />
                <span>Chọn tất cả ({batchModalState.items.length} món)</span>
              </label>
              <span className="text-xs text-[#475467] font-medium">
                Đã chọn: <strong className="text-[#175CD3]">{batchModalState.selectedIds.size}</strong> món
              </span>
            </div>

            {/* List items */}
            <div className="flex-1 overflow-y-auto divide-y divide-[#F2F4F7] my-2 pr-1">
              {batchModalState.items.map((item) => {
                const isChecked = batchModalState.selectedIds.has(item.orderDetailId);
                return (
                  <div
                    key={item.orderDetailId}
                    onClick={() => handleToggleBatchItem(item.orderDetailId)}
                    className={cn(
                      "flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-colors border my-1",
                      isChecked
                        ? "border-[#B2DDFF] bg-[#F5FAFF]"
                        : "border-transparent bg-white hover:bg-gray-50"
                    )}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={() => handleToggleBatchItem(item.orderDetailId)}
                      className="mt-0.5"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-[#101828] truncate">
                          {item.dishName}
                        </span>
                        <span className="shrink-0 text-xs font-bold px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#026AA2]">
                          x{item.quantity}
                        </span>
                      </div>

                      {/* Options nếu có */}
                      {item.options && item.options.length > 0 && (
                        <div className="text-xs text-[#667085] mt-1 flex flex-wrap gap-1">
                          {item.options.map((opt) => (
                            <span
                              key={opt.id}
                              className="inline-block bg-[#F2F4F7] px-1.5 py-0.5 rounded text-[11px]"
                            >
                              +{opt.optionItemName}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Note nếu có */}
                      {item.note && (
                        <p className="text-xs text-[#D92D20] mt-1 italic font-medium">
                          Ghi chú: {item.note}
                        </p>
                      )}

                      <div className="text-[11px] text-[#98A2B3] mt-1">
                        Thời gian gọi: {item.timeAgo}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer actions */}
            <div className="flex gap-3 pt-3 border-t border-[#EAECF0]">
              <button
                type="button"
                onClick={() => setBatchModalState(null)}
                className="h-11 flex-1 rounded-xl border border-[#D0D5DD] bg-white text-sm font-bold text-[#344054] hover:bg-gray-50 cursor-pointer transition-colors"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleBatchConfirmSubmit}
                disabled={batchModalState.selectedIds.size === 0 || batchConfirmMutation.isPending}
                className={cn(
                  "h-11 flex-1 rounded-xl text-sm font-bold text-white transition-colors cursor-pointer flex items-center justify-center gap-2",
                  batchModalState.selectedIds.size === 0 || batchConfirmMutation.isPending
                    ? "bg-[#D0D5DD] cursor-not-allowed"
                    : "bg-[#2E90FA] hover:bg-[#1570EF]"
                )}
              >
                <Printer className="h-4 w-4" />
                {batchConfirmMutation.isPending
                  ? "Đang xử lý..."
                  : `Xác nhận & In ${batchModalState.selectedIds.size} món`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
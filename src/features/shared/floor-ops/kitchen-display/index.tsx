import * as React from "react";
import { useBranchOperationalPermissions } from "@/api/operational-permissions.api";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { SearchInput } from "@/components/common/SearchInput";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/layout/PageHeader";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import { Minus, Plus, Scale, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  useBranch,
  useBatchConfirmOrderDetails,
  useConfirmWeight,
  useMarkServed,
  useOpenSessionsByBranch,
} from "@/features/shared/floor-ops/api";
import { getOrderDetailsBySession } from "@/api/order-details.api";
import { getErrorMessage, isApiStatus } from "@/lib/http";
import type { OrderDetail } from "@/types/models";
import { BatchReviewDialog } from "./BatchReviewDialog";
import { getOrderRoundPath } from "../notification-navigation";
import {
  countPortions, dishGroupKey, formatTimeAgo, getWaitMinutes, groupByRound, groupIdenticalDishes,
  parseOrderTime, type KDSColumn, type KDSTicketItem,
} from "./kitchen-items";
import {
  formatWeight,
  toKg,
  fromKg,
  WEIGHT_INPUT_CONFIG,
  type WeightUnit,
} from "@/lib/weight";

/**
 * In phiếu bếp trực tiếp thông qua cửa sổ in trình duyệt (hỗ trợ máy in nhiệt 80mm/58mm)
 */
function printKitchenSlip(params: {
  branchName?: string;
  tableName: string;
  items: KDSTicketItem[];
  onPrintComplete?: () => void;
}) {
  const { branchName = "Phở Việt", tableName, items, onPrintComplete } = params;
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

  const escapeText = (text: string) => text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
  const itemsHtml = groupIdenticalDishes(items)
    .map((group) => {
      const [item] = group;
      const optionsHtml =
        item.options && item.options.length > 0
          ? `<div style="font-size: 11px; color: #555; padding-left: 8px;">+ ${item.options
              .map((o) => escapeText(o.optionItemName))
              .join(", ")}</div>`
          : "";
      const noteHtml = item.note
        ? `<div style="font-size: 11px; font-style: italic; color: #d00; padding-left: 8px;">* Ghi chú: ${escapeText(item.note)}</div>`
        : "";
      const takeAwayHtml = item.isTakeAway
        ? '<div style="font-size: 11px; padding-left: 8px;">Mang về</div>'
        : "";
      const weightHtml =
        item.weightKg != null ? ` (${item.weightKg} kg)` : "";

      return `
        <tr style="border-bottom: 1px dashed #ccc;">
          <td style="padding: 6px 0; font-size: 14px; font-weight: bold; vertical-align: top;">
            ${escapeText(item.dishName)}${weightHtml}
            ${optionsHtml}
            ${takeAwayHtml}
            ${noteHtml}
          </td>
          <td style="padding: 6px 0; text-align: right; font-size: 15px; font-weight: bold; vertical-align: top; width: 40px;">
            ×${countPortions(group)}
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
        <title>Phiếu Bếp - ${escapeText(tableName)}</title>
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
          <div style="font-size: 12px; font-weight: 600; text-transform: uppercase;">${escapeText(branchName)}</div>
          <div class="title">*** PHIẾU BẾP ***</div>
          <div class="table-name">${items[0].takeaway ? "" : "BÀN: "}${escapeText(tableName)}</div>
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
          Tổng số phần: <strong>${countPortions(items)} phần</strong>
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
      if (document.activeElement === iframe || document.activeElement === document.body) {
        onPrintComplete?.();
      }
      setTimeout(() => {
        document.body.removeChild(iframe);
      }, 2000);
    }
  }, 300);
}

type KDSFilter = "ALL" | "AWAITING_CONFIRM" | "COOKING";

function normalizeSearch(value: string) {
  return value.trim().toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/đ/g, "d");
}

function groupTicketsByTable(tickets: KDSTicketItem[]) {
  const groups = new Map<number, KDSTicketItem[]>();
  for (const ticket of tickets) {
    const group = groups.get(ticket.tableSessionId);
    if (group) group.push(ticket);
    else groups.set(ticket.tableSessionId, [ticket]);
  }
  return [...groups.values()].sort((first, second) => getOldestWait(second) - getOldestWait(first));
}

function formatTableName(name: string) {
  return /^\d+$/.test(name.trim()) ? `Bàn ${name.trim()}` : name;
}

function getOldestWait(items: KDSTicketItem[]) {
  return items.reduce((oldest, item) => Math.max(oldest, item.minutesAgo), 0);
}

function WaitLabel({ minutes }: { minutes: number }) {
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold tabular-nums",
      minutes < 1 ? "bg-emerald-100 text-emerald-950"
        : minutes > 10 ? "bg-amber-100 text-amber-950" : "bg-surface-muted text-text-secondary",
    )}>
      {formatTimeAgo(minutes)}
    </span>
  );
}

function KitchenTableTicket({ items, focusedOrder, onReview, onServe, onWeigh }: {
  items: KDSTicketItem[];
  focusedOrder?: number;
  onReview?: (items: KDSTicketItem[], trigger: HTMLButtonElement, focusedOrder?: number) => void;
  onServe?: (items: KDSTicketItem[], trigger: HTMLButtonElement) => void;
  onWeigh?: (item: KDSTicketItem) => void;
}) {
  const first = items[0];
  const tableName = formatTableName(first.tableName);
  const pending = items.filter((item) => item.status === "PENDING");
  const cooking = first.column === "COOKING";
  const dishRows = groupIdenticalDishes(items);

  return (
    <article
      id={`kitchen-${first.tableSessionId}-${first.column}`}
      aria-label={tableName}
      className={cn(
        "flex min-w-0 scroll-mt-24 flex-col rounded-card border border-border-default bg-surface-card p-3 sm:p-4",
        focusedOrder !== undefined && "border-brand-primary ring-1 ring-brand-primary/30",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1">
        <h3 className="min-w-0 break-words text-base font-bold leading-snug text-text-primary sm:text-lg">{tableName}</h3>
        <WaitLabel minutes={getOldestWait(pending.length ? pending : items)} />
      </div>
      <ul className="mb-3 mt-2 flex-1 space-y-2">
        {dishRows.map((group) => {
          const [item] = group;
          const focused = group.filter((dish) => dish.orderId === focusedOrder);
          return (
            <li key={item.id} className={cn("grid grid-cols-[auto_minmax(0,1fr)] gap-x-2", focused.length > 0 && "rounded-md bg-brand-primary-subtle px-2 py-1")}>
              <span className="text-sm font-bold tabular-nums text-blue-700">{countPortions(group)}×</span>
              <div className="min-w-0 break-words text-sm">
                <p className="font-semibold leading-snug text-text-primary">{item.dishName}</p>
                {focused.length > 0 && <p className="text-xs font-medium text-text-primary">{countPortions(focused)} phần · Lượt #{focusedOrder}</p>}
                {item.options?.length ? (
                  <p className="text-xs text-text-secondary">{item.options.map((option) => option.optionItemName).join(" · ")}</p>
                ) : null}
                {item.note ? <p className="text-xs font-medium text-text-secondary">Ghi chú: {item.note}</p> : null}
                {item.isTakeAway ? <p className="text-xs text-text-secondary">Mang về</p> : null}
                {item.weightKg != null ? <p className="text-xs text-text-secondary">{formatWeight(item.weightKg)}</p> : null}
                {item.requiresWeighing && onWeigh ? (
                  <Button type="button" variant="secondary" className="mt-1 h-11 px-2.5 text-xs text-amber-950"
                    onClick={() => onWeigh(item)}>
                    <Scale aria-hidden="true" /> Nhập số cân
                  </Button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
      {cooking && onServe ? (
        <Button type="button" variant="secondary" className="w-full bg-amber-100 px-2 text-amber-950 hover:bg-amber-200"
          onClick={(event) => onServe(items, event.currentTarget)}>
          {first.takeaway ? "Đóng gói xong" : "Đã phục vụ"}
        </Button>
      ) : pending.length && onReview ? (
        <Button type="button" className="w-full bg-blue-700 px-2 text-white hover:bg-blue-800"
          onClick={(event) => onReview(pending, event.currentTarget, focusedOrder)}>
          Xác nhận món
        </Button>
      ) : null}
    </article>
  );
}

/**
 * Bếp (KDS) — Kitchen Display System
 * Hiển thị các món ăn đang chờ chế biến từ tất cả bàn của chi nhánh.
 * 
 * API: GET /table-sessions/branch/{branchId}/open (lấy danh sách sessions)
 *      GET /order-details/session/{tableSessionId} cho mỗi session (poll 1s)
 *      PUT /order-details/{id}/status
 *      POST /order-details/{id}/confirm-weight
 *      POST /order-details/{id}/serve-portions
 */
export default function KitchenDisplayPage() {
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const { key: locationKey } = useLocation();
  const targetSession = Number(params.get("session"));
  const targetOrder = Number(params.get("round"));
  const hasNotification = Number.isSafeInteger(targetSession) && targetSession > 0 &&
    Number.isSafeInteger(targetOrder) && targetOrder > 0;

  const branchId = useAuthStore((s) => s.branchId);
  const access = useBranchOperationalPermissions(branchId);
  const canConfirm = access.can("CONFIRM_ORDER");
  const canServe = access.can("SERVE_ORDER");
  const canWeigh = access.can("WEIGH_ORDER");
  const role = useAuthStore((s) => s.role);

  const [mobileSelection, setMobileSelection] = React.useState<{ key: string | null; tab: KDSColumn }>({
    key: null, tab: "AWAITING_CONFIRM",
  });
  const scrolledLocation = React.useRef<string | null>(null);
  const [weighModalTicket, setWeighModalTicket] = React.useState<KDSTicketItem | null>(null);
  const [weightInput, setWeightInput] = React.useState("1.2");
  const [weightUnit, setWeightUnit] = React.useState<WeightUnit>("kg");
  const [filter, setFilter] = React.useState<KDSFilter>("ALL");
  const [search, setSearch] = React.useState("");

  // Modal xác nhận nhiều món cùng bàn
  const [batchModalState, setBatchModalState] = React.useState<{
    tableName: string;
    items: KDSTicketItem[];
    selectedIds: Set<number>;
  } | null>(null);
  const batchTriggerRef = React.useRef<HTMLButtonElement | null>(null);
  const batchSubmittingRef = React.useRef(false);
  const serveTriggerRef = React.useRef<HTMLButtonElement>(null);
  const [serveItems, setServeItems] = React.useState<KDSTicketItem[]>([]);
  const [serveQuantities, setServeQuantities] = React.useState<Record<string, number>>({});
  const [serving, setServing] = React.useState(false);
  const serveCheckboxId = React.useId();
  const kitchenRegionRef = React.useRef<HTMLDivElement | null>(null);
  const [now, setNow] = React.useState(Date.now);
  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 5000);
    return () => window.clearInterval(timer);
  }, []);

  // Fetch all open sessions (làm mới mỗi 1 giây)
  const { data: sessions, isLoading: sessionsLoading, error: sessionsError } = useOpenSessionsByBranch(
    branchId ?? undefined,
    { refetchInterval: 1000 }
  );

  // Aggregate all order details từ tất cả sessions (để đơn giản, tôi sẽ fetch từng session)
  // Trong production, backend nên có endpoint GET /order-details/branch/{branchId}
  const [allOrderDetails, setAllOrderDetails] = React.useState<
    Array<{ sessionId: number; tableName: string; takeaway?: boolean; detail: OrderDetail }>
  >([]);
  const [detailsError, setDetailsError] = React.useState("");
  const [detailsLoaded, setDetailsLoaded] = React.useState(false);

  // Mutations
  // PENDING → PREPARING theo danh sách món đã duyệt.
  const batchConfirmMutation = useBatchConfirmOrderDetails();
  // Ghi nhận số phần và chuyển sang SERVED khi đủ.
  const markServedMutation = useMarkServed();
  const confirmWeightMutation = useConfirmWeight();

  // Dùng chung client xác thực cho cả lần tải đầu và các lượt làm mới.
  React.useEffect(() => {
    if (!sessions?.length) {
      setAllOrderDetails([]);
      setDetailsError("");
      setDetailsLoaded(false);
      return;
    }

    const activeSessions = sessions;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;

    async function refreshDetails() {
      const results = await Promise.allSettled(activeSessions.map(async (session) => {
        const details = await getOrderDetailsBySession(session.id);
        return details.map((detail) => ({
          sessionId: session.id,
          tableName: session.tableName || `Bàn ${session.tableId}`,
          takeaway: session.takeaway,
          detail,
        }));
      }));
      if (stopped) return;

      const failed = results.find((result) => result.status === "rejected");
      setDetailsLoaded(true);
      setDetailsError(failed ? getErrorMessage(failed.reason) : "");
      setAllOrderDetails((previous) => results.flatMap((result, index) => {
        if (result.status === "fulfilled") return result.value;
        if (isApiStatus(result.reason, 401, 403, 404)) return [];
        return previous.filter((item) => item.sessionId === activeSessions[index].id);
      }));
      if (!results.every((result) => result.status === "rejected" && isApiStatus(result.reason, 401, 403))) {
        timer = setTimeout(() => void refreshDetails(), 1000);
      }
    }

    void refreshDetails();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [sessions]);

  // Convert OrderDetail to KDSTicketItem
  const tickets = React.useMemo((): KDSTicketItem[] => {
    const ordersBySession = new Map<number, Map<number, number>>();
    for (const { sessionId, detail } of allOrderDetails) {
      const orders = ordersBySession.get(sessionId) ?? new Map<number, number>();
      const createdAt = parseOrderTime(detail.createdAt);
      const timestamp = Number.isFinite(createdAt) ? createdAt : Infinity;
      orders.set(detail.orderId, Math.min(orders.get(detail.orderId) ?? Infinity, timestamp));
      ordersBySession.set(sessionId, orders);
    }
    const roundsBySession = new Map([...ordersBySession].map(([sessionId, orders]) => [
      sessionId,
      new Map([...orders].sort(([firstId, firstTime], [secondId, secondTime]) =>
        firstTime - secondTime || firstId - secondId,
      ).map(([orderId, time], index) => [
        orderId, { number: index + 1, time: Number.isFinite(time) ? time : undefined },
      ])),
    ]));

    return allOrderDetails
      .filter(({ detail }) => detail.status !== "SERVED" && detail.status !== "CANCELLED")
      .map(({ sessionId, tableName, takeaway, detail }) => {
        let column: KDSColumn = "AWAITING_CONFIRM";
        if (detail.status === "PREPARING") column = "COOKING";
        else if (detail.status === "PENDING_WEIGHT") column = "AWAITING_CONFIRM";

        const round = roundsBySession.get(sessionId)?.get(detail.orderId);
        const minutesAgo = getWaitMinutes(round?.time, now);

        return {
          id: detail.id,
          orderDetailId: detail.id,
          orderId: detail.orderId,
          dishId: detail.dishId,
          tableSessionId: sessionId,
          minutesAgo,
          tableName,
          takeaway,
          round: round?.number ?? 1,
          roundTime: round?.time,
          dishName: detail.dishName || "Món ăn",
          quantity: detail.status === "PREPARING" ? detail.quantity - (detail.servedQuantity ?? 0) : detail.quantity,
          servedQuantity: detail.servedQuantity ?? 0,
          isTakeAway: detail.isTakeAway,
          note: detail.note,
          requiresWeighing: detail.status === "PENDING_WEIGHT",
          weightKg: detail.weightKg,
          options: detail.options,
          column,
          status: detail.status,
        };
      });
  }, [allOrderDetails, now]);

  const totalCount = countPortions(tickets);
  const pendingTickets = tickets.filter((item) => item.status === "PENDING");
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

  const { data: branch } = useBranch(branchId ?? undefined);
  const buildSubtitle = (count: number) =>
    [branch?.name, `${count} món đang xử lý`].filter(Boolean).join(" · ");

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

  function openBatchReview(items: KDSTicketItem[], trigger: HTMLButtonElement, focusedOrder?: number) {
    batchTriggerRef.current = trigger;
    const rounds = groupByRound(items);
    setBatchModalState({
      tableName: formatTableName(items[0].tableName),
      items: rounds.flatMap(([, roundItems]) => roundItems),
      selectedIds: new Set(items.filter((item) => focusedOrder === undefined || item.orderId === focusedOrder)
        .map((item) => item.orderDetailId)),
    });
  }

  const openedServeIds = new Set(serveItems.map((item) => item.id));
  const availableServeItems = tickets.filter((item) => item.status === "PREPARING" && openedServeIds.has(item.id));
  const serveGroups = groupIdenticalDishes(availableServeItems).map((items) => {
    const key = dishGroupKey(items[0]);
    const total = countPortions(items);
    return { key, items, total, selected: Math.min(serveQuantities[key] ?? 0, total) };
  });
  const availableServePortions = countPortions(availableServeItems);
  const selectedServePortions = serveGroups.reduce((sum, group) => sum + group.selected, 0);
  const allServeItemsSelected = selectedServePortions === availableServePortions;

  async function handleServeTable() {
    if (serving || selectedServePortions === 0) return;
    const updates = serveGroups.flatMap(({ items, selected }) => {
      let remaining = selected;
      const requests = [];
      // Allocate identical portions to the oldest order lines first.
      for (const item of [...items].sort((first, second) => first.id - second.id)) {
        if (remaining === 0) break;
        const quantity = Math.min(remaining, item.quantity);
        requests.push({ id: item.orderDetailId, quantity, expectedServedQuantity: item.servedQuantity });
        remaining -= quantity;
      }
      return requests;
    });
    setServing(true);
    try {
      const results = await Promise.allSettled(updates.map((update) => markServedMutation.mutateAsync(update)));
      const updatedDetails = new Map<number, OrderDetail>();
      let servedPortions = 0;
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          updatedDetails.set(updates[index].id, result.value);
          servedPortions += updates[index].quantity;
        }
      });
      setAllOrderDetails((prev) => prev.map((item) => {
        const update = updatedDetails.get(item.detail.id);
        return update
          ? { ...item, detail: { ...item.detail, status: update.status, servedQuantity: update.servedQuantity } }
          : item;
      }));
      const failed = selectedServePortions - servedPortions;
      toast({
        title: failed > 0 ? "Còn món chưa cập nhật" : "Đã cập nhật phục vụ",
        description: failed > 0 ? `Đã phục vụ ${servedPortions} món. Còn ${failed} món, vui lòng kiểm tra lại.`
          : `Đã phục vụ ${servedPortions} món.`,
        variant: failed > 0 ? "danger" : "success",
      });
      setServeItems([]);
    } finally {
      setServing(false);
    }
  }

  function updateBatchSelection(items: KDSTicketItem[], checked: boolean) {
    setBatchModalState((prev) => {
      if (!prev) return null;
      const next = new Set(prev.selectedIds);
      for (const item of items) {
        if (checked) next.add(item.orderDetailId);
        else next.delete(item.orderDetailId);
      }
      return { ...prev, selectedIds: next };
    });
  }

  function restoreBatchFocus(trigger: HTMLButtonElement | null) {
    const target = trigger?.isConnected && !trigger.disabled && trigger.getClientRects().length > 0
      ? trigger
      : kitchenRegionRef.current;
    target?.focus({ preventScroll: true });
  }

  // Thực hiện xác nhận hàng loạt các món đã chọn trong modal
  async function handleBatchConfirmSubmit() {
    if (batchSubmittingRef.current) return;
    if (!batchModalState || batchModalState.selectedIds.size === 0) {
      toast({
        title: "Chưa chọn món",
        description: "Vui lòng chọn ít nhất một món để xác nhận.",
        variant: "danger",
      });
      return;
    }

    const pendingIds = new Set(tickets.filter((item) => item.status === "PENDING").map((item) => item.id));
    const selectedItems = batchModalState.items.filter((item) =>
      batchModalState.selectedIds.has(item.id) && pendingIds.has(item.id));
    if (!selectedItems.length) {
      setBatchModalState(null);
      toast({ title: "Các món đã được cập nhật ở nơi khác", variant: "warning" });
      return;
    }
    const tableName = batchModalState.tableName;
    const trigger = batchTriggerRef.current;

    batchSubmittingRef.current = true;
    try {
      const result = await batchConfirmMutation.mutateAsync({
        orderDetailIds: selectedItems.map((item) => item.orderDetailId),
      });
      const statuses = new Map(result.map((item) => [item.id, item.status]));

      setAllOrderDetails((prev) =>
        prev.map((item) => {
          const status = statuses.get(item.detail.id);
          return status ? { ...item, detail: { ...item.detail, status } } : item;
        })
      );

      const printable = selectedItems.filter((item) => statuses.get(item.id) === "PREPARING");
      if (printable.length) {
        printKitchenSlip({ branchName: branch?.name, tableName, items: printable, onPrintComplete: () => restoreBatchFocus(trigger) });
      }

      toast({
        title: printable.length ? "Đã xác nhận món" : "Các món đã được cập nhật ở nơi khác",
        description: printable.length ? `${tableName} · ${countPortions(printable)} phần chuyển sang Đang chế biến.` : undefined,
        variant: printable.length ? "success" : "warning",
      });

      setBatchModalState(null);
    } catch (error) {
      toast({
        title: "Lỗi xác nhận món",
        description: getErrorMessage(error),
        variant: "danger",
      });
    } finally {
      batchSubmittingRef.current = false;
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

  const targetColumn = hasNotification
    ? tickets.find((item) => item.tableSessionId === targetSession && item.orderId === targetOrder && item.column === "AWAITING_CONFIRM")?.column
      ?? tickets.find((item) => item.tableSessionId === targetSession && item.orderId === targetOrder)?.column
    : undefined;
  const mobileTab = targetColumn && mobileSelection.key !== locationKey ? targetColumn : mobileSelection.tab;
  const activeFilter = targetColumn ? "ALL" : filter;
  const query = normalizeSearch(hasNotification ? "" : search);
  const matchesSearch = (ticket: KDSTicketItem) =>
    normalizeSearch(formatTableName(ticket.tableName)).includes(query) || normalizeSearch(ticket.dishName).includes(query);
  const matchingGroups = {
    AWAITING_CONFIRM: groupTicketsByTable(byColumn.AWAITING_CONFIRM).filter((group) => group.some(matchesSearch)),
    COOKING: groupTicketsByTable(byColumn.COOKING).filter((group) => group.some(matchesSearch)),
  };
  const columns = MOBILE_TABS.map((tab) => tab.value);
  const populatedColumns = columns.filter((column) => matchingGroups[column].length > 0);
  const desktopColumns = activeFilter === "ALL"
    ? (populatedColumns.length > 0 ? populatedColumns : ["AWAITING_CONFIRM"])
    : [activeFilter];
  const splitColumns = desktopColumns.length > 1;
  const loadError = sessionsError ? getErrorMessage(sessionsError) : detailsError;
  const isLoading = sessionsLoading || (Boolean(sessions?.length) && !detailsLoaded);
  const subtitle = isLoading ? "Đang tải món…" : buildSubtitle(totalCount);
  const orderPath = hasNotification ? getOrderRoundPath(role, targetSession, targetOrder) : null;
  const relatedSession = hasNotification ? sessions?.find((session) => session.id === targetSession) : undefined;

  React.useEffect(() => {
    if (!targetColumn || scrolledLocation.current === locationKey) return;
    const ticket = document.getElementById(`kitchen-${targetSession}-${targetColumn}`);
    if (ticket?.getClientRects().length) {
      ticket.scrollIntoView({ block: "nearest" });
      scrolledLocation.current = locationKey;
    }
  }, [locationKey, mobileTab, targetColumn, targetSession]);

  function clearNotification() {
    if (!hasNotification) return;
    const next = new URLSearchParams(params);
    next.delete("session");
    next.delete("round");
    setParams(next, { replace: true, preventScrollReset: true });
  }

  function renderFilter(tab: KDSFilter, label: string, active: boolean, onClick: () => void) {
    const count = tab === "ALL" ? totalCount : countPortions(byColumn[tab]);
    return (
      <Button
        key={tab}
        type="button"
        variant="secondary"
        aria-pressed={active}
        onClick={onClick}
        className={cn("gap-1.5 px-3 text-xs sm:text-sm", active && "bg-brand-primary-subtle text-orange-950 hover:bg-brand-primary-subtle")}
      >
        {label}
        <span className="tabular-nums">{count}</span>
      </Button>
    );
  }

  return (
    <div ref={kitchenRegionRef} tabIndex={-1} role="region" aria-label="Danh sách món chế biến" className="flex min-h-full flex-1 flex-col bg-surface-page">
      <PageHeader
        title="Gọi món & Chế biến"
        subtitle={subtitle}
        actions={FILTER_TABS.map((tab) => renderFilter(tab.value, tab.label, activeFilter === tab.value, () => {
          clearNotification();
          setFilter(tab.value);
        }))}
      />

      <div className="space-y-4 px-4 py-4 sm:px-6 lg:px-8">
        <div role="group" aria-label="Lọc trạng thái món" className="flex flex-wrap gap-2 md:hidden">
          {MOBILE_TABS.map((tab) => renderFilter(tab.value, tab.label, mobileTab === tab.value, () => {
            setMobileSelection({ key: locationKey, tab: tab.value });
          }))}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="w-full sm:max-w-80">
            <SearchInput
              aria-label="Tìm bàn hoặc món"
              placeholder="Tìm bàn hoặc món…"
              variant="rounded"
              value={hasNotification ? "" : search}
              onChange={(event) => {
                clearNotification();
                setSearch(event.target.value);
              }}
              onClear={() => setSearch("")}
              className="h-11 border-border-default bg-surface-card placeholder:text-text-secondary"
            />
          </div>
          {pendingTickets.length > 0 ? (
            <p className="flex items-center gap-1.5 text-xs text-text-secondary">
              Chờ xác nhận lâu nhất <WaitLabel minutes={getOldestWait(pendingTickets)} />
            </p>
          ) : null}
        </div>

        {hasNotification ? (
          <div className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border-default bg-surface-card px-4 py-2.5">
            <p role="status" className="text-sm font-medium">
              {relatedSession && `${formatTableName(relatedSession.tableName || String(relatedSession.tableId))} · `}
              Lượt gọi #{targetOrder}
              {!isLoading && !loadError && !targetColumn && <span className="ml-2 text-text-secondary">Đã rời hàng chế biến.</span>}
            </p>
            <div className="flex items-center gap-3">
              {orderPath && <Link to={orderPath} className="text-sm font-semibold text-brand-primary hover:underline">Xem đơn món</Link>}
              <Button type="button" variant="ghost" size="sm" onClick={clearNotification}>Bỏ đánh dấu</Button>
            </div>
          </div>
        ) : null}

        {loadError ? (
          <p role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
            Không cập nhật được danh sách món. {loadError}
          </p>
        ) : null}

        <div className={cn("grid items-start gap-4", splitColumns && "md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]")}>
          {MOBILE_TABS.map(({ value: column, label, dotColor }) => {
            const groups = matchingGroups[column];
            const itemCount = groups.reduce((sum, group) => sum + countPortions(group), 0);
            return (
              <section
                key={column}
                aria-label={label}
                className={cn(
                  "min-w-0 space-y-2",
                  column !== mobileTab && "hidden",
                  desktopColumns.includes(column) ? "md:block" : "md:hidden",
                )}
              >
                <div className="flex flex-wrap items-center gap-2 px-0.5">
                  <h2 className="flex items-center gap-2 text-sm font-bold text-text-primary">
                    <span aria-hidden="true" className={cn("size-2 rounded-full", dotColor)} />
                    {label}
                  </h2>
                  <span className="rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold tabular-nums text-text-secondary">{itemCount} món</span>
                </div>
                {groups.length > 0 ? (
                  <div className={cn("grid gap-2.5 sm:grid-cols-2",
                    splitColumns ? (column === "AWAITING_CONFIRM" ? "md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3" : "md:grid-cols-1") : "xl:grid-cols-3",
                  )}>
                    {groups.map((items) => (
                      <KitchenTableTicket
                        key={items[0].tableSessionId}
                        items={items}
                        focusedOrder={hasNotification && items[0].tableSessionId === targetSession &&
                          items.some((item) => item.orderId === targetOrder) ? targetOrder : undefined}
                        onReview={canConfirm ? openBatchReview : undefined}
                        onServe={canServe ? (dishes, trigger) => {
                          serveTriggerRef.current = trigger;
                          setServeQuantities({});
                          setServeItems(dishes);
                        } : undefined}
                        onWeigh={canWeigh ? (item) => {
                          setWeighModalTicket(item);
                          setWeightUnit("kg");
                          setWeightInput("1.2");
                        } : undefined}
                      />
                    ))}
                  </div>
                ) : !loadError ? (
                  <p className="rounded-card border border-dashed border-border-default bg-surface-card p-6 text-center text-sm text-text-secondary">
                    {isLoading ? "Đang tải danh sách món…" : query ? "Không tìm thấy bàn hoặc món phù hợp." : "Không có món nào trong mục này."}
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
      </div>

      <Dialog open={canServe && serveItems.length > 0} onOpenChange={(open) => { if (!open && !serving) setServeItems([]); }}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col gap-3 p-4 sm:p-6" showCloseButton={!serving} onCloseAutoFocus={(event) => {
          event.preventDefault();
          restoreBatchFocus(serveTriggerRef.current);
          serveTriggerRef.current = null;
        }}>
          <DialogHeader className="shrink-0 pr-7">
            <DialogTitle>{serveItems[0]?.takeaway ? "Đóng gói xong" : "Đã phục vụ"} · {serveItems[0] ? formatTableName(serveItems[0].tableName) : ""}</DialogTitle>
            <DialogDescription>{serveItems[0]?.takeaway ? "Chọn số phần đã đóng gói." : "Chọn số phần đã mang ra bàn."}</DialogDescription>
          </DialogHeader>
          {availableServePortions > 0 ? (
            <>
              <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-3 border-y border-border-default">
                <label htmlFor={serveCheckboxId} className="flex min-h-11 cursor-pointer items-center gap-3 text-sm font-semibold">
                  <Checkbox
                    id={serveCheckboxId}
                    checked={allServeItemsSelected ? true : selectedServePortions > 0 ? "indeterminate" : false}
                    onCheckedChange={(checked) => setServeQuantities(checked === true
                      ? Object.fromEntries(serveGroups.map(({ key, total }) => [key, total]))
                      : {})}
                    disabled={serving}
                  />
                  Chọn tất cả
                </label>
                <span role="status" className="text-sm text-text-secondary">
                  Đã chọn {selectedServePortions}/{availableServePortions} phần
                </span>
              </div>
              <div className="min-h-0 space-y-2 overflow-y-auto px-1">
                {serveGroups.map(({ key, items: [item], total, selected }) => {
                  const itemLabelId = `${serveCheckboxId}-${item.id}`;
                  function adjustQuantity(delta: number) {
                    setServeQuantities((previous) => ({
                      ...previous,
                      [key]: Math.max(0, Math.min(total, Math.min(previous[key] ?? 0, total) + delta)),
                    }));
                  }
                  return (
                    <div
                      key={key}
                      role="group"
                      aria-labelledby={itemLabelId}
                      className={cn(
                        "flex flex-wrap items-center justify-between gap-x-3 gap-y-2 rounded-lg border p-3",
                        selected > 0 ? "border-sky-200 bg-sky-50" : "border-border-default",
                      )}
                    >
                      <div id={itemLabelId} className="min-w-0 flex-1 basis-32 break-words text-sm">
                        <p className="font-semibold">{item.dishName}</p>
                        {item.options?.length ? (
                          <p className="text-xs text-text-secondary">{item.options.map((opt) => opt.optionItemName).join(" · ")}</p>
                        ) : null}
                        {item.note ? <p className="text-xs text-text-secondary">Ghi chú: {item.note}</p> : null}
                        {item.isTakeAway ? <p className="text-xs text-text-secondary">Mang về</p> : null}
                        {item.weightKg != null ? <p className="text-xs text-text-secondary">{formatWeight(item.weightKg)}</p> : null}
                      </div>
                      <div className="flex shrink-0 items-center gap-1 rounded-lg border border-border-default bg-surface-card p-0.5">
                        <Button type="button" variant="ghost" size="icon" className="size-11"
                          aria-label="Giảm số phần" disabled={serving || selected === 0} onClick={() => adjustQuantity(-1)}>
                          <Minus aria-hidden="true" />
                        </Button>
                        <span className="min-w-10 text-center text-sm font-semibold tabular-nums">{selected}/{total}</span>
                        <Button type="button" variant="ghost" size="icon" className="size-11 text-sky-800"
                          aria-label="Tăng số phần" disabled={serving || selected === total} onClick={() => adjustQuantity(1)}>
                          <Plus aria-hidden="true" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p role="status" className="text-sm text-text-secondary">Các món trong danh sách đã được cập nhật.</p>
          )}
          <DialogFooter className="shrink-0">
            <DialogClose asChild><Button type="button" variant="outline" disabled={serving}>Hủy</Button></DialogClose>
            <Button type="button" onClick={() => void handleServeTable()} disabled={serving || selectedServePortions === 0}>
              {serving ? "Đang cập nhật…" : selectedServePortions > 0 ? `Xác nhận ${selectedServePortions} phần` : "Xác nhận đã phục vụ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============================================================
          MODAL: NHẬP SỐ CÂN CHO MÓN BÁN THEO CÂN (dùng chung mobile + desktop)
          ============================================================ */}
      {canWeigh && weighModalTicket && (
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

      {canConfirm && batchModalState && (
        <BatchReviewDialog
          tableName={batchModalState.tableName}
          items={batchModalState.items}
          selectedIds={batchModalState.selectedIds}
          now={now}
          submitting={batchConfirmMutation.isPending}
          onSelectionChange={updateBatchSelection}
          onConfirm={handleBatchConfirmSubmit}
          onClose={() => {
            if (!batchSubmittingRef.current) setBatchModalState(null);
          }}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            restoreBatchFocus(batchTriggerRef.current);
            batchTriggerRef.current = null;
          }}
        />
      )}

    </div>
  );
}

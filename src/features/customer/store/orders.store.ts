import { create } from "zustand"
import type { OrderDetailStatus } from "@/types/enums"

/**
 * "Món đã gọi" của Khách hàng (mobile, theo phiên bàn) — các món đã gửi xuống bếp,
 * tách biệt với giỏ hàng (customer/store/cart.store.ts, vẫn CHƯA gửi bếp).
 * TODO(api): khi có backend, đây sẽ là GET /api/orders?tableSessionId=... (nhiều Order,
 * mỗi Order = 1 "lượt gửi"), thay vì giữ trong bộ nhớ trình duyệt.
 *
 * 1 OrderBatch = 1 "lượt" gửi món (khớp field `note`/nhóm hiển thị "LƯỢT n" trong màn Món đã gọi).
 * 1 OrderedLine = 1 dòng món trong lượt đó, status dùng chung OrderDetailStatus (mục 4, StatusBadge).
 */
export interface OrderedLine {
  id: string
  dishId: string
  name: string
  imageUrl?: string
  quantity: number
  unitPrice: number
  optionsSummary?: string
  status: OrderDetailStatus
}

export interface OrderBatch {
  id: string
  /** Số thứ tự lượt gửi trong phiên, hiển thị "LƯỢT {batchNumber}" */
  batchNumber: number
  /** Giờ gửi, định dạng HH:mm để hiển thị cạnh nhãn lượt */
  sentAtLabel: string
  lines: OrderedLine[]
}

interface CustomerOrdersState {
  batches: OrderBatch[]
  /** Thêm 1 lượt gửi mới từ Giỏ hàng — mọi dòng khởi tạo ở trạng thái PENDING (Chờ xác nhận) */
  addBatch: (lines: Array<Omit<OrderedLine, "id" | "status">>) => OrderBatch
  /** Khách tự huỷ 1 dòng đang ở trạng thái Chờ xác nhận (chưa được bếp nhận) */
  cancelLine: (batchId: string, lineId: string) => void
  /** Xoá toàn bộ lịch sử — dùng khi phiên bàn đóng / khách rời bàn */
  clearAll: () => void
}

function genId(prefix: string) {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? `${prefix}-${crypto.randomUUID()}`
    : `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

const INITIAL_DEMO_BATCHES: OrderBatch[] = [
  {
    id: "batch-1",
    batchNumber: 1,
    sentAtLabel: "19:24",
    lines: [
      {
        id: "line-1-1",
        dishId: "pho-bo-tai-nam",
        name: "Phở bò tái nạm",
        quantity: 1,
        unitPrice: 65000,
        status: "SERVED",
      },
    ],
  },
  {
    id: "batch-2",
    batchNumber: 2,
    sentAtLabel: "19:41",
    lines: [
      {
        id: "line-2-1",
        dishId: "bun-cha-ha-noi",
        name: "Bún chả Hà Nội",
        quantity: 1,
        unitPrice: 70000,
        status: "PREPARING",
      },
      {
        id: "line-2-2",
        dishId: "tra-tac",
        name: "Trà tắc",
        quantity: 2,
        unitPrice: 30000,
        status: "PENDING",
      },
    ],
  },
]

export const useCustomerOrdersStore = create<CustomerOrdersState>((set, get) => ({
  batches: INITIAL_DEMO_BATCHES,

  addBatch: (lines) => {
    const batch: OrderBatch = {
      id: genId("batch"),
      batchNumber: get().batches.length + 1,
      sentAtLabel: new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" }),
      lines: lines.map((line) => ({ ...line, id: genId("line"), status: "PENDING" })),
    }
    set((state) => ({ batches: [...state.batches, batch] }))
    return batch
  },

  cancelLine: (batchId, lineId) =>
    set((state) => ({
      batches: state.batches.map((b) =>
        b.id !== batchId
          ? b
          : {
              ...b,
              lines: b.lines.map((l) => (l.id === lineId ? { ...l, status: "CANCELLED" } : l)),
            },
      ),
    })),

  clearAll: () => set({ batches: [] }),
}))

/** Tổng tiền các dòng CHƯA bị huỷ trên toàn phiên — dùng cho "Tạm tính" ở Món đã gọi / Yêu cầu tính tiền */
export function selectOrderedSubtotal(batches: OrderBatch[]): number {
  return batches
    .flatMap((b) => b.lines)
    .filter((l) => l.status !== "CANCELLED")
    .reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
}

/** 1 dòng món đã GỘP số lượng qua mọi lượt gửi — dùng để in Hoá đơn (khách không cần biết
 * món nào thuộc lượt nào, chỉ cần tổng số lượng theo từng cấu hình món). */
export interface AggregatedOrderedLine {
  /** khoá gộp: cùng món + cùng đơn giá + cùng tuỳ chọn mới được cộng dồn vào 1 dòng */
  key: string
  dishId: string
  name: string
  optionsSummary?: string
  unitPrice: number
  quantity: number
}

/** Gộp toàn bộ dòng CHƯA bị huỷ (mọi lượt gửi trong phiên) thành danh sách dòng cho Hoá đơn */
export function selectOrderedLineItems(batches: OrderBatch[]): AggregatedOrderedLine[] {
  const grouped = new Map<string, AggregatedOrderedLine>()
  batches
    .flatMap((b) => b.lines)
    .filter((l) => l.status !== "CANCELLED")
    .forEach((line) => {
      const key = `${line.dishId}::${line.unitPrice}::${line.optionsSummary ?? ""}`
      const existing = grouped.get(key)
      if (existing) {
        existing.quantity += line.quantity
      } else {
        grouped.set(key, {
          key,
          dishId: line.dishId,
          name: line.name,
          optionsSummary: line.optionsSummary,
          unitPrice: line.unitPrice,
          quantity: line.quantity,
        })
      }
    })
  return Array.from(grouped.values())
}

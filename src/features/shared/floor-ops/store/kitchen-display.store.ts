import { create } from "zustand"
import type { KDSTicketStatus } from "@/components/common/KDSTicket"

/** Trạng thái luồng bếp: Chờ xác nhận -> Đang chế biến -> Sẵn sàng phục vụ -> (biến mất khỏi bảng) */
export type KDSColumn = "AWAITING_CONFIRM" | "COOKING" | "READY"

export interface KDSTicketItem {
  id: number
  tableName: string
  timeAgo: string
  dishName: string
  quantity?: number
  note?: string
  hint?: string
  /** Món bán theo cân — cần nhập số cân trước khi được xác nhận gửi bếp (BR bán theo cân) */
  requiresWeighing?: boolean
  column: KDSColumn
}

const INITIAL_TICKETS: KDSTicketItem[] = [
  {
    id: 1,
    tableName: "Bàn B05",
    timeAgo: "vừa gửi",
    dishName: "Tôm hùm hấp bia",
    quantity: 1,
    hint: "Bán theo cân · cần cân trước",
    requiresWeighing: true,
    column: "AWAITING_CONFIRM",
  },
  {
    id: 2,
    tableName: "Bàn B04",
    timeAgo: "7 phút",
    dishName: "Gỏi cuốn tôm thịt",
    quantity: 1,
    note: "Thêm nước chấm",
    column: "AWAITING_CONFIRM",
  },
  {
    id: 3,
    tableName: "Bàn B07",
    timeAgo: "vừa xong",
    dishName: "Trà tắc",
    quantity: 2,
    note: "Ít đá",
    column: "AWAITING_CONFIRM",
  },
  {
    id: 4,
    tableName: "Bàn B01",
    timeAgo: "4 phút",
    dishName: "Phở bò tái nạm",
    quantity: 2,
    column: "COOKING",
  },
  {
    id: 5,
    tableName: "Bàn B01",
    timeAgo: "4 phút",
    dishName: "Bún chả Hà Nội",
    quantity: 1,
    note: "Ít cay",
    column: "COOKING",
  },
  {
    id: 6,
    tableName: "Bàn B05",
    timeAgo: "7 phút",
    dishName: "Cơm tấm sườn",
    quantity: 3,
    column: "COOKING",
  },
  {
    id: 7,
    tableName: "Bàn B03",
    timeAgo: "5 phút",
    dishName: "Phở gà đặc biệt",
    quantity: 1,
    column: "COOKING",
  },
  {
    id: 8,
    tableName: "Bàn B06",
    timeAgo: "6 phút",
    dishName: "Chả giò tôm",
    quantity: 1,
    column: "COOKING",
  },
]

export type KDSFilter = "ALL" | "AWAITING_CONFIRM" | "COOKING"

interface KitchenDisplayState {
  tickets: KDSTicketItem[]
  filter: KDSFilter

  setFilter: (filter: KDSFilter) => void
  /** Nhập số cân xong -> chuyển thẳng sang "Đang chế biến" */
  submitWeight: (ticketId: number) => void
  /** Bếp xác nhận đã nhận món -> chuyển sang "Đang chế biến" */
  confirmTicket: (ticketId: number) => void
  /** Bếp đánh dấu nấu xong -> chuyển sang "Sẵn sàng phục vụ" */
  markCooked: (ticketId: number) => void
  /** Phục vụ đã mang món ra bàn -> phiếu biến mất khỏi bảng bếp */
  markServed: (ticketId: number) => void
}

export const useKitchenDisplayStore = create<KitchenDisplayState>((set) => ({
  tickets: INITIAL_TICKETS,
  filter: "ALL",

  setFilter: (filter) => set({ filter }),

  submitWeight: (ticketId) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId
          ? {
              ...t,
              requiresWeighing: false,
              hint: undefined,
              column: "COOKING",
              timeAgo: "vừa xác nhận",
            }
          : t,
      ),
    })),

  confirmTicket: (ticketId) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, column: "COOKING", timeAgo: "vừa xác nhận" } : t,
      ),
    })),

  markCooked: (ticketId) =>
    set((state) => ({
      tickets: state.tickets.map((t) =>
        t.id === ticketId ? { ...t, column: "READY", timeAgo: "xong" } : t,
      ),
    })),

  markServed: (ticketId) =>
    set((state) => ({
      tickets: state.tickets.filter((t) => t.id !== ticketId),
    })),
}))

export type { KDSTicketStatus }

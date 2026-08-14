import { create } from "zustand";
import type { OrderDetailStatus } from "@/types/enums";

export interface OrderLineItem {
  id: number;
  name: string;
  status: OrderDetailStatus;
  quantity: number;
  unitPrice: number;
  note?: string;
}

export interface OrderRound {
  id: number;
  label: string;
  time: string;
  items: OrderLineItem[];
}

export interface DraftItem {
  id: number;
  name: string;
  unitPrice: number;
  quantity: number;
  note?: string;
}

export interface QuickAddSuggestion {
  id: number;
  name: string;
  unitPrice: number;
  note?: string;
}

const INITIAL_ROUNDS: OrderRound[] = [
  {
    id: 1,
    label: "LƯỢT GỌI 1",
    time: "19:24",
    items: [
      {
        id: 101,
        name: "Gỏi cuốn tôm thịt",
        status: "SERVED",
        quantity: 2,
        unitPrice: 45000,
        note: "Thêm nước chấm",
      },
      {
        id: 102,
        name: "Phở bò tái nạm",
        status: "SERVED",
        quantity: 1,
        unitPrice: 65000,
        note: "Không rau",
      },
    ],
  },
  {
    id: 2,
    label: "LƯỢT GỌI 2",
    time: "19:41",
    items: [
      {
        id: 103,
        name: "Bún chả hà nội",
        status: "PREPARING",
        quantity: 1,
        unitPrice: 70000,
        note: "Ít cay",
      },
      {
        id: 104,
        name: "Trà",
        status: "PENDING",
        quantity: 2,
        unitPrice: 30000,
      },
    ],
  },
];

const QUICK_ADD_SUGGESTIONS: QuickAddSuggestion[] = [
  { id: 201, name: "Bún chả hà nội", unitPrice: 70000, note: "Món chính" },
  {
    id: 202,
    name: "Lẩu hải sản",
    unitPrice: 250000,
    note: "Lẩu nồi 2–3 người",
  },
  { id: 203, name: "Trà tắc", unitPrice: 30000, note: "Đồ uống" },
];

const INITIAL_DRAFT_ITEMS: DraftItem[] = [
  {
    id: 201,
    name: "Bún chả hà nội",
    unitPrice: 70000,
    quantity: 1,
    note: "Món chính",
  },
  {
    id: 202,
    name: "Lẩu hải sản",
    unitPrice: 250000,
    quantity: 1,
    note: "Lẩu nồi 2–3 người",
  },
  {
    id: 203,
    name: "Trà tắc",
    unitPrice: 30000,
    quantity: 2,
    note: "Đồ uống",
  },
];

/** Ưu đãi tự động áp dụng (khớp promo "Combo trưa tiết kiệm" ở trang Thanh toán) */
export const AUTO_PROMO_LABEL = "Combo trưa tiết kiệm";
export const AUTO_PROMO_AMOUNT = 40000;

interface OrderDetailState {
  tableName: string;
  guestCount: number;
  sessionCode: string;
  waiterName: string;

  rounds: OrderRound[];
  quickAddSuggestions: QuickAddSuggestion[];
  draftItems: DraftItem[];
  searchQuery: string;

  setSearchQuery: (q: string) => void;
  setDraftQuantity: (suggestionId: number, quantity: number) => void;
  cancelItem: (roundId: number, itemId: number) => void;
  sendDraftToKitchen: () => void;
}

export const useOrderDetailStore = create<OrderDetailState>((set, get) => ({
  tableName: "Bàn B01",
  guestCount: 4,
  sessionCode: "#1024",
  waiterName: "Trần Ngọc",

  rounds: INITIAL_ROUNDS,
  quickAddSuggestions: QUICK_ADD_SUGGESTIONS,
  draftItems: INITIAL_DRAFT_ITEMS,
  searchQuery: "",

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setDraftQuantity: (suggestionId, quantity) =>
    set((state) => {
      const suggestion = state.quickAddSuggestions.find(
        (s) => s.id === suggestionId,
      );
      if (!suggestion) return state;

      const existing = state.draftItems.find((d) => d.id === suggestionId);

      if (quantity <= 0) {
        return {
          draftItems: state.draftItems.filter((d) => d.id !== suggestionId),
        };
      }

      if (existing) {
        return {
          draftItems: state.draftItems.map((d) =>
            d.id === suggestionId ? { ...d, quantity } : d,
          ),
        };
      }

      return {
        draftItems: [
          ...state.draftItems,
          {
            id: suggestion.id,
            name: suggestion.name,
            unitPrice: suggestion.unitPrice,
            note: suggestion.note,
            quantity,
          },
        ],
      };
    }),

  cancelItem: (roundId, itemId) =>
    set((state) => ({
      rounds: state.rounds.map((round) =>
        round.id === roundId
          ? { ...round, items: round.items.filter((i) => i.id !== itemId) }
          : round,
      ),
    })),

  sendDraftToKitchen: () => {
    const { draftItems, rounds } = get();
    if (draftItems.length === 0) return;

    const nextRoundId = Math.max(...rounds.map((r) => r.id)) + 1;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    let nextItemId =
      Math.max(...rounds.flatMap((r) => r.items.map((i) => i.id))) + 1;

    const newRound: OrderRound = {
      id: nextRoundId,
      label: `LƯỢT GỌI ${nextRoundId}`,
      time,
      items: draftItems.map((d) => ({
        id: nextItemId++,
        name: d.name,
        status: "PENDING",
        quantity: d.quantity,
        unitPrice: d.unitPrice,
        note: d.note,
      })),
    };

    set({ rounds: [...rounds, newRound], draftItems: [] });
  },
}));

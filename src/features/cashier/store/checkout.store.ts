import { create } from "zustand";
import type { DiscountType, PaymentMethod } from "@/types/enums";

export interface CheckoutLineItem {
  id: number;
  name: string;
  note?: string;
  quantity: number;
  lineTotal: number;
}

export interface ManualDiscountState {
  scope: "INVOICE" | "ITEM";
  type: DiscountType;
  value: number;
  reason: string;
  amount: number;
  /** Vượt ngưỡng cho phép của chi nhánh (BR-10) — cần Quản lý chi nhánh duyệt */
  requiresApproval: boolean;
}

export interface ManualDiscountInput {
  scope: "INVOICE" | "ITEM";
  type: DiscountType;
  value: number;
  reason: string;
}

/** Ngưỡng chiết khấu tay không cần duyệt — vượt mức này phải gửi Quản lý chi nhánh (BR-10) */
export const MANUAL_DISCOUNT_APPROVAL_THRESHOLD_RATIO = 0.1;

export const AUTO_PROMO_LABEL = "Combo trưa tiết kiệm";
export const AUTO_PROMO_AMOUNT = 40000;

const SERVICE_FEE_RATE = 0.05;
const VAT_RATE = 0.08;

const INITIAL_ITEMS: CheckoutLineItem[] = [
  {
    id: 1,
    name: "Gỏi cuốn tôm thịt",
    note: "Nhỏ · thêm nước chấm",
    quantity: 2,
    lineTotal: 100000,
  },
  { id: 2, name: "Phở bò tái nạm", quantity: 2, lineTotal: 130000 },
  { id: 3, name: "Bún chả Hà Nội", quantity: 1, lineTotal: 70000 },
  { id: 4, name: "Trà tắc", note: "Ít đá", quantity: 2, lineTotal: 60000 },
  { id: 5, name: "Bia Saigon", quantity: 2, lineTotal: 40000 },
];

export interface IssuedInvoice {
  invoiceId: number;
  invoiceNumber: string;
  issuedAt: string; // dd/MM/yyyy · HH:mm
  method: PaymentMethod;
  amountTendered?: number;
  changeAmount?: number;
  cashierName: string;
  grandTotal: number;
  subTotal: number;
  autoPromoLabel: string;
  autoPromoAmount: number;
  manualDiscount: ManualDiscountState | null;
  serviceFee: number;
  vatAmount: number;
  items: CheckoutLineItem[];
}

interface CheckoutState {
  tableSessionId: number;
  tableName: string;
  guestCount: number;
  sessionCode: string;
  waiterName: string;
  cashierName: string;
  restaurantName: string;
  restaurantAddress: string;
  bankAccountLabel: string; // "Vietcombank · 0071 0009 88888"
  bankAccountOwner: string; // "CTY TNHH PHO VIET"

  items: CheckoutLineItem[];
  manualDiscount: ManualDiscountState | null;

  paymentMethod: PaymentMethod;
  cashTendered: number | null;
  qrPaid: boolean;

  lastInvoice: IssuedInvoice | null;

  // ---- derived getters (tính trực tiếp, không cache) ----
  getSubTotal: () => number;
  getAfterAutoPromo: () => number;
  getAfterManualDiscount: () => number;
  getServiceFee: () => number;
  getVatAmount: () => number;
  getGrandTotal: () => number;

  // ---- actions ----
  setPaymentMethod: (method: PaymentMethod) => void;
  setCashTendered: (amount: number | null) => void;
  applyManualDiscount: (input: ManualDiscountInput) => ManualDiscountState;
  removeManualDiscount: () => void;
  markQrPaid: () => void;
  issueInvoice: () => IssuedInvoice;
  resetPaymentState: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set, get) => ({
  tableSessionId: 1024,
  tableName: "Bàn B01",
  guestCount: 4,
  sessionCode: "#1024",
  waiterName: "Trần Ngọc",
  cashierName: "Lê Hương",
  restaurantName: "Nhà hàng Phở Việt",
  restaurantAddress: "12 Nguyễn Huệ, Quận 1, TP.HCM",
  bankAccountLabel: "Vietcombank · 0071 0009 88888",
  bankAccountOwner: "CTY TNHH PHO VIET",

  items: INITIAL_ITEMS,
  manualDiscount: null,

  paymentMethod: "CASH",
  cashTendered: null,
  qrPaid: false,

  lastInvoice: null,

  getSubTotal: () => get().items.reduce((sum, i) => sum + i.lineTotal, 0),

  getAfterAutoPromo: () => get().getSubTotal() - AUTO_PROMO_AMOUNT,

  getAfterManualDiscount: () => {
    const { manualDiscount } = get();
    return get().getAfterAutoPromo() - (manualDiscount?.amount ?? 0);
  },

  getServiceFee: () =>
    Math.round(get().getAfterManualDiscount() * SERVICE_FEE_RATE),

  getVatAmount: () =>
    Math.round(
      (get().getAfterManualDiscount() + get().getServiceFee()) * VAT_RATE,
    ),

  getGrandTotal: () =>
    get().getAfterManualDiscount() +
    get().getServiceFee() +
    get().getVatAmount(),

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setCashTendered: (amount) => set({ cashTendered: amount }),

  applyManualDiscount: (input) => {
    const base = get().getAfterAutoPromo();
    const amount =
      input.type === "PERCENTAGE"
        ? Math.round((base * input.value) / 100)
        : Math.min(input.value, base);
    const requiresApproval =
      amount > base * MANUAL_DISCOUNT_APPROVAL_THRESHOLD_RATIO;

    const next: ManualDiscountState = {
      scope: input.scope,
      type: input.type,
      value: input.value,
      reason: input.reason,
      amount,
      requiresApproval,
    };
    set({ manualDiscount: next });
    return next;
  },

  removeManualDiscount: () => set({ manualDiscount: null }),

  markQrPaid: () => set({ qrPaid: true }),

  issueInvoice: () => {
    const state = get();
    const grandTotal = state.getGrandTotal();
    const now = new Date();
    const invoice: IssuedInvoice = {
      invoiceId: state.tableSessionId,
      invoiceNumber: `HD-QUAN1-${String(100000 + state.tableSessionId).slice(-6)}`,
      issuedAt: `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} · ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`,
      method: state.paymentMethod,
      amountTendered:
        state.paymentMethod === "CASH"
          ? (state.cashTendered ?? grandTotal)
          : undefined,
      changeAmount:
        state.paymentMethod === "CASH" && state.cashTendered
          ? Math.max(0, state.cashTendered - grandTotal)
          : undefined,
      cashierName: state.cashierName,
      grandTotal,
      subTotal: state.getSubTotal(),
      autoPromoLabel: AUTO_PROMO_LABEL,
      autoPromoAmount: AUTO_PROMO_AMOUNT,
      manualDiscount: state.manualDiscount,
      serviceFee: state.getServiceFee(),
      vatAmount: state.getVatAmount(),
      items: state.items,
    };
    set({ lastInvoice: invoice });
    return invoice;
  },

  resetPaymentState: () =>
    set({
      manualDiscount: null,
      paymentMethod: "CASH",
      cashTendered: null,
      qrPaid: false,
      lastInvoice: null,
    }),
}));

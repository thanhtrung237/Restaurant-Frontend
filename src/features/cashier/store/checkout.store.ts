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
  manualDiscount: ManualDiscountState | null;
  serviceFee: number;
  vatAmount: number;
  items: CheckoutLineItem[];
  promotionName?: string;
  promotionAmount?: number;
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
  selectedPromotion: any | null;

  paymentMethod: PaymentMethod;
  cashTendered: number | null;
  qrPaid: boolean;

  lastInvoice: IssuedInvoice | null;

  // ---- actions ----
  setPaymentMethod: (method: PaymentMethod) => void;
  setCashTendered: (amount: number | null) => void;
  setSelectedPromotion: (promo: any | null) => void;
  setManualDiscount: (discount: ManualDiscountState | null) => void;
  applyManualDiscount: (input: ManualDiscountInput) => ManualDiscountState;
  removeManualDiscount: () => void;
  markQrPaid: () => void;
  resetPaymentState: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
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
  selectedPromotion: null,

  paymentMethod: "CASH",
  cashTendered: null,
  qrPaid: false,

  lastInvoice: null,

  setPaymentMethod: (method) => set({ paymentMethod: method }),

  setCashTendered: (amount) => set({ cashTendered: amount }),

  setSelectedPromotion: (promo) => set({ selectedPromotion: promo }),

  setManualDiscount: (discount) => set({ manualDiscount: discount }),

  applyManualDiscount: (input) => {
    // Số tiền sẽ được tính bởi BE
    const next: ManualDiscountState = {
      scope: input.scope,
      type: input.type,
      value: input.value,
      reason: input.reason,
      amount: 0, // BE sẽ tính
      requiresApproval: false, // BE sẽ quyết định
    };
    set({ manualDiscount: next });
    return next;
  },

  removeManualDiscount: () => set({ manualDiscount: null }),

  markQrPaid: () => set({ qrPaid: true }),

  resetPaymentState: () =>
    set({
      manualDiscount: null,
      selectedPromotion: null,
      paymentMethod: "CASH",
      cashTendered: null,
      qrPaid: false,
      lastInvoice: null,
    }),
}));

/**
 * Nơi tập trung toàn bộ query key của React Query.
 *
 * Quy ước: key đi từ rộng → hẹp, để `invalidateQueries` theo tiền tố hoạt động đúng.
 *   qk.orders.all              → ["orders"]
 *   qk.orders.byBranch(1)      → ["orders", "branch", 1]
 *   qk.orders.detail(7)        → ["orders", "detail", 7]
 * Invalidate `qk.orders.all` sẽ làm mới cả 2 key con ở trên.
 *
 * Luôn dùng file này thay vì viết mảng key trực tiếp trong component — sai 1 ký tự là
 * cache không khớp và UI không tự cập nhật sau mutation, mà TypeScript không báo lỗi.
 */
export const qk = {
  auth: {
    all: ["auth"] as const,
    currentAccount: () => ["auth", "current-account"] as const,
  },
  accounts: {
    all: ["accounts"] as const,
    list: (params?: unknown) => ["accounts", "list", params ?? null] as const,
    detail: (id: number) => ["accounts", "detail", id] as const,
    byUsername: (username: string) => ["accounts", "username", username] as const,
    byRestaurant: (restaurantId: number) => ["accounts", "restaurant", restaurantId] as const,
  },
  assignments: {
    all: ["assignments"] as const,
    detail: (id: number) => ["assignments", "detail", id] as const,
    byAccount: (accountId: number) => ["assignments", "account", accountId] as const,
    byBranch: (branchId: number) => ["assignments", "branch", branchId] as const,
    byRole: (roleId: number) => ["assignments", "role", roleId] as const,
  },
  roles: {
    all: ["roles"] as const,
    list: (params?: unknown) => ["roles", "list", params ?? null] as const,
    detail: (id: number) => ["roles", "detail", id] as const,
    byCode: (code: string) => ["roles", "code", code] as const,
    byRestaurant: (restaurantId: number) => ["roles", "restaurant", restaurantId] as const,
  },
  restaurants: {
    all: ["restaurants"] as const,
    list: (params?: unknown) => ["restaurants", "list", params ?? null] as const,
    detail: (id: number) => ["restaurants", "detail", id] as const,
    byCode: (code: string) => ["restaurants", "code", code] as const,
  },
  branches: {
    all: ["branches"] as const,
    list: (params?: unknown) => ["branches", "list", params ?? null] as const,
    detail: (id: number) => ["branches", "detail", id] as const,
    byRestaurant: (restaurantId: number) => ["branches", "restaurant", restaurantId] as const,
    byCode: (restaurantId: number, code: string) =>
      ["branches", "code", restaurantId, code] as const,
  },
  branchMenu: {
    all: ["branch-menu"] as const,
    forCustomer: (branchId: number) => ["branch-menu", "customer", branchId] as const,
    overview: (branchId: number) => ["branch-menu", "overview", branchId] as const,
  },
  branchDishStocks: {
    all: ["branch-dish-stocks"] as const,
    byBranch: (branchId: number) => ["branch-dish-stocks", "branch", branchId] as const,
    outOfStock: (branchId: number) => ["branch-dish-stocks", "out-of-stock", branchId] as const,
  },
  areas: {
    all: ["areas"] as const,
    list: (params?: unknown) => ["areas", "list", params ?? null] as const,
    detail: (id: number) => ["areas", "detail", id] as const,
    byBranch: (branchId: number, status?: string) =>
      ["areas", "branch", branchId, status ?? null] as const,
  },
  tables: {
    all: ["tables"] as const,
    detail: (id: number) => ["tables", "detail", id] as const,
    byBranch: (branchId: number, status?: string) =>
      ["tables", "branch", branchId, status ?? null] as const,
    byArea: (areaId: number) => ["tables", "area", areaId] as const,
    byQrCode: (branchId: number, qrCode: string) => ["tables", "qr", branchId, qrCode] as const,
  },
  tableSessions: {
    all: ["table-sessions"] as const,
    detail: (id: number) => ["table-sessions", "detail", id] as const,
    openByTable: (tableId: number) => ["table-sessions", "table", tableId, "open"] as const,
    openByBranch: (branchId: number) => ["table-sessions", "branch", branchId, "open"] as const,
    byTable: (tableId: number) => ["table-sessions", "table", tableId] as const,
    billPreview: (id: number) => ["table-sessions", "bill-preview", id] as const,
  },
  takeawayOrders: {
    all: ["takeaway-orders"] as const,
    byBranch: (branchId?: number) => ["takeaway-orders", branchId] as const,
  },
  categories: {
    all: ["categories"] as const,
    detail: (id: number) => ["categories", "detail", id] as const,
    byRestaurant: (restaurantId: number, status?: string) =>
      ["categories", "restaurant", restaurantId, status ?? null] as const,
  },
  dishes: {
    all: ["dishes"] as const,
    detail: (id: number) => ["dishes", "detail", id] as const,
    byRestaurant: (restaurantId: number, params?: unknown) =>
      ["dishes", "restaurant", restaurantId, params ?? null] as const,
    byBranch: (branchId: number) => ["dishes", "branch", branchId] as const,
    byCategory: (categoryId: number) => ["dishes", "category", categoryId] as const,
    affectedBranches: (id: number) => ["dishes", "affected-branches", id] as const,
  },
  dishOverrides: {
    all: ["dish-overrides"] as const,
    detail: (id: number) => ["dish-overrides", "detail", id] as const,
    byBranch: (branchId: number) => ["dish-overrides", "branch", branchId] as const,
    byDish: (dishId: number) => ["dish-overrides", "dish", dishId] as const,
  },
  optionGroups: {
    all: ["option-groups"] as const,
    list: (params?: unknown) => ["option-groups", "list", params ?? null] as const,
    detail: (id: number) => ["option-groups", "detail", id] as const,
    byRestaurant: (restaurantId: number) => ["option-groups", "restaurant", restaurantId] as const,
  },
  optionItems: {
    all: ["option-items"] as const,
    list: (params?: unknown) => ["option-items", "list", params ?? null] as const,
    detail: (id: number) => ["option-items", "detail", id] as const,
    byGroup: (optionGroupId: number) => ["option-items", "group", optionGroupId] as const,
  },
  dishOptionGroups: {
    all: ["dish-option-groups"] as const,
    detail: (id: number) => ["dish-option-groups", "detail", id] as const,
    byDish: (dishId: number) => ["dish-option-groups", "dish", dishId] as const,
    byOptionGroup: (optionGroupId: number) =>
      ["dish-option-groups", "option-group", optionGroupId] as const,
  },
  orders: {
    all: ["orders"] as const,
    detail: (id: number) => ["orders", "detail", id] as const,
    bySession: (tableSessionId: number, status?: string) =>
      ["orders", "session", tableSessionId, status ?? null] as const,
    byBranch: (branchId: number, status?: string) =>
      ["orders", "branch", branchId, status ?? null] as const,
  },
  orderDetails: {
    all: ["order-details"] as const,
    checkoutRemoval: ["order-details", "checkout-removal"] as const,
    detail: (id: number) => ["order-details", "detail", id] as const,
    byOrder: (orderId: number) => ["order-details", "order", orderId] as const,
    bySession: (tableSessionId: number, status?: string) =>
      ["order-details", "session", tableSessionId, status ?? null] as const,
  },
  invoices: {
    all: ["invoices"] as const,
    detail: (id: number) => ["invoices", "detail", id] as const,
    bySession: (tableSessionId: number) => ["invoices", "session", tableSessionId] as const,
    byBranch: (branchId: number, status?: string) =>
      ["invoices", "branch", branchId, status ?? null] as const,
  },
  payments: {
    all: ["payments"] as const,
    detail: (id: number) => ["payments", "detail", id] as const,
    byInvoice: (invoiceId: number) => ["payments", "invoice", invoiceId] as const,
  },
  manualDiscounts: {
    all: ["manual-discounts"] as const,
    detail: (id: number) => ["manual-discounts", "detail", id] as const,
    byOrder: (orderId: number) => ["manual-discounts", "order", orderId] as const,
    byInvoice: (invoiceId: number) => ["manual-discounts", "invoice", invoiceId] as const,
  },
  promotions: {
    all: ["promotions"] as const,
    detail: (id: number) => ["promotions", "detail", id] as const,
    byRestaurant: (restaurantId: number, params?: unknown) =>
      ["promotions", "restaurant", restaurantId, params ?? null] as const,
    byBranchActive: (branchId: number) => ["promotions", "branch", branchId, "active"] as const,
  },
  promotionBranches: {
    all: ["promotion-branches"] as const,
    byBranch: (branchId: number) => ["promotion-branches", "branch", branchId] as const,
    byPromotion: (promotionId: number) => ["promotion-branches", "promotion", promotionId] as const,
  },
  auditLogs: {
    all: ["audit-logs"] as const,
    list: (params?: unknown) => ["audit-logs", "list", params ?? null] as const,
    detail: (id: number) => ["audit-logs", "detail", id] as const,
    byRestaurant: (restaurantId: number) => ["audit-logs", "restaurant", restaurantId] as const,
    byBranch: (branchId: number) => ["audit-logs", "branch", branchId] as const,
    byEntityType: (entityType: string) => ["audit-logs", "entity-type", entityType] as const,
    byPerformedBy: (accountId: number) => ["audit-logs", "performed-by", accountId] as const,
  },
  reports: {
    all: ["reports"] as const,
    revenue: (branchIds: number[], from: string, to: string, groupBy: string) =>
      ["reports", "revenue", branchIds, from, to, groupBy] as const,
    hourly: (branchIds: number[], from: string, to: string) =>
      ["reports", "hourly", branchIds, from, to] as const,
    topDishes: (branchIds: number[], from: string, to: string, topN: number) =>
      ["reports", "top-dishes", branchIds, from, to, topN] as const,
    branchComparison: (restaurantId: number, from: string, to: string) =>
      ["reports", "branch-comparison", restaurantId, from, to] as const,
    anomalies: (branchIds: number[], from: string, to: string) =>
      ["reports", "anomalies", branchIds, from, to] as const,
  },
} as const

export const takeawayListPath = (tableMapPath: string) => `${tableMapPath}?mode=takeaway`
export const takeawayCreatePath = (tableMapPath: string) => `${tableMapPath}/them-don-mang-ve`
export const takeawayAddItemsPath = (tableMapPath: string, orderId: number) => `${takeawayCreatePath(tableMapPath)}/${orderId}`

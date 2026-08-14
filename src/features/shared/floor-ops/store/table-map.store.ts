import { create } from "zustand"
import type { DiningTable } from "@/types/models"
import type { TableDisplayStatus } from "@/components/common/TableCard"

export interface TableItem extends DiningTable {
  areaName?: string
  displayStatus: TableDisplayStatus
  customStatusLabel?: string
  subLabel?: string
  elapsedMinutes?: number
  timeText?: string
  guestCount?: number
  subtotal?: string
  hasAlert?: boolean
  note?: string
}

const INITIAL_TABLES: TableItem[] = [
  {
    id: 1,
    branchId: 1,
    areaId: 1,
    areaName: "Khu vực tầng 1",
    name: "B01",
    capacity: 4,
    status: "OCCUPIED",
    displayStatus: "OCCUPIED",
    elapsedMinutes: 45,
    guestCount: 4,
    subtotal: "320.000đ",
    hasAlert: true,
  },
  {
    id: 2,
    branchId: 1,
    areaId: 1,
    areaName: "Khu vực tầng 1",
    name: "B02",
    capacity: 2,
    status: "OCCUPIED",
    displayStatus: "AWAITING_PAYMENT",
    elapsedMinutes: 68,
    guestCount: 2,
    subtotal: "210.000đ",
  },
  {
    id: 3,
    branchId: 1,
    areaId: 1,
    areaName: "Khu vực tầng 1",
    name: "B03",
    capacity: 4,
    status: "RESERVED",
    displayStatus: "RESERVED",
    timeText: "19:00 hôm nay",
    guestCount: 4,
  },
  {
    id: 4,
    branchId: 1,
    areaId: 1,
    areaName: "Khu vực tầng 1",
    name: "B04",
    capacity: 4,
    status: "OCCUPIED",
    displayStatus: "WAITING_OPEN",
    subLabel: "— khách · vừa quét QR",
    subtotal: "—",
  },
  {
    id: 5,
    branchId: 1,
    areaId: 1,
    areaName: "Khu vực tầng 1",
    name: "B05",
    capacity: 6,
    status: "OCCUPIED",
    displayStatus: "OCCUPIED",
    elapsedMinutes: 22,
    guestCount: 6,
    subtotal: "540.000đ",
  },
  {
    id: 6,
    branchId: 1,
    areaId: 1,
    areaName: "Khu vực tầng 1",
    name: "B06",
    capacity: 2,
    status: "INACTIVE",
    displayStatus: "MERGED",
    subLabel: "↳ Đã gộp vào B01",
  },
  {
    id: 7,
    branchId: 1,
    areaId: 1,
    areaName: "Khu vực tầng 1",
    name: "B07",
    capacity: 2,
    status: "OCCUPIED",
    displayStatus: "OCCUPIED",
    elapsedMinutes: 12,
    guestCount: 2,
    subtotal: "95.000đ",
  },
  {
    id: 8,
    branchId: 1,
    areaId: 1,
    areaName: "Khu vực tầng 1",
    name: "B08",
    capacity: 4,
    status: "OCCUPIED",
    displayStatus: "AWAITING_PAYMENT",
    elapsedMinutes: 54,
    guestCount: 3,
    subtotal: "385.000đ",
  },
  {
    id: 9,
    branchId: 1,
    areaId: 1,
    areaName: "Khu vực tầng 1",
    name: "B09",
    capacity: 4,
    status: "AVAILABLE",
    displayStatus: "AVAILABLE",
    subLabel: "Nhấn để mở bàn",
  },
  {
    id: 10,
    branchId: 1,
    areaId: 1,
    areaName: "Khu vực tầng 1",
    name: "B10",
    capacity: 4,
    status: "OCCUPIED",
    displayStatus: "OCCUPIED",
    elapsedMinutes: 38,
    guestCount: 4,
    subtotal: "268.000đ",
  },
  {
    id: 11,
    branchId: 1,
    areaId: 1,
    areaName: "Khu vực tầng 1",
    name: "B11",
    capacity: 4,
    status: "AVAILABLE",
    displayStatus: "AVAILABLE",
    subLabel: "Nhấn để mở bàn",
  },
  {
    id: 12,
    branchId: 1,
    areaId: 1,
    areaName: "Khu vực tầng 1",
    name: "B12",
    capacity: 4,
    status: "OCCUPIED",
    displayStatus: "WAITING_OPEN",
    subLabel: "— khách · vừa quét QR",
    subtotal: "—",
  },
]

interface TableMapState {
  tables: TableItem[]
  selectedTableForOpen: TableItem | null
  isModalOpen: boolean
  searchQuery: string
  selectedFilter: TableDisplayStatus | "ALL"

  // Actions
  setSearchQuery: (query: string) => void
  setSelectedFilter: (filter: TableDisplayStatus | "ALL") => void
  openModal: (table: TableItem) => void
  closeModal: () => void
  confirmOpenTable: (tableId: number, guestCount: number, note?: string) => void
}

export const useTableMapStore = create<TableMapState>((set) => ({
  tables: INITIAL_TABLES,
  selectedTableForOpen: null,
  isModalOpen: false,
  searchQuery: "",
  selectedFilter: "ALL",

  setSearchQuery: (searchQuery) => set({ searchQuery }),

  setSelectedFilter: (selectedFilter) => set({ selectedFilter }),

  openModal: (table) =>
    set({
      selectedTableForOpen: table,
      isModalOpen: true,
    }),

  closeModal: () =>
    set({
      selectedTableForOpen: null,
      isModalOpen: false,
    }),

  confirmOpenTable: (tableId, guestCount, note) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId
          ? {
              ...t,
              status: "OCCUPIED",
              displayStatus: "OCCUPIED",
              guestCount,
              note,
              elapsedMinutes: 0,
              subtotal: "0đ",
              subLabel: undefined,
            }
          : t,
      ),
      isModalOpen: false,
      selectedTableForOpen: null,
    })),
}))

import { useState, useMemo } from "react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { BranchDetailHeader } from "./components/BranchDetailHeader"
import { BranchInfoTab } from "./components/BranchInfoTab"
import { BranchMenuTab } from "./components/BranchMenuTab"
import { BranchTableQrTab } from "./components/BranchTableQrTab"
import {
  AddTableModal,
  EditTableModal,
  PrintSingleQrModal,
  PrintAllQrModal,
} from "./components/TableQrModals"
import { MOCK_BRANCH_DETAILS, MOCK_BRANCH_MENU_ITEMS } from "./mock-data"
import type { BranchMenuItem, BranchDetail } from "./types"
import type { DiningTable } from "@/types/models"
import { useBranch } from "@/api/branches.api"
import {
  useTablesByBranch,
  useCreateTable,
  useUpdateTable,
  useGenerateTableQrCode,
} from "@/api/tables.api"
import { useAreasByBranch } from "@/api/areas.api"
import { useToast } from "@/hooks/use-toast"

interface BranchDetailPageProps {
  /** ID chi nhánh đang xem. Quản lý chi nhánh: luôn là chi nhánh của mình. Quản trị NH: theo :branchId trên URL. */
  branchId: number
  /** Điều hướng sang trang "Cấu hình chi nhánh" — mỗi vai trò có 1 URI riêng cho trang này. */
  onConfigBranch: () => void
}

/**
 * Chi tiết chi nhánh (3 tab: Thông tin, Menu chi nhánh, Bàn & QR)
 * Kết nối API Backend cho Tab Bàn & QR:
 * - Lấy danh sách bàn thực: GET /tables/branch/{branchId}
 * - Lấy danh sách khu vực: GET /areas/branch/{branchId}
 * - Thêm bàn mới & tự động sinh QR: POST /tables & POST /tables/{id}/generate-qr
 * - Sửa thông tin bàn: PUT /tables/{id}
 * - In mã QR đơn lẻ hoặc hàng loạt
 */
export function BranchDetailPage({ branchId, onConfigBranch }: BranchDetailPageProps) {
  const { toast } = useToast()

  // 1. Fetch dữ liệu từ backend
  const { data: branchData } = useBranch(branchId)
  const { data: tables = [], isLoading: tablesLoading } = useTablesByBranch(branchId)
  const { data: areas = [] } = useAreasByBranch(branchId)

  // Mutations
  const createTableMutation = useCreateTable()
  const updateTableMutation = useUpdateTable()
  const generateQrMutation = useGenerateTableQrCode()

  // Tab đang hoạt động: "info" | "menu" | "table-qr"
  const [activeTab, setActiveTab] = useState("table-qr")

  // State danh sách món (Menu chi nhánh)
  const [menuItems, setMenuItems] = useState<BranchMenuItem[]>(MOCK_BRANCH_MENU_ITEMS)

  // State các Modal Bàn & QR
  const [isAddTableOpen, setAddTableOpen] = useState(false)
  const [isPrintAllQrOpen, setPrintAllQrOpen] = useState(false)
  const [editingTable, setEditingTable] = useState<DiningTable | null>(null)
  const [printingTable, setPrintingTable] = useState<DiningTable | null>(null)

  // Map thông tin chi nhánh cho Header & InfoTab
  const fallbackMock = MOCK_BRANCH_DETAILS[branchId] || MOCK_BRANCH_DETAILS[1]
  const branch: BranchDetail = useMemo(() => {
    if (!branchData) return fallbackMock
    return {
      id: branchData.id,
      name: branchData.name,
      status: branchData.status,
      address: branchData.address || fallbackMock.address,
      managerName: fallbackMock.managerName,
      phone: branchData.phone || fallbackMock.phone,
      taxCode: branchData.taxCode || fallbackMock.taxCode,
      openingHours:
        branchData.openingTime && branchData.closingTime
          ? `${branchData.openingTime} - ${branchData.closingTime}`
          : fallbackMock.openingHours,
      tableCount: tables.length > 0 ? tables.length : fallbackMock.tableCount,
      staffCount: fallbackMock.staffCount,
      startDate: fallbackMock.startDate,
    }
  }, [branchData, tables.length, fallbackMock])

  // --- Handlers Bàn & QR ---
  const handlePrintAllQr = () => {
    setPrintAllQrOpen(true)
  }

  const handleAddTable = () => {
    setAddTableOpen(true)
  }

  const handlePrintSingleQr = (table: DiningTable) => {
    setPrintingTable(table)
  }

  const handleEditTable = (table: DiningTable) => {
    setEditingTable(table)
  }

  // Submit tạo bàn mới
  async function handleConfirmAddTable(newTableData: {
    name: string
    capacity: number
    areaId?: number
  }) {
    try {
      // 1. Tạo bàn mới qua POST /tables
      const created = await createTableMutation.mutateAsync({
        branchId,
        name: newTableData.name,
        capacity: newTableData.capacity,
        areaId: newTableData.areaId,
      })

      // 2. Tự động sinh mã QR cho bàn mới qua POST /tables/{id}/generate-qr
      await generateQrMutation.mutateAsync({
        id: created.id,
        frontendBaseUrl: window.location.origin,
      })

      toast({
        title: "Tạo bàn thành công",
        description: `Đã tạo ${created.name} và khởi tạo mã QR cho bàn.`,
        variant: "success",
      })
    } catch (err) {
      console.error("Lỗi khi thêm bàn:", err)
      toast({
        title: "Lỗi tạo bàn",
        description: err instanceof Error ? err.message : "Vui lòng thử lại",
        variant: "danger",
      })
      throw err
    }
  }

  // Submit sửa bàn
  async function handleConfirmEditTable(
    id: number,
    updateData: { name?: string; capacity?: number; areaId?: number }
  ) {
    try {
      await updateTableMutation.mutateAsync({
        id,
        body: updateData,
      })

      toast({
        title: "Cập nhật thành công",
        description: "Đã cập nhật thông tin bàn.",
        variant: "success",
      })
    } catch (err) {
      console.error("Lỗi khi cập nhật bàn:", err)
      toast({
        title: "Lỗi cập nhật",
        description: err instanceof Error ? err.message : "Vui lòng thử lại",
        variant: "danger",
      })
      throw err
    }
  }

  // Handlers Tab Menu
  const handleCreateCustomDish = () => {
    const nextId = menuItems.length + 1
    const newDish: BranchMenuItem = {
      id: Date.now(),
      name: `Món riêng chi nhánh #${nextId}`,
      category: "Món chính",
      originalPrice: null,
      branchPrice: 50000,
      diffText: "món riêng",
      status: "CUSTOM",
    }
    setMenuItems((prev) => [newDish, ...prev])
  }

  const handleEditDish = (dish: BranchMenuItem) => {
    console.log("Chỉnh sửa món:", dish.name)
  }

  return (
    <div className="flex flex-col min-h-full bg-surface-page p-6 lg:p-8 space-y-6">
      {/* 1. Header chung cho toàn bộ trang */}
      <BranchDetailHeader
        branch={branch}
        activeTab={activeTab}
        onConfigBranch={onConfigBranch}
        onPrintAllQr={handlePrintAllQr}
        onAddTable={handleAddTable}
      />

      {/* 2. 3 Tab: Thông tin, Menu chi nhánh, Bàn & QR */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="w-full justify-start gap-8 h-auto pb-0 bg-transparent rounded-none border-b border-border-default">
          <TabsTrigger value="info" className="cursor-pointer">
            Thông tin
          </TabsTrigger>
          <TabsTrigger value="menu" className="cursor-pointer">
            Menu chi nhánh
          </TabsTrigger>
          <TabsTrigger value="table-qr" className="cursor-pointer">
            Bàn &amp; QR
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Thông tin chi nhánh */}
        <TabsContent value="info" className="mt-0">
          <BranchInfoTab branch={branch} />
        </TabsContent>

        {/* Tab 2: Menu chi nhánh */}
        <TabsContent value="menu" className="mt-0">
          <BranchMenuTab
            menuItems={menuItems}
            onCreateCustomDish={handleCreateCustomDish}
            onEditDish={handleEditDish}
          />
        </TabsContent>

        {/* Tab 3: Bàn & QR */}
        <TabsContent value="table-qr" className="mt-0">
          <BranchTableQrTab
            tables={tables}
            areas={areas}
            loading={tablesLoading}
            onPrintQr={handlePrintSingleQr}
            onEditTable={handleEditTable}
          />
        </TabsContent>
      </Tabs>

      {/* Modals hỗ trợ quản lý bàn & QR */}
      <AddTableModal
        open={isAddTableOpen}
        onOpenChange={setAddTableOpen}
        areas={areas}
        branchId={branchId}
        onSuccess={handleConfirmAddTable}
      />

      <EditTableModal
        open={Boolean(editingTable)}
        onOpenChange={(open) => !open && setEditingTable(null)}
        table={editingTable}
        areas={areas}
        onSuccess={handleConfirmEditTable}
      />

      <PrintSingleQrModal
        open={Boolean(printingTable)}
        onOpenChange={(open) => !open && setPrintingTable(null)}
        table={printingTable}
        branchName={branch.name}
      />

      <PrintAllQrModal
        open={isPrintAllQrOpen}
        onOpenChange={setPrintAllQrOpen}
        tables={tables}
        branchName={branch.name}
      />
    </div>
  )
}

export default BranchDetailPage

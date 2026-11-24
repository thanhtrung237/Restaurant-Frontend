import { useState, useMemo, useCallback } from "react"
import { Plus, Settings2 } from "lucide-react"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { FAB } from "@/components/common/FAB"
import { FAB_POSITION_CLASS } from "@/components/layout/StickyActionBar"
import { HeaderOverflowMenu, type OverflowMenuAction } from "@/components/layout/HeaderOverflowMenu"
import { PageHeader } from "@/components/layout/PageHeader"
import { BranchDetailHeaderActions } from "./components/BranchDetailHeader"
import { BranchInfoTab } from "./components/BranchInfoTab"
import { BranchTableQrTab } from "./components/BranchTableQrTab"
import { AddAreaDialog } from "./components/AddAreaDialog"
import { BranchActionDialog } from "./components/BranchActionDialog"
import { BranchMenuManagementTab } from "@/features/shared/branch-menu"
import {
  AddTableModal,
  EditTableModal,
  PrintSingleQrModal,
  PrintAllQrModal,
} from "./components/TableQrModals"
import type { BranchDetail } from "./types"
import type { DiningTable } from "@/types/models"
import { useBranch } from "@/api/branches.api"
import {
  useTablesByBranch,
  useCreateTable,
  useUpdateTable,
  useDeleteTable,
  useChangeTableStatus,
  useGenerateTableQrCode,
} from "@/api/tables.api"
import { useAreasByBranch, useDeleteArea } from "@/api/areas.api"
import { useAssignmentsByBranch } from "@/api/assignments.api"
import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE } from "@/config/roles"
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
  return <BranchDetail key={branchId} branchId={branchId} onConfigBranch={onConfigBranch} />
}

function BranchDetail({ branchId, onConfigBranch }: BranchDetailPageProps) {
  const { toast } = useToast()
  const userRole = useAuthStore((state) => state.role)

  // 1. Fetch dữ liệu từ backend
  const { data: branchData } = useBranch(branchId)
  const tablesQuery = useTablesByBranch(branchId)
  const tables = tablesQuery.data ?? []
  const areasQuery = useAreasByBranch(branchId)
  const areas = areasQuery.data ?? []

  // Lấy phân công nhân viên (chỉ MANAGER và BRANCH_MANAGER được gọi - BR-18)
  const canManageBranch =
    userRole === APP_ROLE.BRANCH_MANAGER || userRole === APP_ROLE.RESTAURANT_ADMIN
  const { data: assignments = [] } = useAssignmentsByBranch(canManageBranch ? branchId : undefined)

  // Mutations
  const createTableMutation = useCreateTable()
  const updateTableMutation = useUpdateTable()
  const deleteTableMutation = useDeleteTable()
  const changeTableStatus = useChangeTableStatus()
  const deleteAreaMutation = useDeleteArea()
  const generateQrMutation = useGenerateTableQrCode()

  // Tab đang hoạt động: "info" | "menu" | "table-qr"
  const [activeTab, setActiveTab] = useState("table-qr")

  // State các Modal Bàn & QR
  const [isAddTableOpen, setAddTableOpen] = useState(false)
  const [areaFilter, setAreaFilter] = useState("all")
  const selectedArea = areas.find((area) => String(area.id) === areaFilter)
  const [isPrintAllQrOpen, setPrintAllQrOpen] = useState(false)
  const [printAreaFilter, setPrintAreaFilter] = useState("all")
  const [editingTable, setEditingTable] = useState<DiningTable | null>(null)
  const [printingTable, setPrintingTable] = useState<DiningTable | null>(null)
  const currentTable =
    editingTable && (tables.find((table) => table.id === editingTable.id) ?? editingTable)
  const tableBusy =
    currentTable &&
    (currentTable.hasOpenSession ||
      currentTable.status === "OCCUPIED" ||
      currentTable.status === "RESERVED")
  const tableInactive = currentTable?.status === "INACTIVE"

  // Map thông tin chi nhánh cho Header & InfoTab
  const branch: BranchDetail = useMemo(() => {
    if (!branchData) {
      return {
        id: branchId,
        name: "",
        status: "ACTIVE",
        address: "",
        managerName: "",
        phone: "",
        taxCode: "",
        openingHours: "",
        tableCount: 0,
        staffCount: 0,
        startDate: "",
      }
    }

    // Tính toán managerName và staffCount từ assignments
    let managerName = ""
    let staffCount = 0

    if (canManageBranch && assignments.length > 0) {
      // Lấy tên manager từ các phân công có roleCode = "BRANCH_MANAGER"
      const managers = assignments.filter((a) => a.roleCode === "BRANCH_MANAGER")
      if (managers.length > 0) {
        managerName = managers
          .map((m) => m.accountName)
          .filter(Boolean)
          .join(", ")
      }

      // Đếm số tài khoản khác nhau
      const uniqueAccountIds = new Set(assignments.map((a) => a.accountId))
      staffCount = uniqueAccountIds.size
    }

    return {
      id: branchData.id,
      name: branchData.name,
      status: branchData.status,
      address: branchData.address || "",
      managerName: managerName || "", // Ẩn nếu không có dữ liệu
      phone: branchData.phone || "",
      taxCode: branchData.taxCode || "",
      openingHours:
        branchData.openingTime && branchData.closingTime
          ? `${branchData.openingTime.slice(0, 5)} - ${branchData.closingTime.slice(0, 5)}`
          : "",
      tableCount: tables.length,
      staffCount: staffCount,
      startDate: "", // BE không có field này, bỏ
    }
  }, [branchData, tables.length, assignments, canManageBranch, branchId])

  // --- Handlers Bàn & QR ---
  const handlePrintAllQr = useCallback(() => {
    setPrintAreaFilter(areaFilter)
    setPrintAllQrOpen(true)
  }, [areaFilter])

  const handleAddTable = useCallback(() => {
    setAddTableOpen(true)
  }, [])

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
    updateData: { name?: string; capacity?: number; areaId?: number; clearArea?: boolean },
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

  // --- Header mobile: tiêu đề đổi theo tab đang mở (Figma "Quản lý bàn & QR · Mobile"
  // dùng riêng nhãn "Bàn & Mã QR" chứ không phải tên chi nhánh) ---
  const headerMeta = useMemo(() => {
    if (activeTab === "table-qr") {
      return {
        title: "Bàn & Mã QR",
        subtitle: `${tables.length} bàn · QR tự tạo khi thêm bàn`,
      }
    }
    if (activeTab === "menu") {
      return { title: "Menu chi nhánh", subtitle: branch.name }
    }
    return { title: branch.name, subtitle: branch.address }
  }, [activeTab, tables.length, branch.name, branch.address])

  // "Cấu hình chi nhánh" (FR-BRN-02) là chức năng đặc tả yêu cầu — ở <md nó vào menu "⋯"
  // thay vì biến mất cùng thanh tiêu đề.
  const overflowActions = useMemo<OverflowMenuAction[]>(
    () => [
      {
        key: "config-branch",
        label: "Cấu hình chi nhánh",
        icon: Settings2,
        onSelect: onConfigBranch,
      },
    ],
    [onConfigBranch],
  )
  const headerOverflow = useMemo(
    () => <HeaderOverflowMenu actions={overflowActions} />,
    [overflowActions],
  )

  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      {/* "In QR hàng loạt" cũng vào đầu tab Bàn & QR ở <md, "Thêm bàn" thành FAB,
          "Cấu hình chi nhánh" vào menu "⋯" trên MobileHeader. */}
      <PageHeader
        title={branch.name}
        subtitle={`${branch.address} · Quản lý: ${branch.managerName}`}
        mobileSubtitle={headerMeta.subtitle}
        mobileHeaderActions={headerOverflow}
        actions={
          <BranchDetailHeaderActions
            activeTab={activeTab}
            onConfigBranch={onConfigBranch}
            onPrintAllQr={handlePrintAllQr}
            onAddTable={handleAddTable}
          />
        }
      />

      <div className="flex flex-col gap-6 p-4 sm:p-6 lg:p-8">
        {/* 2. 3 Tab: Thông tin, Menu chi nhánh, Bàn & QR */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="w-full justify-start gap-3 sm:gap-8 h-auto pb-0 bg-transparent rounded-none border-b border-border-default">
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
            <BranchMenuManagementTab
              branchId={branchId}
              editable={userRole === APP_ROLE.BRANCH_MANAGER}
            />
          </TabsContent>

          {/* Tab 3: Bàn & QR */}
          <TabsContent value="table-qr" className="mt-0">
            <BranchTableQrTab
              tables={tables}
              areas={areas}
              areaFilter={areaFilter}
              onAreaFilterChange={setAreaFilter}
              areaAction={
                canManageBranch ? (
                  <>
                    <AddAreaDialog
                      branchId={branchId}
                      branchName={branch.name}
                      onCreated={(id) => setAreaFilter(String(id))}
                    />
                    {selectedArea ? (
                      <BranchActionDialog
                        key={selectedArea.id}
                        label="Xóa khu vực"
                        name={selectedArea.name}
                        description="Khu vực sẽ được gỡ khỏi danh sách của chi nhánh."
                        blocked={
                          tablesQuery.isLoading || tablesQuery.isError
                            ? "Cần tải được danh sách bàn trước khi xóa."
                            : tables.some((table) => table.areaId === selectedArea.id)
                              ? "Khu vực còn bàn. Hãy chỉnh sửa từng bàn để chuyển khu vực hoặc bỏ phân khu trước khi xóa."
                              : undefined
                        }
                        onConfirm={async () => {
                          await deleteAreaMutation.mutateAsync(selectedArea.id)
                        }}
                        onComplete={() => {
                          setAreaFilter("all")
                          toast({ title: "Đã xóa khu vực", variant: "success" })
                        }}
                      />
                    ) : null}
                  </>
                ) : null
              }
              areasUnavailable={areasQuery.isError}
              onRetryAreas={() => void areasQuery.refetch()}
              onAddTable={handleAddTable}
              loading={tablesQuery.isLoading}
              tablesUnavailable={tablesQuery.isError && !tablesQuery.data}
              onRetryTables={() => void tablesQuery.refetch()}
              onPrintQr={handlePrintSingleQr}
              onEditTable={handleEditTable}
              onPrintAllQr={handlePrintAllQr}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* "Thêm bàn" (FR-TBL-01) — FAB ở <md, chỉ trên tab Bàn & QR cho đúng ngữ cảnh */}
      {activeTab === "table-qr" ? (
        <FAB
          variant="circle"
          aria-label="Thêm bàn"
          title="Thêm bàn"
          icon={<Plus className="size-6 text-white" strokeWidth={2.5} />}
          onClick={handleAddTable}
          className={FAB_POSITION_CLASS}
        />
      ) : null}

      {/* Modals hỗ trợ quản lý bàn & QR */}
      <AddTableModal
        open={isAddTableOpen}
        onOpenChange={setAddTableOpen}
        areas={areas}
        defaultAreaId={selectedArea?.id}
        onSuccess={handleConfirmAddTable}
      />

      <EditTableModal
        open={Boolean(editingTable)}
        onOpenChange={(open) => !open && setEditingTable(null)}
        table={editingTable}
        areas={areas}
        onSuccess={handleConfirmEditTable}
        actions={
          canManageBranch && currentTable ? (
            <>
              <BranchActionDialog
                label={tableInactive ? "Sử dụng lại" : "Ngừng sử dụng"}
                name={currentTable.name}
                description={
                  tableInactive
                    ? "Bàn và mã QR sẽ hoạt động trở lại."
                    : "Bàn sẽ ẩn khỏi Sơ đồ bàn và mã QR sẽ tạm dừng. Bạn có thể sử dụng lại bàn từ Bàn & QR."
                }
                blocked={
                  tableBusy
                    ? "Bàn còn phiên hoạt động hoặc lịch đặt trước. Hãy xử lý phiên trước khi tiếp tục."
                    : undefined
                }
                destructive={false}
                onConfirm={async () => {
                  await changeTableStatus.mutateAsync({
                    id: currentTable.id,
                    status: tableInactive ? "AVAILABLE" : "INACTIVE",
                  })
                }}
                onComplete={() => {
                  setEditingTable(null)
                  toast({
                    title: tableInactive ? "Đã mở lại bàn" : "Đã ngừng sử dụng bàn",
                    variant: "success",
                  })
                }}
              />
              <BranchActionDialog
                label="Xóa bàn"
                name={currentTable.name}
                description="Chỉ xóa được bàn chưa có lịch sử. Bàn và mã QR sẽ bị gỡ khỏi chi nhánh."
                blocked={
                  tableBusy
                    ? "Bàn còn phiên hoạt động hoặc lịch đặt trước. Hãy xử lý phiên trước khi xóa."
                    : undefined
                }
                onConfirm={async () => {
                  await deleteTableMutation.mutateAsync(currentTable.id)
                }}
                onComplete={() => {
                  setEditingTable(null)
                  toast({ title: "Đã xóa bàn", variant: "success" })
                }}
              />
            </>
          ) : null
        }
      />

      <PrintSingleQrModal
        open={Boolean(printingTable)}
        onOpenChange={(open) => !open && setPrintingTable(null)}
        table={printingTable}
        branchName={branch.name}
      />

      {isPrintAllQrOpen ? (
        <PrintAllQrModal
          open
          onOpenChange={setPrintAllQrOpen}
          tables={tables}
          areas={areas}
          areaFilter={printAreaFilter}
          onAreaFilterChange={setPrintAreaFilter}
          branchName={branch.name}
        />
      ) : null}
    </div>
  )
}

export default BranchDetailPage

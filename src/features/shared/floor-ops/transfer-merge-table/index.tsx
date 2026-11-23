import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { ArrowRight, Info, ChevronDown } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE } from "@/config/roles"
import {
  WAITER_PATHS,
  CASHIER_PATHS,
  BRANCH_MANAGER_PATHS,
  RESTAURANT_ADMIN_PATHS,
} from "@/app/router/paths"
import {
  useTablesByBranch,
  useOpenSessionsByBranch,
  useTransferTable,
  useMergeTable,
  useOrderDetailsBySession,
  useBillPreview,
} from "@/features/shared/floor-ops/api"
import type { TableSession } from "@/types/models"
import { cn } from "@/lib/utils"
import { getErrorMessage } from "@/lib/http"

type TabType = "transfer" | "merge"

export default function TransferMergeTablePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()

  const role = useAuthStore((s) => s.role)
  const branchId = useAuthStore((s) => s.branchId)

  // Đọc state hoặc query params truyền tới nếu có
  const navState = (location.state as { sourceTableId?: number; sourceSessionId?: number; initialTab?: TabType } | null) || {}
  const searchParams = new URLSearchParams(location.search)
  const queryTableId = searchParams.get("tableId") ? Number(searchParams.get("tableId")) : undefined
  const queryTab = searchParams.get("tab") as TabType | null

  const [activeTab, setActiveTab] = React.useState<TabType>(
    queryTab || navState.initialTab || "transfer"
  )

  // Danh sách bàn và phiên đang mở
  const { data: tablesData = [] } = useTablesByBranch(
    branchId ?? undefined,
    undefined,
    { refetchInterval: 2000 }
  )
  const { data: sessionsData = [] } = useOpenSessionsByBranch(
    branchId ?? undefined,
    { refetchInterval: 2000 }
  )

  // Map session theo tableId
  const sessionsByTableId = React.useMemo(() => {
    const map = new Map<number, TableSession>()
    sessionsData.forEach((s) => {
      if (s.tableId != null) map.set(s.tableId, s)
    })
    return map
  }, [sessionsData])

  // Danh sách các bàn đang có phiên hoạt động (phục vụ / chờ thanh toán)
  const activeTablesWithSession = React.useMemo(() => {
    return tablesData
      .filter((t) => {
        const s = sessionsByTableId.get(t.id)
        return s && (s.status === "SERVING" || s.status === "WAITING_FOR_PAY" || s.status === "WAITING_FOR_OPEN")
      })
      .map((t) => ({
        table: t,
        session: sessionsByTableId.get(t.id)!,
      }))
  }, [tablesData, sessionsByTableId])

  // Bàn nguồn được chọn
  const [selectedSourceTableId, setSelectedSourceTableId] = React.useState<number | null>(() => {
    if (navState.sourceTableId) return navState.sourceTableId
    if (queryTableId) return queryTableId
    return null
  })

  // Nếu chưa có bàn nguồn được chọn hoặc bàn nguồn không còn active, tự động chọn bàn đầu tiên
  React.useEffect(() => {
    if (activeTablesWithSession.length > 0) {
      if (!selectedSourceTableId || !activeTablesWithSession.some((item) => item.table.id === selectedSourceTableId)) {
        setSelectedSourceTableId(activeTablesWithSession[0].table.id)
      }
    } else {
      setSelectedSourceTableId(null)
    }
  }, [activeTablesWithSession, selectedSourceTableId])

  const selectedSourceItem = React.useMemo(() => {
    return activeTablesWithSession.find((item) => item.table.id === selectedSourceTableId) || null
  }, [activeTablesWithSession, selectedSourceTableId])

  // Lấy chi tiết món & bill preview cho bàn nguồn được chọn
  const { data: sourceOrderDetails = [] } = useOrderDetailsBySession(
    selectedSourceItem?.session?.id,
    undefined,
    { enabled: !!selectedSourceItem?.session?.id }
  )
  const { data: sourceBillPreview } = useBillPreview(
    selectedSourceItem?.session?.id,
    { enabled: !!selectedSourceItem?.session?.id }
  )

  // Tính số phút đã trôi qua
  const elapsedMinutes = React.useMemo(() => {
    if (!selectedSourceItem?.session?.openedAt) return 0
    const opened = new Date(selectedSourceItem.session.openedAt)
    const now = new Date()
    return Math.max(0, Math.floor((now.getTime() - opened.getTime()) / 60000))
  }, [selectedSourceItem])

  // Số lượng món đang phục vụ
  const activeItemCount = React.useMemo(() => {
    return sourceOrderDetails.filter((d) => d.status !== "CANCELLED").length
  }, [sourceOrderDetails])

  // Tạm tính bàn nguồn
  const subtotalFormatted = React.useMemo(() => {
    if (sourceBillPreview?.grandTotal != null) {
      return `${Math.round(sourceBillPreview.grandTotal).toLocaleString("vi-VN")}đ`
    }
    const sum = sourceOrderDetails
      .filter((d) => d.status !== "CANCELLED")
      .reduce((acc, d) => acc + (d.price ?? d.priceAtOrderTime * d.quantity), 0)
    return `${Math.round(sum).toLocaleString("vi-VN")}đ`
  }, [sourceBillPreview, sourceOrderDetails])

  // --- DESTINATION SELECTION ---
  // Cho tab Chuyển bàn: Bàn đích là các bàn trống (AVAILABLE và không có session hoạt động)
  const availableTargetTables = React.useMemo(() => {
    return tablesData.filter((t) => {
      const s = sessionsByTableId.get(t.id)
      return t.status === "AVAILABLE" && (!s || s.status === "CLOSED" || s.status === "CANCELLED" || s.status === "MERGED")
    })
  }, [tablesData, sessionsByTableId])

  // Cho tab Gộp bàn: Bàn chính (bàn đích) là các bàn đang có phiên hoạt động (khác bàn nguồn)
  const mergeTargetTables = React.useMemo(() => {
    if (!selectedSourceTableId) return []
    return activeTablesWithSession.filter((item) => item.table.id !== selectedSourceTableId)
  }, [activeTablesWithSession, selectedSourceTableId])

  const [selectedTargetTableId, setSelectedTargetTableId] = React.useState<number | null>(null)

  // Reset selected target khi đổi tab hoặc đổi bàn nguồn
  React.useEffect(() => {
    setSelectedTargetTableId(null)
  }, [activeTab, selectedSourceTableId])

  // Mutations
  const transferMutation = useTransferTable()
  const mergeMutation = useMergeTable()

  // Điều hướng về Sơ đồ bàn theo role
  const handleCancel = () => {
    if (role === APP_ROLE.WAITER) navigate(WAITER_PATHS.TABLE_MAP)
    else if (role === APP_ROLE.CASHIER) navigate(CASHIER_PATHS.TABLE_MAP)
    else if (role === APP_ROLE.BRANCH_MANAGER) navigate(BRANCH_MANAGER_PATHS.TABLE_MAP)
    else if (role === APP_ROLE.RESTAURANT_ADMIN) navigate(RESTAURANT_ADMIN_PATHS.TABLE_MAP)
    else navigate(-1)
  }

  // Thực hiện chuyển bàn
  const handleConfirmTransfer = async () => {
    if (!selectedSourceItem?.session || !selectedTargetTableId) {
      toast({
        title: "Chưa chọn đủ bàn",
        description: "Vui lòng chọn bàn nguồn và bàn đích.",
        variant: "warning",
      })
      return
    }

    const targetTableObj = tablesData.find((t) => t.id === selectedTargetTableId)
    const targetTableName = targetTableObj?.name || `Bàn ID ${selectedTargetTableId}`
    const sourceTableName = selectedSourceItem.table.name

    try {
      await transferMutation.mutateAsync({
        id: selectedSourceItem.session.id,
        body: { targetTableId: selectedTargetTableId },
      })

      toast({
        title: "Chuyển bàn thành công",
        description: `Đã chuyển toàn bộ phiên từ ${sourceTableName} sang ${targetTableName}.`,
        variant: "success",
      })
      handleCancel()
    } catch (err) {
      toast({
        title: "Lỗi chuyển bàn",
        description: getErrorMessage(err),
        variant: "danger",
      })
    }
  }

  // Thực hiện gộp bàn
  const handleConfirmMerge = async () => {
    if (!selectedSourceItem?.session || !selectedTargetTableId) {
      toast({
        title: "Chưa chọn đủ bàn",
        description: "Vui lòng chọn bàn cần gộp và bàn chính.",
        variant: "warning",
      })
      return
    }

    const targetItem = activeTablesWithSession.find((item) => item.table.id === selectedTargetTableId)
    if (!targetItem?.session) {
      toast({
        title: "Bàn chính không hợp lệ",
        description: "Bàn chính phải có phiên đang hoạt động.",
        variant: "warning",
      })
      return
    }

    const sourceTableName = selectedSourceItem.table.name
    const targetTableName = targetItem.table.name

    try {
      await mergeMutation.mutateAsync({
        sourceSessionId: selectedSourceItem.session.id,
        targetSessionId: targetItem.session.id,
      })

      toast({
        title: "Gộp bàn thành công",
        description: `Đã gộp ${sourceTableName} vào bàn chính ${targetTableName}. ${sourceTableName} đã chuyển về trạng thái trống.`,
        variant: "success",
      })
      handleCancel()
    } catch (err) {
      toast({
        title: "Lỗi gộp bàn",
        description: getErrorMessage(err),
        variant: "danger",
      })
    }
  }

  const selectedTargetTableObj = tablesData.find((t) => t.id === selectedTargetTableId)
  const isPending = transferMutation.isPending || mergeMutation.isPending

  return (
    <div className="flex min-h-screen flex-col bg-[#F9FAFB]">
      <PageHeader
        title="Chuyển / Gộp bàn"
        subtitle="Chỉ trong phạm vi một chi nhánh · ghi nhật ký · khuyến mãi tính lại"
      />

      <div className="flex-1 p-6 sm:p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* TAB SWITCHER */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("transfer")}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-2xs",
              activeTab === "transfer"
                ? "bg-[#EA580C] text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
          >
            Chuyển bàn
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("merge")}
            className={cn(
              "px-5 py-2 rounded-full text-sm font-semibold transition-all shadow-2xs",
              activeTab === "merge"
                ? "bg-[#EA580C] text-white"
                : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
            )}
          >
            Gộp bàn
          </button>
        </div>

        {/* MAIN OPERATION ROW */}
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* CỘT TRÁI: THẺ BÀN NGUỒN */}
          <div className="w-full lg:w-[420px] rounded-2xl border-2 border-[#EA580C] bg-white p-6 shadow-sm relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                {activeTab === "transfer" ? "BÀN NGUỒN" : "CÁC BÀN CẦN GỘP"}
              </span>

              {/* Dropdown cho phép chọn bàn nguồn nếu có nhiều bàn active */}
              {activeTablesWithSession.length > 1 && (
                <div className="relative">
                  <select
                    value={selectedSourceTableId ?? ""}
                    onChange={(e) => setSelectedSourceTableId(Number(e.target.value))}
                    className="text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 pr-6 appearance-none cursor-pointer focus:outline-none focus:ring-1 focus:ring-[#EA580C]"
                  >
                    {activeTablesWithSession.map((item) => (
                      <option key={item.table.id} value={item.table.id}>
                        Đổi sang: {item.table.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="size-3 text-gray-400 absolute right-2 top-2 pointer-events-none" />
                </div>
              )}
            </div>

            {selectedSourceItem ? (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-extrabold text-[#EA580C]">
                    {selectedSourceItem.table.name}
                  </h2>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border border-[#FDBA74] text-[#C2410C] bg-[#FFF7ED]">
                    Đang phục vụ
                  </span>
                </div>

                <div className="space-y-3.5 text-sm">
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Số khách</span>
                    <span className="font-semibold text-gray-900">
                      {selectedSourceItem.session.guestCount ?? 1} khách
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Thời gian</span>
                    <span className="font-semibold text-gray-900">
                      {elapsedMinutes} phút
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600">
                    <span>Số món</span>
                    <span className="font-semibold text-gray-900">
                      {activeItemCount} món (đang phục vụ)
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-gray-600 pt-2 border-t border-gray-100">
                    <span>Tạm tính</span>
                    <span className="font-bold text-gray-900 text-base">
                      {subtotalFormatted}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-sm">
                Hiện không có bàn nào đang phục vụ để thao tác.
              </div>
            )}
          </div>

          {/* MŨI TÊN GIỮA */}
          <div className="flex items-center justify-center shrink-0">
            <div className="flex size-11 items-center justify-center rounded-full bg-[#FFEDD5] text-[#EA580C]">
              <ArrowRight className="size-5 stroke-[2.5]" />
            </div>
          </div>

          {/* CỘT PHẢI: LƯỚI BÀN ĐÍCH */}
          <div className="flex-1 w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm min-h-[260px] flex flex-col">
            <div className="mb-4">
              <span className="text-xs font-semibold tracking-wider text-gray-400 uppercase">
                {activeTab === "transfer"
                  ? "CHỌN BÀN ĐÍCH (đang trống)"
                  : "BÀN CHÍNH — giữ lại phiên"}
              </span>
            </div>

            {activeTab === "transfer" ? (
              // Lưới bàn trống cho Chuyển bàn
              availableTargetTables.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
                  Không có bàn trống nào trong chi nhánh
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {availableTargetTables.map((tbl) => {
                    const isSelected = selectedTargetTableId === tbl.id
                    return (
                      <button
                        key={tbl.id}
                        type="button"
                        onClick={() => setSelectedTargetTableId(tbl.id)}
                        className={cn(
                          "flex flex-col items-center justify-center h-20 rounded-xl border text-center transition-all cursor-pointer p-2",
                          isSelected
                            ? "border-2 border-[#EA580C] bg-[#FFF7ED] text-[#EA580C] shadow-xs"
                            : "border-gray-100 bg-[#F9FAFB] text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <span className="text-base font-bold">{tbl.name}</span>
                        <span className="text-xs font-normal text-gray-400 mt-0.5">Trống</span>
                      </button>
                    )
                  })}
                </div>
              )
            ) : (
              // Lưới bàn chính cho Gộp bàn
              mergeTargetTables.length === 0 ? (
                <div className="flex-1 flex items-center justify-center text-gray-400 text-sm italic">
                  Không có bàn nào khác đang phục vụ để gộp
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5">
                  {mergeTargetTables.map((item) => {
                    const isSelected = selectedTargetTableId === item.table.id
                    return (
                      <button
                        key={item.table.id}
                        type="button"
                        onClick={() => setSelectedTargetTableId(item.table.id)}
                        className={cn(
                          "flex flex-col items-center justify-center h-20 rounded-xl border text-center transition-all cursor-pointer p-2",
                          isSelected
                            ? "border-2 border-[#EA580C] bg-[#FFF7ED] text-[#EA580C] shadow-xs"
                            : "border-gray-100 bg-[#F9FAFB] text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                        )}
                      >
                        <span className="text-base font-bold">{item.table.name}</span>
                        <span className="text-xs font-normal text-gray-400 mt-0.5">
                          {item.session.guestCount ?? 1} khách
                        </span>
                      </button>
                    )
                  })}
                </div>
              )
            )}
          </div>
        </div>

        {/* HỘP LƯU Ý KHI GỘP BÀN (Chỉ hiện khi ở Tab Gộp bàn) */}
        {activeTab === "merge" && (
          <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] p-5 shadow-xs">
            <div className="flex items-start gap-3">
              <div className="flex size-7 items-center justify-center rounded-full bg-[#FEF3C7] text-[#D97706] shrink-0 mt-0.5">
                <Info className="size-4" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-gray-900">
                  Điều kiện &amp; lưu ý khi gộp bàn
                </h4>
                <ul className="text-xs text-gray-700 space-y-1 list-disc list-inside">
                  <li>Chỉ gộp được các bàn cùng bộ VAT &amp; phí dịch vụ — khác bộ sẽ bị chặn.</li>
                  <li>Khuyến mãi cấp hóa đơn sẽ được tính lại; khuyến mãi theo món giữ nguyên.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* BOTTOM ACTION BAR */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center sm:text-left">
            {activeTab === "transfer" ? (
              selectedTargetTableObj ? (
                <>
                  Cả phiên của <strong>{selectedSourceItem?.table.name}</strong> sẽ chuyển sang{" "}
                  <strong>{selectedTargetTableObj.name}</strong>. Bàn nguồn về trạng thái trống. Thao tác được ghi nhật ký.
                </>
              ) : (
                "Chọn một bàn trống ở bảng bên phải để xác nhận chuyển phiên."
              )
            ) : (
              selectedTargetTableObj ? (
                <>
                  Đơn &amp; phiên của <strong>{selectedSourceItem?.table.name}</strong> sẽ gộp vào bàn chính{" "}
                  <strong>{selectedTargetTableObj.name}</strong>. Bàn còn lại về trạng thái trống. Thao tác được ghi nhật ký.
                </>
              ) : (
                "Chọn bàn chính để gộp đơn và phiên vào."
              )
            )}
          </p>

          <div className="flex items-center gap-3 shrink-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isPending}
              className="px-6 h-10 border-gray-300 text-gray-700 hover:bg-gray-100"
            >
              Hủy
            </Button>

            {activeTab === "transfer" ? (
              <Button
                type="button"
                onClick={handleConfirmTransfer}
                disabled={!selectedSourceItem || !selectedTargetTableId || isPending}
                className="px-6 h-10 bg-[#EA580C] text-white hover:bg-[#C2410C] font-semibold"
              >
                {isPending ? "Đang xử lý..." : "Xác nhận chuyển bàn"}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleConfirmMerge}
                disabled={!selectedSourceItem || !selectedTargetTableId || isPending}
                className="px-6 h-10 bg-[#EA580C] text-white hover:bg-[#C2410C] font-semibold"
              >
                {isPending ? "Đang xử lý..." : "Xác nhận gộp bàn"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

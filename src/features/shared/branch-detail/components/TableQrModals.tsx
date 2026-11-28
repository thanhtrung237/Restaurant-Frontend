import * as React from "react"
import { createPortal } from "react-dom"
import { Printer, ExternalLink, QrCode } from "lucide-react"
import { QRCodeSVG } from "qrcode.react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { DraggableTableQr, getTableGuestUrl } from "@/components/common/TableCard"
import { getTableGuestPath } from "@/app/router/paths/customer.paths"
import type { DiningTable, Area } from "@/types/models"
import { groupBranchTables } from "../table-areas"
import "./table-qr-print.css"

interface AddTableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areas: Area[]
  defaultAreaId?: number
  onSuccess: (newTable: { name: string; capacity: number; areaId?: number }) => Promise<void>
}

export function AddTableModal({
  open,
  onOpenChange,
  areas,
  defaultAreaId,
  onSuccess,
}: AddTableModalProps) {
  const areaFieldId = React.useId()
  const [name, setName] = React.useState("")
  const [capacity, setCapacity] = React.useState("4")
  const [areaId, setAreaId] = React.useState<number>()
  const resolvedAreaId = areaId ?? defaultAreaId ?? areas[0]?.id
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setName("")
      setCapacity("4")
      setAreaId(undefined)
      setError(null)
    }
  }, [open])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError("Vui lòng nhập tên bàn")
      return
    }

    try {
      setLoading(true)
      setError(null)
      await onSuccess({
        name: name.trim(),
        capacity: parseInt(capacity, 10) || 4,
        areaId: resolvedAreaId,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tạo bàn")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-text-primary">Thêm bàn mới</DialogTitle>
          <DialogDescription className="text-xs text-text-tertiary">
            Hệ thống sẽ tự động khởi tạo mã QR cho bàn sau khi tạo thành công.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="rounded-xl bg-status-danger-subtle p-3 text-xs text-status-danger">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Tên / Mã bàn <span className="text-status-danger">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: Bàn 09 hoặc B09"
              className="w-full h-10 rounded-xl border border-border-default px-3 text-sm font-medium focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">Số chỗ ngồi</label>
            <input
              type="number"
              min="1"
              max="50"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full h-10 rounded-xl border border-border-default px-3 text-sm font-medium focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={areaFieldId} className="text-xs font-semibold text-text-secondary">
              Khu vực
            </label>
            <select
              id={areaFieldId}
              value={resolvedAreaId ?? ""}
              onChange={(e) => setAreaId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full h-10 rounded-xl border border-border-default px-3 text-sm font-medium focus:border-brand-primary focus:outline-none bg-surface-card cursor-pointer"
            >
              {areas.length === 0 && <option value="">Chưa phân khu</option>}
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold"
            >
              {loading ? "Đang tạo..." : "Lưu & Tạo mã QR"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

interface EditTableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: DiningTable | null
  areas: Area[]
  onSuccess: (
    id: number,
    data: { name?: string; capacity?: number; areaId?: number; clearArea?: boolean },
  ) => Promise<void>
  actions?: React.ReactNode
}

export function EditTableModal({
  open,
  onOpenChange,
  table,
  areas,
  onSuccess,
  actions,
}: EditTableModalProps) {
  const areaFieldId = React.useId()
  const [name, setName] = React.useState("")
  const [capacity, setCapacity] = React.useState("4")
  const [areaId, setAreaId] = React.useState<number | undefined>()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (table) {
      setName(table.name || "")
      setCapacity(String(table.capacity || 4))
      setAreaId(table.areaId ?? undefined)
      setError(null)
    }
  }, [table])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!table || !name.trim()) return

    try {
      setLoading(true)
      setError(null)
      await onSuccess(table.id, {
        name: name.trim(),
        capacity: parseInt(capacity, 10) || 4,
        areaId: areaId !== table.areaId ? areaId : undefined,
        clearArea: table.areaId != null && areaId == null ? true : undefined,
      })
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể cập nhật bàn")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-[420px] rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-text-primary">
            Chỉnh sửa {table?.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-text-tertiary">
            Cập nhật tên, sức chứa và khu vực của bàn.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-2">
          {error && (
            <div className="rounded-xl bg-status-danger-subtle p-3 text-xs text-status-danger">
              {error}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">Tên bàn</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 rounded-xl border border-border-default px-3 text-sm font-medium focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">Số chỗ ngồi</label>
            <input
              type="number"
              min="1"
              max="50"
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              className="w-full h-10 rounded-xl border border-border-default px-3 text-sm font-medium focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor={areaFieldId} className="text-xs font-semibold text-text-secondary">
              Khu vực
            </label>
            <select
              id={areaFieldId}
              value={areaId ?? ""}
              onChange={(e) => setAreaId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full h-10 rounded-xl border border-border-default px-3 text-sm font-medium focus:border-brand-primary focus:outline-none bg-surface-card cursor-pointer"
            >
              <option value="">Chưa phân khu</option>
              {table?.areaId != null && !areas.some((area) => area.id === table.areaId) ? (
                <option value={table.areaId}>{table.areaName || "Khu vực hiện tại"}</option>
              ) : null}
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-2.5 pt-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 rounded-xl"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-10 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white font-semibold"
            >
              {loading ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
        {actions ? (
          <div className="flex flex-wrap gap-2 border-t border-border-default pt-2">{actions}</div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

interface PrintSingleQrModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  table: DiningTable | null
  branchName?: string
}

export function PrintSingleQrModal({
  open,
  onOpenChange,
  table,
  branchName = "Phở Việt",
}: PrintSingleQrModalProps) {
  if (!table) return null

  const scanLink = getTableGuestPath(table.qrCode || table.name)

  // Bàn chưa có mã QR thì thẻ in ra chỉ là khung rỗng — chặn in thay vì để nhân viên
  // dán một tờ giấy không quét được lên bàn (FR-TBL-02).
  const canPrint = Boolean(table.qrCode)

  function handlePrint() {
    if (!canPrint) return
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] rounded-2xl p-6 text-center">
        <DialogHeader className="text-center sm:text-center">
          <DialogTitle className="text-xl font-bold text-text-primary">
            Mã QR {table.name}
          </DialogTitle>
          <DialogDescription className="text-xs text-text-tertiary">
            Khách hàng quét mã này để mở bàn và xem thực đơn
          </DialogDescription>
        </DialogHeader>

        {/* Khung in thẻ QR */}
        <div
          id="printable-single-qr"
          className="my-4 rounded-2xl border-2 border-border-default bg-white p-6 shadow-sm flex flex-col items-center"
        >
          <p className="text-sm font-bold text-brand-primary uppercase tracking-wider">
            {branchName}
          </p>
          <p className="text-2xl font-extrabold text-text-primary mt-1">{table.name}</p>
          <p className="text-xs text-text-tertiary mt-0.5">
            {table.capacity} chỗ · {table.areaName || "Khu vực chính"}
          </p>

          <div className="my-4 rounded-xl border border-gray-100 p-3 bg-white shadow-inner flex items-center justify-center">
            {table.qrCode ? (
              <DraggableTableQr qrCode={table.qrCode} tableName={table.name} size={192} />
            ) : (
              <div className="flex size-48 flex-col items-center justify-center gap-2 text-text-tertiary">
                <QrCode className="size-16" />
                <p className="px-2 text-center text-xs font-medium text-status-warning">
                  {table.name} chưa có mã QR
                </p>
              </div>
            )}
          </div>

          <p className="text-xs font-semibold text-text-secondary">
            Quét mã QR để đặt món ngay tại bàn
          </p>
          <p className="text-[11px] text-text-tertiary mt-1">
            Không cần cài ứng dụng · Gọi món trực tiếp
          </p>
        </div>

        {/* Nút thao tác */}
        <div className="flex flex-col gap-2 pt-1">
          {!canPrint ? (
            <p className="rounded-lg bg-status-warning-subtle px-3 py-2 text-xs font-medium text-status-warning print:hidden">
              Chưa in được: <strong>{table.name}</strong> chưa có mã QR. Sửa bàn để hệ thống tạo mã,
              rồi in lại.
            </p>
          ) : null}

          <div className="grid grid-cols-2 gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => window.open(scanLink, "_blank")}
              className="h-10 rounded-xl gap-1.5 text-xs font-semibold"
            >
              <ExternalLink className="size-3.5" />
              Mở thử trên web
            </Button>
            <Button
              type="button"
              onClick={handlePrint}
              disabled={!canPrint}
              className="h-10 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white gap-1.5 text-xs font-bold"
            >
              <Printer className="size-3.5" />
              In mã QR này
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface PrintAllQrModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tables: DiningTable[]
  areas: Area[]
  areaFilter: string
  onAreaFilterChange: (value: string) => void
  branchName?: string
}

const QR_CARDS_PER_PAGE = 9

export function PrintAllQrModal({
  open,
  onOpenChange,
  tables,
  areas,
  areaFilter,
  onAreaFilterChange,
  branchName = "Phở Việt",
}: PrintAllQrModalProps) {
  const tableGroups = groupBranchTables(areas, tables)
  const selectedGroup = tableGroups.get(areaFilter)
  const scopedTables = (selectedGroup?.tables ?? tables).filter(
    (table) => table.status !== "INACTIVE",
  )
  const printableTables = scopedTables.flatMap((table) =>
    table.qrCode ? [{ ...table, qrCode: table.qrCode }] : [],
  )
  const missingTables = scopedTables.filter((table) => !table.qrCode)
  const pages = Array.from(
    { length: Math.ceil(printableTables.length / QR_CARDS_PER_PAGE) },
    (_, index) => printableTables.slice(index * QR_CARDS_PER_PAGE, (index + 1) * QR_CARDS_PER_PAGE),
  )

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-4 sm:max-w-[760px] sm:p-6">
          <DialogHeader className="pr-8">
            <DialogTitle className="text-xl">In QR hàng loạt</DialogTitle>
            <DialogDescription>{branchName} · Khổ A4</DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap items-center gap-2 border-b border-border-default pb-4 sm:justify-between">
            <Select value={selectedGroup ? areaFilter : "all"} onValueChange={onAreaFilterChange}>
              <SelectTrigger
                aria-label="Phạm vi in QR"
                className="min-w-0 max-w-full flex-1 basis-48 sm:max-w-72 [&>span]:truncate"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-w-[calc(100vw-2rem)]">
                <SelectItem value="all">Toàn chi nhánh</SelectItem>
                {Array.from(tableGroups, ([id, group]) => (
                  <SelectItem key={id} value={id} className="break-words">
                    {group.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              type="button"
              onClick={() => window.print()}
              disabled={printableTables.length === 0}
              className="h-11 shrink-0"
            >
              <Printer aria-hidden="true" />
              In {printableTables.length} mã QR
            </Button>
          </div>

          {missingTables.length > 0 ? (
            <div className="rounded-xl bg-status-warning-subtle px-3.5 py-2.5 text-xs">
              <p className="font-semibold text-status-warning">
                {missingTables.length} bàn chưa có mã QR
              </p>
              <p className="mt-1 text-text-secondary">
                {missingTables.map((table) => table.name).join(", ")}
              </p>
            </div>
          ) : null}

          {printableTables.length === 0 ? (
            <p className="py-8 text-center text-sm text-text-secondary">
              {scopedTables.length > 0
                ? "Chưa có mã QR nào để in trong phạm vi này."
                : "Phạm vi này chưa có bàn đang sử dụng."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3 min-[360px]:grid-cols-2 sm:grid-cols-3 sm:gap-4">
              {printableTables.map((table) => (
                <BulkQrCard key={table.id} table={table} branchName={branchName} />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
      {open && pages.length > 0
        ? createPortal(
            <div id="bulk-table-qr-print">
              {pages.map((page) => (
                <section key={page[0].id} className="bulk-table-qr-sheet">
                  {page.map((table) => (
                    <BulkQrCard key={table.id} table={table} branchName={branchName} print />
                  ))}
                </section>
              ))}
            </div>,
            document.body,
          )
        : null}
    </>
  )
}

function BulkQrCard({
  table,
  branchName,
  print = false,
}: {
  table: DiningTable & { qrCode: string }
  branchName: string
  print?: boolean
}) {
  const details = [
    table.capacity ? `${table.capacity} chỗ` : null,
    table.areaName || "Chưa phân khu",
  ]
    .filter(Boolean)
    .join(" · ")
  return (
    <div className="bulk-table-qr-card flex min-w-0 flex-col items-center rounded-xl border border-gray-300 bg-white p-2 text-center text-gray-900 sm:p-4">
      <p className="w-full break-words text-[11px] font-bold uppercase text-brand-primary">
        {branchName}
      </p>
      <p className="w-full break-words text-base font-bold leading-tight sm:text-xl">
        {table.name}
      </p>
      <p className="w-full break-words text-[10px] text-gray-600">{details}</p>
      <div className="my-2 flex max-w-full items-center justify-center">
        {print ? (
          <QRCodeSVG value={getTableGuestUrl(table.qrCode)} level="M" marginSize={4} />
        ) : (
          <DraggableTableQr qrCode={table.qrCode} tableName={table.name} size={104} />
        )}
      </div>
      <p className="text-[10px] font-semibold text-gray-700">Quét mã để gọi món tại bàn</p>
    </div>
  )
}

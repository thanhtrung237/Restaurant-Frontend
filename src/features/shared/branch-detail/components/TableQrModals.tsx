import * as React from "react"
import { Printer, ExternalLink, QrCode } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { DraggableTableQr } from "@/components/common/TableCard"
import type { DiningTable, Area } from "@/types/models"

interface AddTableModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  areas: Area[]
  branchId: number
  onSuccess: (newTable: { name: string; capacity: number; areaId?: number }) => Promise<void>
}

export function AddTableModal({
  open,
  onOpenChange,
  areas,
  onSuccess,
}: AddTableModalProps) {
  const [name, setName] = React.useState("")
  const [capacity, setCapacity] = React.useState("4")
  const [areaId, setAreaId] = React.useState<number | undefined>(areas[0]?.id)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (open) {
      setName("")
      setCapacity("4")
      setAreaId(areas[0]?.id)
      setError(null)
    }
  }, [open, areas])

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
        areaId: areaId ? Number(areaId) : undefined,
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
          <DialogTitle className="text-lg font-bold text-text-primary">
            Thêm bàn mới
          </DialogTitle>
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
            <label className="text-xs font-semibold text-text-secondary">
              Số chỗ ngồi
            </label>
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
            <label className="text-xs font-semibold text-text-secondary">
              Khu vực
            </label>
            <select
              value={areaId ?? ""}
              onChange={(e) => setAreaId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full h-10 rounded-xl border border-border-default px-3 text-sm font-medium focus:border-brand-primary focus:outline-none bg-surface-card cursor-pointer"
            >
              {areas.length === 0 && <option value="">Mặc định</option>}
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
  onSuccess: (id: number, data: { name?: string; capacity?: number; areaId?: number }) => Promise<void>
}

export function EditTableModal({
  open,
  onOpenChange,
  table,
  areas,
  onSuccess,
}: EditTableModalProps) {
  const [name, setName] = React.useState("")
  const [capacity, setCapacity] = React.useState("4")
  const [areaId, setAreaId] = React.useState<number | undefined>()
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  React.useEffect(() => {
    if (table) {
      setName(table.name || "")
      setCapacity(String(table.capacity || 4))
      setAreaId(table.areaId)
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
        areaId: areaId ? Number(areaId) : undefined,
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
      <DialogContent className="sm:max-w-[420px] rounded-2xl p-6">
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
            <label className="text-xs font-semibold text-text-secondary">
              Tên bàn
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full h-10 rounded-xl border border-border-default px-3 text-sm font-medium focus:border-brand-primary focus:outline-none"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary">
              Số chỗ ngồi
            </label>
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
            <label className="text-xs font-semibold text-text-secondary">
              Khu vực
            </label>
            <select
              value={areaId ?? ""}
              onChange={(e) => setAreaId(e.target.value ? Number(e.target.value) : undefined)}
              className="w-full h-10 rounded-xl border border-border-default px-3 text-sm font-medium focus:border-brand-primary focus:outline-none bg-surface-card cursor-pointer"
            >
              {areas.length === 0 && <option value="">Mặc định</option>}
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

  const scanLink = `/ban/${table.qrCode || table.name}`

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
        <div id="printable-single-qr" className="my-4 rounded-2xl border-2 border-border-default bg-white p-6 shadow-sm flex flex-col items-center">
          <p className="text-sm font-bold text-brand-primary uppercase tracking-wider">
            {branchName}
          </p>
          <p className="text-2xl font-extrabold text-text-primary mt-1">
            {table.name}
          </p>
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
              Chưa in được: <strong>{table.name}</strong> chưa có mã QR. Sửa bàn để hệ thống
              tạo mã, rồi in lại.
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
  branchName?: string
}

export function PrintAllQrModal({
  open,
  onOpenChange,
  tables,
  branchName = "Phở Việt",
}: PrintAllQrModalProps) {
  // Chỉ in bàn ĐÃ có mã QR. Bàn thiếu mã vẫn được nêu tên để người dùng biết phải xử lý
  // bàn nào, thay vì in ra một tập thẻ trong đó vài tờ không quét được (FR-TBL-02).
  const printableTables = tables.filter((t) => Boolean(t.qrCode))
  const missingTables = tables.filter((t) => !t.qrCode)

  function handlePrint() {
    if (printableTables.length === 0) return
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[760px] max-h-[90vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-border-default">
          <div>
            <DialogTitle className="text-xl font-bold text-text-primary">
              In QR hàng loạt ({printableTables.length} bàn)
            </DialogTitle>
            <DialogDescription className="text-xs text-text-tertiary">
              {branchName} · Chuẩn bị trang in
            </DialogDescription>
          </div>
          <Button
            type="button"
            onClick={handlePrint}
            disabled={printableTables.length === 0}
            className="h-10 px-5 rounded-xl bg-brand-primary hover:bg-brand-primary-hover text-white gap-1.5 font-semibold text-sm cursor-pointer shrink-0"
          >
            <Printer className="size-4" />
            In toàn bộ
          </Button>
        </DialogHeader>

        {/* print:hidden — cảnh báo là thông tin thao tác, không được lọt vào bản in */}
        {missingTables.length > 0 ? (
          <div className="mt-3 rounded-xl bg-status-warning-subtle px-3.5 py-2.5 print:hidden">
            <p className="text-xs font-semibold text-status-warning">
              {missingTables.length} bàn chưa in được — chưa có mã QR
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {missingTables.map((t) => t.name).join(", ")}
            </p>
            <p className="mt-1 text-[11px] text-text-tertiary">
              Các bàn còn lại vẫn in bình thường. Sửa từng bàn để hệ thống tạo mã QR, rồi
              in lại những bàn này.
            </p>
          </div>
        ) : null}

        {printableTables.length === 0 ? (
          <p className="py-10 text-center text-sm text-text-tertiary print:hidden">
            Không có bàn nào in được — toàn bộ bàn của chi nhánh chưa có mã QR.
          </p>
        ) : null}

        {/* Lưới CHỈ chứa bàn in được, nên window.print() không thể in nhầm thẻ rỗng */}
        <div id="printable-all-qr" className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4">
          {printableTables.map((tbl) => {
            return (
              <div
                key={tbl.id}
                className="rounded-xl border border-gray-300 bg-white p-4 text-center flex flex-col items-center shadow-xs page-break-inside-avoid"
              >
                <p className="text-[11px] font-bold text-brand-primary uppercase">
                  {branchName}
                </p>
                <p className="text-xl font-bold text-text-primary mt-0.5">
                  {tbl.name}
                </p>
                <p className="text-[10px] text-text-tertiary">
                  {tbl.capacity} chỗ · {tbl.areaName || "Khu vực"}
                </p>

                {/* `printableTables` đã lọc nên qrCode chắc chắn có giá trị */}
                <div className="my-2 rounded-lg border border-gray-100 p-2 bg-white flex items-center justify-center">
                  <DraggableTableQr
                    qrCode={tbl.qrCode as string}
                    tableName={tbl.name}
                    size={120}
                  />
                </div>

                <p className="text-[10px] font-semibold text-text-secondary">
                  Quét mã để gọi món tại bàn
                </p>
              </div>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

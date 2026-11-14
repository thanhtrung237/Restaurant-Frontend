import { useState } from "react"
import { useBranch, useUpdateBranchAdminConfig } from "@/api/branches.api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { getErrorMessage } from "@/lib/http"
import { requestGuestLocation } from "@/features/customer/lib/geolocation"

export function BranchGeofenceConfig({ branchId, readOnly }: { branchId: number; readOnly: boolean }) {
  const { data: branch, error } = useBranch(branchId)
  if (!branch) return <p role="status">{error ? getErrorMessage(error) : "Đang tải cấu hình vị trí…"}</p>
  return <GeofenceForm key={branchId} branch={branch} readOnly={readOnly} />
}

function GeofenceForm({ branch, readOnly }: { branch: import("@/types/models").Branch; readOnly: boolean }) {
  const branchId = branch.id
  const update = useUpdateBranchAdminConfig()
  const [enabled, setEnabled] = useState(branch.geofenceEnabled ?? false)
  const [latitude, setLatitude] = useState(branch.latitude?.toString() ?? "")
  const [longitude, setLongitude] = useState(branch.longitude?.toString() ?? "")
  const [radius, setRadius] = useState(branch.geofenceRadiusMeters ?? 150)
  const [accuracy, setAccuracy] = useState(branch.geofenceMaxAccuracyMeters ?? 100)
  const [message, setMessage] = useState("")
  const [locating, setLocating] = useState(false)
  async function locate() {
    setLocating(true)
    try {
      const location = await requestGuestLocation()
      setLatitude(location.latitude.toString()); setLongitude(location.longitude.toString())
      setMessage("Đã lấy vị trí thiết bị. Chỉ lưu nếu bạn đang ở đúng chi nhánh.")
    } catch (error) { setMessage(getErrorMessage(error)) }
    finally { setLocating(false) }
  }
  return <section className="space-y-4 rounded-xl border bg-white p-6">
    <h2 className="font-bold">Kiểm tra vị trí khi quét QR</h2>
    <p className="text-sm text-text-secondary">Vị trí chỉ hỗ trợ sàng lọc. Nhân viên vẫn cần xác nhận khách tại bàn.</p>
    <form className="space-y-4" onSubmit={(event) => {
      event.preventDefault()
      setMessage("")
      void update.mutateAsync({ id: branchId, body: { geofenceEnabled: enabled,
        latitude: latitude.trim() ? Number(latitude) : undefined,
        longitude: longitude.trim() ? Number(longitude) : undefined,
        geofenceRadiusMeters: radius, geofenceMaxAccuracyMeters: accuracy } })
        .then(() => setMessage("Đã lưu cấu hình vị trí."))
        .catch((error: unknown) => setMessage(getErrorMessage(error)))
    }}>
      <fieldset disabled={readOnly || update.isPending || locating || !branch} className="space-y-4">
        <label className="flex items-center gap-2"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />Bật kiểm tra vị trí</label>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-1">Vĩ độ<Input type="number" step="any" min={-90} max={90} required={enabled} value={latitude} onChange={(e) => setLatitude(e.target.value)} /></label>
          <label className="space-y-1">Kinh độ<Input type="number" step="any" min={-180} max={180} required={enabled} value={longitude} onChange={(e) => setLongitude(e.target.value)} /></label>
          <label className="space-y-1">Bán kính (m)<Input type="number" min={20} max={1000} required value={radius} onChange={(e) => setRadius(Number(e.target.value))} /></label>
          <label className="space-y-1">Sai số tối đa (m)<Input type="number" min={5} max={500} required value={accuracy} onChange={(e) => setAccuracy(Number(e.target.value))} /></label>
        </div>
        {!readOnly ? <div className="flex flex-wrap gap-3">
          <Button type="button" variant="outline" onClick={() => void locate()}>Lấy vị trí hiện tại</Button>
          <Button type="submit">{update.isPending ? "Đang lưu…" : "Lưu cấu hình vị trí"}</Button>
        </div> : null}
      </fieldset>
    </form>
    <p role="status" className="text-sm">{locating ? "Đang định vị…" : message}</p>
  </section>
}

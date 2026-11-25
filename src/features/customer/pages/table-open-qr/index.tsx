import * as React from "react"
import { generatePath, useNavigate, useParams } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { getErrorMessage } from "@/lib/http"
import { getGuestCredential, saveGuestCredential } from "@/lib/guest-credential"
import { getTableSession } from "@/api/table-sessions.api"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import {
  enterGuestTable,
  getGuestTable,
  type GuestTableInfo,
} from "@/features/customer/api/guest-access.api"
import { requestGuestLocation } from "@/features/customer/lib/geolocation"
import type { TableSession } from "@/types/models"

function TableOpenQrForm({ qrCode }: { qrCode: string }) {
  const navigate = useNavigate()
  const [table, setTable] = React.useState<GuestTableInfo | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState("")
  const [guestCount, setGuestCount] = React.useState(2)
  const [joinCode, setJoinCode] = React.useState("")
  const [staffAssisted, setStaffAssisted] = React.useState(false)

  const openSession = React.useCallback(
    (session: TableSession) => {
      useCustomerSessionStore.getState().setSession({ qrCode, tableSession: session })
      const target =
        session.status === "WAITING_FOR_OPEN"
          ? CUSTOMER_PATHS.WAITING_TABLE_OPEN
          : session.status === "WAITING_FOR_PAY"
            ? CUSTOMER_PATHS.INVOICE
            : CUSTOMER_PATHS.MENU
      navigate(generatePath(target, { qrCode }), {
        replace: true,
        state: { tableSessionId: session.id, tableName: session.tableName },
      })
    },
    [navigate, qrCode],
  )

  React.useEffect(() => {
    let cancelled = false
    async function load() {
      const branchMatch = qrCode.match(/(?:QR-)?B(\d+)/i)
      if (!branchMatch)
        throw new Error("Mã QR thiếu chi nhánh. Vui lòng nhờ nhân viên cấp lại mã QR.")
      const info = await getGuestTable(Number(branchMatch[1]), qrCode)
      if (cancelled) return
      setTable(info)
      const credential = getGuestCredential()
      if (credential) {
        try {
          const session = await getTableSession(credential.sessionId)
          if (
            !cancelled &&
            session.tableId === info.tableId &&
            ["WAITING_FOR_OPEN", "SERVING", "WAITING_FOR_PAY"].includes(session.status)
          )
            openSession(session)
        } catch {
          /* No valid capability: show admission form instead of joining by ID. */
        }
      }
    }
    void load()
      .catch((reason: unknown) => {
        if (!cancelled) setError(getErrorMessage(reason))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [qrCode, openSession])

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (!table || submitting) return
    setSubmitting(true)
    setError("")
    try {
      const useStaffAssistance = table.locationRequired && table.joinRequired && staffAssisted
      const location =
        table.locationRequired && !useStaffAssistance ? await requestGuestLocation() : undefined
      const result = await enterGuestTable({
        branchId: table.branchId,
        qrCode,
        guestCount,
        joinCode: useStaffAssistance ? joinCode : undefined,
        location,
      })
      saveGuestCredential(result.session.id, result.token)
      openSession(result.session)
    } catch (reason) {
      setError(getErrorMessage(reason))
      // Refresh only public metadata: another customer/staff member may have opened the table.
      try {
        setTable(await getGuestTable(table.branchId, qrCode))
      } catch {
        /* Keep original error. */
      }
    } finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return (
      <p role="status" className="p-8 text-center">
        Đang tải thông tin bàn…
      </p>
    )
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 p-6">
      <header className="rounded-2xl bg-brand-primary p-6 text-center text-white">
        <h1 className="text-2xl font-bold">{table?.restaurantName ?? "Gọi món tại bàn"}</h1>
        <p>{table?.branchName}</p>
        <p className="mt-3 text-xl font-semibold">{table?.tableName}</p>
      </header>
      {error ? (
        <p
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}
        </p>
      ) : null}
      {table ? (
        <form onSubmit={submit} className="space-y-5">
          {table.joinRequired ? (
            <div className="space-y-2 rounded-xl border p-4">
              <h2 className="text-lg font-semibold">Bạn đang ngồi tại {table.tableName}?</h2>
              <p className="text-sm text-text-secondary">
                Xác nhận đúng số bàn để tiếp tục vào lượt phục vụ hiện tại. Bạn không cần tạo bàn
                mới.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              <label htmlFor="guest-count" className="font-semibold">
                Số lượng khách
              </label>
              <Input
                id="guest-count"
                type="number"
                min={1}
                max={100}
                required
                value={guestCount}
                onChange={(event) => setGuestCount(Number(event.target.value))}
                disabled={submitting}
              />
            </div>
          )}
          {table.locationRequired ? (
            <div className="space-y-3 text-sm text-text-secondary">
              <p>
                Vị trí được kiểm tra một lần khi mở hoặc tham gia bàn; hệ thống không theo dõi vị
                trí liên tục.
              </p>
              {table.joinRequired ? (
                <details className="rounded-xl border p-3">
                  <summary className="cursor-pointer font-medium">
                    Không thể định vị? Nhờ nhân viên hỗ trợ
                  </summary>
                  <p className="mt-3">
                    Chỉ dùng mã hỗ trợ khi thiết bị không lấy được vị trí. Khách định vị được chỉ
                    cần bấm xác nhận bàn.
                  </p>
                  <label className="my-3 flex items-start gap-2">
                    <input
                      type="checkbox"
                      checked={staffAssisted}
                      disabled={submitting}
                      onChange={(event) => setStaffAssisted(event.target.checked)}
                    />
                    Sử dụng mã hỗ trợ do nhân viên tại bàn cung cấp
                  </label>
                  {staffAssisted ? (
                    <div className="space-y-2">
                      <label htmlFor="join-code" className="font-medium">
                        Mã hỗ trợ
                      </label>
                      <Input
                        id="join-code"
                        inputMode="numeric"
                        autoComplete="off"
                        pattern="[0-9]{8}"
                        maxLength={8}
                        required
                        value={joinCode}
                        onChange={(event) => setJoinCode(event.target.value.replace(/\D/g, ""))}
                        disabled={submitting}
                      />
                    </div>
                  ) : null}
                </details>
              ) : (
                <p>
                  Nếu không định vị được, hãy nhờ nhân viên mở bàn rồi cung cấp mã hỗ trợ và bấm tải
                  lại.
                </p>
              )}
            </div>
          ) : null}
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting
              ? "Đang xử lý…"
              : table.joinRequired
                ? "Đúng bàn, tiếp tục"
                : "Gửi yêu cầu mở bàn"}
          </Button>
        </form>
      ) : null}
      <Button
        type="button"
        variant="outline"
        disabled={submitting}
        onClick={() => window.location.reload()}
      >
        Tải lại thông tin bàn
      </Button>
    </main>
  )
}

export default function TableOpenQrPage() {
  const { qrCode = "" } = useParams<{ qrCode: string }>()
  return <TableOpenQrForm key={qrCode} qrCode={qrCode} />
}

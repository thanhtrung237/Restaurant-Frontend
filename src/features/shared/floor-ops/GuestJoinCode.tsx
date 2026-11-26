import { useState } from "react"
import { apiPost, getErrorMessage } from "@/lib/http"
import { Button } from "@/components/ui/button"

/** Staff-only code. Never included in public table/session responses. */
export function GuestJoinCode({ sessionId }: { sessionId: number }) {
  const [code, setCode] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  async function load() {
    setPending(true)
    setError("")
    try {
      setCode(await apiPost<string>(`/table-sessions/${sessionId}/guest-code`))
    } catch (reason) {
      setError(getErrorMessage(reason))
    } finally {
      setPending(false)
    }
  }
  return (
    <div className="space-y-2 rounded-xl border bg-white p-4">
      <Button
        type="button"
        variant="outline"
        className="max-md:h-auto max-md:min-h-11 max-md:max-w-full max-md:whitespace-normal max-md:wrap-anywhere max-md:py-2"
        disabled={pending}
        onClick={() => void load()}
      >
        {pending ? "Đang lấy mã…" : "Lấy mã hỗ trợ khách không định vị được"}
      </Button>
      {code ? (
        <p role="status">
          Mã hỗ trợ: <strong className="font-mono text-xl tracking-widest">{code}</strong>. Chỉ cung
          cấp sau khi kiểm tra khách tại bàn.
        </p>
      ) : null}
      {error ? <p role="alert">{error}</p> : null}
    </div>
  )
}

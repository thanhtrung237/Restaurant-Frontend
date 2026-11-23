import { Button } from "@/components/ui/button"
import { getNotificationTableLabel, useStaffInbox } from "@/api/staff-notifications.api"
import { useToast } from "@/hooks/use-toast"

export function StaffCallNotice({ notificationId, sessionId }: { notificationId: number; sessionId?: number }) {
  const { inbox, action } = useStaffInbox()
  const { toast } = useToast()
  const request = inbox.data?.find((item) => item.id === notificationId &&
    item.type === "STAFF_CALL" && (sessionId == null || item.tableSessionId === sessionId))
  if (!request) return null
  return (
    <section aria-label="Yêu cầu gọi nhân viên" className="mx-4 mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border-default bg-surface-card p-4 sm:mx-8">
      <div>
        <p className="font-semibold">{getNotificationTableLabel(request.tableName, request.tableSessionId)} · Khách gọi nhân viên</p>
        <p className="text-sm text-text-secondary">{request.dishName ? `Món “${request.dishName}”` : "Khách cần hỗ trợ tại bàn"}</p>
      </div>
      {request.resolvedAt ? <span className="text-sm font-semibold text-status-success">Đã xử lý</span> : (
        <Button type="button" disabled={action.isPending} onClick={() => action.mutate(
          { type: "resolve", id: request.id },
          { onError: () => toast({ title: "Không cập nhật được yêu cầu", variant: "danger" }) },
        )}>
          Đánh dấu đã xử lý
        </Button>
      )}
    </section>
  )
}

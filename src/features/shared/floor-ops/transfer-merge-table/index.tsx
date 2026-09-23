import { PageHeader } from "@/components/layout/PageHeader"

/**
 * Chuyển / Gộp bàn
 * Nguồn: Desktop / Chuyển - Gộp bàn (Gộp) · Figma "Chuyển - Gộp bàn · Mobile (375)"
 *
 * TODO(phase-3+): dựng UI đầy đủ theo Figma (tab Chuyển/Gộp, thẻ bàn nguồn, lưới bàn
 * đích, hộp "Điều kiện & lưu ý khi gộp bàn"). CHẶN: backend chưa expose endpoint
 * chuyển/gộp phiên — xem ghi chú đầu `features/shared/floor-ops/api/index.ts` và
 * `docs/be-issues.md`.
 */
export default function TransferMergeTablePage() {
  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      <PageHeader title="Chuyển / Gộp bàn" subtitle="Chưa khả dụng" />

      <div className="p-6">
        <p className="text-muted-foreground text-sm">Trang này sẽ được triển khai ở các phase tiếp theo.</p>
      </div>
    </div>
  )
}

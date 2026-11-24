import { PageHeader } from "@/components/layout/PageHeader"

/**
 * Doanh thu theo khung giờ
 * Nguồn: Desktop / Doanh thu theo khung giờ · Figma "Khung giờ · Mobile (375)"
 *
 * TODO(phase-3+): triển khai UI bằng các component dùng chung trong src/components
 */
export default function RevenueByHourPage() {
  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      <PageHeader title="Doanh thu theo khung giờ" subtitle="Chưa khả dụng" />

      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          Trang này sẽ được triển khai ở các phase tiếp theo.
        </p>
      </div>
    </div>
  )
}

import { PageHeader } from "@/components/layout/PageHeader"

/**
 * Chiết khấu thủ công
 * Nguồn: Desktop / Chiết khấu thủ công
 *
 * TODO(phase-3+): triển khai UI bằng các component dùng chung trong src/components.
 * Luồng chiết khấu tay đang dùng được qua ManualDiscountModal trên màn Chốt bàn
 * (FR-PRO-02); trang riêng này mới chỉ là chỗ giữ route.
 */
export default function ManualDiscountPage() {
  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      <PageHeader title="Chiết khấu thủ công" subtitle="Chưa khả dụng" />

      <div className="p-6">
        <p className="text-muted-foreground text-sm">
          Trang này sẽ được triển khai ở các phase tiếp theo.
        </p>
      </div>
    </div>
  )
}

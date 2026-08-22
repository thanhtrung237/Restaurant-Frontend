import { AlertCircle } from "lucide-react"
import { BranchRevenueBarChart } from "./BranchRevenueBarChart"
import { BranchComparisonTable } from "./BranchComparisonTable"
import { MOCK_BRANCH_COMPARISON } from "../mock-data"

export function BranchCompareTab() {
  return (
    <div className="space-y-6">
      {/* Warning Box: Cảnh báo chi nhánh bất thường */}
      <div className="flex items-center gap-3 rounded-xl border border-amber-200/60 bg-[#FFF7ED] px-4 py-3.5 shadow-2xs">
        <AlertCircle className="size-4 shrink-0 text-[#D97706]" />
        <p className="text-xs sm:text-sm font-normal text-[#92400E]">
          Chi nhánh Thủ Đức thấp hơn 38% so với trung bình và tỷ lệ hủy món cao gấp đôi – nên rà soát vận hành.
        </p>
      </div>

      {/* Bar Chart: Doanh thu theo chi nhánh */}
      <BranchRevenueBarChart data={MOCK_BRANCH_COMPARISON} />

      {/* Comparison Table: Bảng so sánh chi tiết các chi nhánh */}
      <BranchComparisonTable data={MOCK_BRANCH_COMPARISON} />
    </div>
  )
}

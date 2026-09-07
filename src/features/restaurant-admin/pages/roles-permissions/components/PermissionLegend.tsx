import React from "react"
import { Check } from "lucide-react"

export const PermissionLegend: React.FC = () => {
  return (
    <div className="flex items-center gap-6 py-1 text-sm text-gray-700 flex-wrap">
      {/* 1. Được phép */}
      <div className="flex items-center gap-2">
        <span className="inline-flex size-5 items-center justify-center rounded-full bg-[#E6F9EE] text-[#12B76A]">
          <Check className="size-3 stroke-[2.5]" />
        </span>
        <span className="font-medium text-gray-700">Được phép</span>
      </div>

      {/* 2. Cần duyệt */}
      <div className="flex items-center gap-2">
        <span className="inline-flex size-5 items-center justify-center rounded-md bg-[#FFF4ED] text-[#EA4A2A] font-bold text-xs">
          A
        </span>
        <span className="font-medium text-gray-700">Cần duyệt</span>
      </div>

      {/* 3. Chỉ đọc */}
      <div className="flex items-center gap-2">
        <span className="inline-flex size-5 items-center justify-center rounded-md bg-[#F2F4F7] text-[#667085] font-bold text-xs">
          R
        </span>
        <span className="font-medium text-gray-700">Chỉ đọc</span>
      </div>

      {/* 4. Không */}
      <div className="flex items-center gap-2">
        <span className="inline-flex size-5 items-center justify-center text-gray-400 font-light text-base select-none">
          —
        </span>
        <span className="font-medium text-gray-700">Không</span>
      </div>
    </div>
  )
}

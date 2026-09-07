import React from "react"
import { Button } from "@/components/ui/button"

interface ConfigHeaderProps {
  onSave?: () => void
  isSaving?: boolean
}

/**
 * Header màn hình Cấu hình
 * Nguồn: QuanLy/Cấu hình.png
 */
export const ConfigHeader: React.FC<ConfigHeaderProps> = ({
  onSave,
  isSaving = false,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Cấu hình
        </h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          Cấp nhà hàng: doanh nghiệp, thuế/phí, phân quyền
        </p>
      </div>

      {onSave ? (
        <div>
          <Button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            className="cursor-pointer gap-1.5 h-10 px-5 rounded-xl text-sm font-semibold bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover shadow-2xs"
          >
            {isSaving ? "Đang lưu..." : "Lưu cấu hình"}
          </Button>
        </div>
      ) : null}
    </div>
  )
}

import { ArrowLeft, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MenuTabType } from "../types"

interface MenuHeaderProps {
  activeTab: Exclude<MenuTabType, "menu-chi-nhanh">
  onTabChange: (tab: MenuTabType) => void
  onAdd: () => void
}

const addLabels = {
  mon: "Thêm món",
  "danh-muc": "Thêm danh mục",
  "tuy-chon": "Thêm nhóm tùy chọn",
}

export function MenuHeaderActions({ activeTab, onTabChange, onAdd }: MenuHeaderProps) {
  return (
    <div className="flex flex-wrap items-center gap-1 sm:gap-2">
      {activeTab === "mon" ? (
        <>
          <Button
            type="button"
            variant="ghost"
            className="h-10 px-2 sm:px-3"
            onClick={() => onTabChange("danh-muc")}
          >
            Danh mục
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="h-10 px-2 sm:px-3"
            onClick={() => onTabChange("tuy-chon")}
          >
            Tùy chọn món
          </Button>
        </>
      ) : (
        <Button
          type="button"
          variant="ghost"
          className="h-10 px-3"
          onClick={() => onTabChange("mon")}
        >
          <ArrowLeft aria-hidden="true" />
          Về danh sách món
        </Button>
      )}
      <Button type="button" className="h-10 px-3 sm:px-4" onClick={onAdd}>
        <Plus aria-hidden="true" />
        {addLabels[activeTab]}
      </Button>
    </div>
  )
}

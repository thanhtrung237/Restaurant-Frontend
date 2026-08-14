import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useTableMapStore } from "@/features/shared/floor-ops/store/table-map.store"
import { OpenTableModal } from "../OpenTableModal"
import { useToast } from "@/hooks/use-toast"
import TableMapPage from "../table-map"

/**
 * Mở bàn — route con của "Sơ đồ bàn" (vd: /phuc-vu/so-do-ban/:tableId/mo-ban,
 * /quan-ly-chi-nhanh/so-do-ban/:tableId/mo-ban, /quan-tri-nha-hang/so-do-ban/:tableId/mo-ban).
 * Dùng chung cho Phục vụ / QL chi nhánh / Quản trị nhà hàng (mục 4.2) nên KHÔNG được
 * điều hướng bằng path constant cố định của 1 role — dùng navigate tương đối để quay
 * lại đúng "so-do-ban" của bất kỳ role nào đang mount route này.
 */
export default function OpenTablePage() {
  const { tableId } = useParams<{ tableId: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const tables = useTableMapStore((s) => s.tables)
  const confirmOpenTable = useTableMapStore((s) => s.confirmOpenTable)

  const [isOpen, setIsOpen] = React.useState(true)

  const targetTable = React.useMemo(() => {
    if (!tableId) return null
    return (
      tables.find((t) => t.id === Number(tableId) || t.name.toLowerCase() === tableId.toLowerCase()) ||
      null
    )
  }, [tables, tableId])

  function handleClose() {
    setIsOpen(false)
    navigate("../..")
  }

  function handleConfirm(id: number, guestCount: number, note?: string) {
    confirmOpenTable(id, guestCount, note)
    toast({
      title: "Mở bàn thành công",
      description: `Bàn ${targetTable?.name || ""} đã chuyển sang trạng thái Đang phục vụ (${guestCount} khách).`,
      variant: "success",
    })
    navigate("../..")
  }

  return (
    <>
      <TableMapPage />
      <OpenTableModal
        isOpen={isOpen}
        table={targetTable}
        onClose={handleClose}
        onConfirm={handleConfirm}
      />
    </>
  )
}

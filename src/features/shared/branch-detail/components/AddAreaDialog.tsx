import { useId, useState, type FormEvent } from "react"
import { Plus } from "lucide-react"
import { useCreateArea } from "@/api/areas.api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/http"

export function AddAreaDialog({
  branchId,
  branchName,
  onCreated,
}: {
  branchId: number
  branchName: string
  onCreated: (areaId: number) => void
}) {
  const fieldId = useId()
  const { toast } = useToast()
  const createArea = useCreateArea()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")

  function handleOpenChange(nextOpen: boolean) {
    if (createArea.isPending) return
    setOpen(nextOpen)
    setName("")
    createArea.reset()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!name.trim() || createArea.isPending) return

    try {
      const area = await createArea.mutateAsync({ branchId, name: name.trim() })
      onCreated(area.id)
      setOpen(false)
      toast({ title: "Đã thêm khu vực", description: area.name, variant: "success" })
    } catch {
      // Hiển thị lỗi từ mutation và giữ nguyên tên để người dùng sửa.
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-10 shrink-0">
          <Plus aria-hidden="true" />
          Thêm khu vực
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md" showCloseButton={!createArea.isPending}>
        <DialogHeader>
          <DialogTitle>Thêm khu vực</DialogTitle>
          <DialogDescription>{branchName || "Chi nhánh hiện tại"}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor={fieldId} className="text-sm font-semibold">
              Tên khu vực
            </label>
            <Input
              id={fieldId}
              value={name}
              onChange={(event) => {
                setName(event.target.value)
                if (createArea.isError) createArea.reset()
              }}
              maxLength={100}
              required
              placeholder="Ví dụ: Tầng 2, Sân thượng"
              disabled={createArea.isPending}
              aria-invalid={createArea.isError}
              aria-describedby={createArea.isError ? `${fieldId}-error` : undefined}
            />
            {createArea.isError ? (
              <p id={`${fieldId}-error`} role="alert" className="text-sm text-status-danger">
                {getErrorMessage(createArea.error)}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={createArea.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={!name.trim() || createArea.isPending}>
              {createArea.isPending ? "Đang lưu…" : "Lưu khu vực"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

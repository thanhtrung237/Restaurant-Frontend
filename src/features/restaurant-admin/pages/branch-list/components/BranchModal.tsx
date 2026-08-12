import React, { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { FormField } from "@/components/common/FormField"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BranchItem, BranchFormData } from "../types"
import type { BranchStatus } from "@/types/enums"

interface BranchModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (data: BranchFormData) => void
  initialData?: BranchItem | null
}

interface BranchFormProps {
  initialData?: BranchItem | null
  onSave: (data: BranchFormData) => void
  onClose: () => void
}

const BranchFormContent: React.FC<BranchFormProps> = ({
  initialData,
  onSave,
  onClose,
}) => {
  const isEdit = Boolean(initialData)

  const [name, setName] = useState(initialData?.name || "")
  const [status, setStatus] = useState<BranchStatus>(initialData?.status || "ACTIVE")
  const [address, setAddress] = useState(initialData?.address || "")
  const [managerName, setManagerName] = useState(initialData?.managerName || "")
  const [tableCount, setTableCount] = useState<number>(initialData?.tableCount ?? 10)
  const [taxCode, setTaxCode] = useState(initialData?.taxCode || "")
  const [openingHours, setOpeningHours] = useState(initialData?.openingHours || "08:00 – 22:00")
  const [errors, setErrors] = useState<Record<string, string>>({})

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: Record<string, string> = {}
    if (!name.trim()) {
      newErrors.name = "Vui lòng nhập tên chi nhánh"
    }
    if (!address.trim()) {
      newErrors.address = "Vui lòng nhập địa chỉ chi nhánh"
    }
    if (tableCount < 1) {
      newErrors.tableCount = "Số bàn tối thiểu là 1"
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    onSave({
      name: name.trim(),
      status,
      address: address.trim(),
      managerName: managerName.trim() || undefined,
      tableCount: Number(tableCount) || 0,
      taxCode: taxCode.trim() || "(dùng MST nhà hàng)",
      openingHours: openingHours.trim() || "08:00 – 22:00",
    })

    onClose()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 py-2">
      {/* Tên chi nhánh & Trạng thái */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <FormField label="Tên chi nhánh" required error={errors.name}>
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                if (errors.name) setErrors((prev) => ({ ...prev, name: "" }))
              }}
              placeholder="VD: Chi nhánh Quận 1"
            />
          </FormField>
        </div>

        <div>
          <FormField label="Trạng thái">
            <Select
              value={status}
              onValueChange={(val) => setStatus(val as BranchStatus)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn trạng thái" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACTIVE">Hoạt động</SelectItem>
                <SelectItem value="INACTIVE">Tạm nghỉ</SelectItem>
              </SelectContent>
            </Select>
          </FormField>
        </div>
      </div>

      {/* Địa chỉ */}
      <FormField label="Địa chỉ" required error={errors.address}>
        <Input
          value={address}
          onChange={(e) => {
            setAddress(e.target.value)
            if (errors.address) setErrors((prev) => ({ ...prev, address: "" }))
          }}
          placeholder="VD: 12 Nguyễn Huệ, P.Bến Nghé, Q.1"
        />
      </FormField>

      {/* Quản lý & Số bàn */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Quản lý chi nhánh" helperText="Tên quản lý phụ trách (nếu có)">
          <Input
            value={managerName}
            onChange={(e) => setManagerName(e.target.value)}
            placeholder="VD: Nguyễn Văn An"
          />
        </FormField>

        <FormField label="Số bàn" required error={errors.tableCount}>
          <Input
            type="number"
            min={1}
            value={tableCount}
            onChange={(e) => {
              setTableCount(Number(e.target.value))
              if (errors.tableCount) setErrors((prev) => ({ ...prev, tableCount: "" }))
            }}
            placeholder="Số lượng bàn"
          />
        </FormField>
      </div>

      {/* Mã số thuế & Giờ mở cửa */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <FormField label="Mã số thuế" helperText="Để trống nếu dùng MST nhà hàng">
          <Input
            value={taxCode}
            onChange={(e) => setTaxCode(e.target.value)}
            placeholder="VD: 0312345678-001"
          />
        </FormField>

        <FormField label="Giờ mở cửa">
          <Input
            value={openingHours}
            onChange={(e) => setOpeningHours(e.target.value)}
            placeholder="VD: 08:00 – 22:00"
          />
        </FormField>
      </div>

      <DialogFooter className="pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="cursor-pointer"
        >
          Hủy
        </Button>
        <Button type="submit" className="cursor-pointer">
          {isEdit ? "Cập nhật" : "Thêm chi nhánh"}
        </Button>
      </DialogFooter>
    </form>
  )
}

/**
 * Modal tạo mới hoặc chỉnh sửa thông tin chi nhánh
 */
export const BranchModal: React.FC<BranchModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData,
}) => {
  const isEdit = Boolean(initialData)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Chỉnh sửa chi nhánh" : "Thêm chi nhánh mới"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật các thông tin cơ bản cho chi nhánh này."
              : "Điền các thông tin để thiết lập một chi nhánh mới trong hệ thống."}
          </DialogDescription>
        </DialogHeader>

        {isOpen ? (
          <BranchFormContent
            key={initialData ? `edit-${initialData.id}` : "add-new"}
            initialData={initialData}
            onSave={onSave}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

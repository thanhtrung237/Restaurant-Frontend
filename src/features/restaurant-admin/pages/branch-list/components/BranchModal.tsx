import React from "react"
import { Controller, useForm, useWatch, type Control } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { FormField } from "@/components/common/FormField"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { BranchListItem } from "@/types/models"
import { buildBranchSchema, parseRate, type BranchFormValues } from "../lib"
import type { BranchSaveResult, BranchSubmitData } from "../types"

interface BranchModalProps {
  isOpen: boolean
  onClose: () => void
  /** Trả `{ codeError }` để modal gắn lỗi vào ô mã và giữ nguyên form (409 trùng mã). */
  onSubmit: (data: BranchSubmitData) => Promise<BranchSaveResult>
  /** null = tạo mới. */
  initialData?: BranchListItem | null
  /** Toàn bộ chi nhánh hiện có — làm nguồn cho "Sao chép từ chi nhánh có sẵn". */
  branches: BranchListItem[]
  isSaving?: boolean
}

interface BranchFormProps extends Omit<BranchModalProps, "isOpen"> {}

const BranchFormContent: React.FC<BranchFormProps> = ({
  initialData,
  branches,
  onSubmit,
  onClose,
  isSaving = false,
}) => {
  const isEdit = Boolean(initialData)
  const canCopy = !isEdit && branches.length > 0
  const schema = React.useMemo(() => buildBranchSchema(isEdit), [isEdit])

  const {
    register,
    control,
    handleSubmit,
    setError,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BranchFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      code: initialData?.code ?? "",
      name: initialData?.name ?? "",
      address: initialData?.address ?? "",
      phone: initialData?.phone ?? "",
      vatRate: "",
      serviceFeeRate: "",
      copyEnabled: false,
      sourceBranchId: "",
      copyOpeningHours: true,
      copyFeeRates: true,
      copyBankInfo: true,
    },
  })

  const copyEnabled = useWatch({ control, name: "copyEnabled" })
  const copyFeeRates = useWatch({ control, name: "copyFeeRates" })
  // Chọn sao chép phí thì VAT/phí dịch vụ lấy từ chi nhánh nguồn → không nhập tay nữa.
  const feesFromSource = canCopy && copyEnabled && copyFeeRates
  // PUT /branches/{id} có nhận VAT/phí nhưng danh sách không trả về giá trị hiện tại;
  // sửa VAT/phí đi qua trang "Thuế & phí" (có cảnh báo phiên đang mở) nên ô này chỉ có khi tạo mới.
  const showRates = !isEdit && !feesFromSource

  const busy = isSaving || isSubmitting

  const submit = handleSubmit(async (values) => {
    const result = await onSubmit({
      code: values.code,
      name: values.name,
      address: values.address,
      phone: values.phone,
      vatRate: showRates ? parseRate(values.vatRate) : undefined,
      serviceFeeRate: showRates ? parseRate(values.serviceFeeRate) : undefined,
      copy:
        canCopy && values.copyEnabled
          ? {
              sourceBranchId: Number(values.sourceBranchId),
              copyOpeningHours: values.copyOpeningHours,
              copyFeeRates: values.copyFeeRates,
              copyBankInfo: values.copyBankInfo,
            }
          : null,
    })
    if (result && result.codeError) {
      setError("code", { type: "server", message: result.codeError }, { shouldFocus: true })
    }
  })

  return (
    <form onSubmit={submit} className="space-y-4 py-2" noValidate>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField
          label="Mã chi nhánh"
          required={!isEdit}
          htmlFor="branch-code"
          error={errors.code?.message}
          helperText={
            isEdit ? "Mã chi nhánh không thể thay đổi sau khi tạo." : "Duy nhất trong nhà hàng."
          }
        >
          <Input
            id="branch-code"
            {...register("code")}
            disabled={isEdit}
            maxLength={50}
            placeholder="VD: Q1"
            autoComplete="off"
          />
        </FormField>

        <FormField
          label="Tên chi nhánh"
          required
          htmlFor="branch-name"
          error={errors.name?.message}
          className="sm:col-span-2"
        >
          <Input
            id="branch-name"
            {...register("name")}
            placeholder="VD: Chi nhánh Quận 1"
            autoComplete="off"
          />
        </FormField>
      </div>

      <FormField label="Địa chỉ" htmlFor="branch-address" error={errors.address?.message}>
        <Input
          id="branch-address"
          {...register("address")}
          placeholder="VD: 12 Nguyễn Huệ, P.Bến Nghé, Q.1"
          autoComplete="off"
        />
      </FormField>

      <FormField label="Số điện thoại" htmlFor="branch-phone" error={errors.phone?.message}>
        <Input
          id="branch-phone"
          {...register("phone")}
          placeholder="VD: 0281234567"
          autoComplete="off"
        />
      </FormField>

      {showRates ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormField
            label="Thuế VAT (%)"
            htmlFor="branch-vat"
            error={errors.vatRate?.message}
            helperText="Từ 0 đến 100. Để trống nếu chưa cấu hình."
          >
            <Input
              id="branch-vat"
              {...register("vatRate")}
              inputMode="decimal"
              placeholder="VD: 8"
            />
          </FormField>
          <FormField
            label="Phí dịch vụ (%)"
            htmlFor="branch-service-fee"
            error={errors.serviceFeeRate?.message}
            helperText="Từ 0 đến 100. Để trống nếu chưa cấu hình."
          >
            <Input
              id="branch-service-fee"
              {...register("serviceFeeRate")}
              inputMode="decimal"
              placeholder="VD: 5"
            />
          </FormField>
        </div>
      ) : null}

      {canCopy ? (
        <div className="space-y-3 rounded-xl border border-border-default bg-surface-muted/40 p-4">
          <Controller
            control={control}
            name="copyEnabled"
            render={({ field }) => (
              <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-text-primary">
                <Checkbox
                  checked={field.value}
                  onCheckedChange={(checked) => {
                    field.onChange(checked === true)
                    if (checked === true && copyFeeRates) {
                      setValue("vatRate", "")
                      setValue("serviceFeeRate", "")
                    }
                  }}
                />
                Sao chép từ chi nhánh có sẵn
              </label>
            )}
          />

          {copyEnabled ? (
            <div className="space-y-3">
              <FormField label="Chi nhánh nguồn" required error={errors.sourceBranchId?.message}>
                <Controller
                  control={control}
                  name="sourceBranchId"
                  render={({ field }) => (
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Chọn chi nhánh nguồn" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((b) => (
                          <SelectItem key={b.id} value={String(b.id)}>
                            {b.name} ({b.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </FormField>

              <div className="space-y-2">
                <CopyCheckbox
                  control={control}
                  name="copyOpeningHours"
                  label="Giờ mở/đóng cửa và thời gian chờ"
                  hint="Giờ mở cửa, giờ đóng cửa, giờ bắt đầu ngày kinh doanh, hạn chờ xác nhận mở bàn, thời gian giữ bàn."
                />
                <CopyCheckbox
                  control={control}
                  name="copyFeeRates"
                  label="Thuế VAT, phí dịch vụ và ngưỡng duyệt chiết khấu"
                  onChange={(checked) => {
                    if (checked) {
                      setValue("vatRate", "")
                      setValue("serviceFeeRate", "")
                    }
                  }}
                />
                <CopyCheckbox control={control} name="copyBankInfo" label="Thông tin ngân hàng" />
                {errors.copyOpeningHours?.message ? (
                  <p className="text-xs text-status-danger">{errors.copyOpeningHours.message}</p>
                ) : null}
              </div>

              <p className="text-xs text-text-tertiary">
                Không sao chép giá riêng của món (bản đè giá). Khu vực và bàn cần khai báo riêng cho
                chi nhánh mới.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <DialogFooter className="pt-3">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={busy}
          className="cursor-pointer"
        >
          Hủy
        </Button>
        <Button type="submit" disabled={busy} className="cursor-pointer">
          {busy ? "Đang lưu..." : isEdit ? "Cập nhật" : "Thêm chi nhánh"}
        </Button>
      </DialogFooter>
    </form>
  )
}

interface CopyCheckboxProps {
  control: Control<BranchFormValues>
  name: "copyOpeningHours" | "copyFeeRates" | "copyBankInfo"
  label: string
  hint?: string
  onChange?: (checked: boolean) => void
}

const CopyCheckbox: React.FC<CopyCheckboxProps> = ({ control, name, label, hint, onChange }) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <label className="flex cursor-pointer items-start gap-2 text-sm text-text-primary">
        <Checkbox
          className="mt-0.5"
          checked={field.value}
          onCheckedChange={(checked) => {
            field.onChange(checked === true)
            onChange?.(checked === true)
          }}
        />
        <span>
          {label}
          {hint ? <span className="block text-xs text-text-tertiary">{hint}</span> : null}
        </span>
      </label>
    )}
  />
)

/** Modal tạo mới / chỉnh sửa chi nhánh — `POST /branches` và `PUT /branches/{id}`. */
export const BranchModal: React.FC<BranchModalProps> = ({
  isOpen,
  onClose,
  initialData,
  ...rest
}) => {
  const isEdit = Boolean(initialData)

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !rest.isSaving && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Chỉnh sửa chi nhánh" : "Thêm chi nhánh mới"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Cập nhật tên, địa chỉ và số điện thoại. Thuế/phí và cấu hình khác chỉnh ở trang cấu hình chi nhánh."
              : "Điền thông tin để thiết lập một chi nhánh mới trong nhà hàng."}
          </DialogDescription>
        </DialogHeader>

        {isOpen ? (
          <BranchFormContent
            key={initialData ? `edit-${initialData.id}` : "add-new"}
            initialData={initialData}
            onClose={onClose}
            {...rest}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

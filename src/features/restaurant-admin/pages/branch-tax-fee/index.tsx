import * as React from "react"
import { useParams, useNavigate } from "react-router-dom"
import { AlertTriangle, ChevronLeft } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { StickyActionBar } from "@/components/layout/StickyActionBar"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/http"
import { useBranch, useUpdateBranchAdminConfig } from "@/api/branches.api"
import { useGoBack } from "@/hooks/use-go-back"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"

/** Chuỗi số nhập tay → number; rỗng hoặc không hợp lệ → undefined (không gửi field đó). */
function toNumberOrUndefined(value: string): number | undefined {
  const trimmed = value.trim()
  if (!trimmed) return undefined
  const n = Number(trimmed.replace(",", "."))
  return Number.isFinite(n) ? n : undefined
}

/**
 * Cấu hình chi nhánh — **Thuế & phí** (FR-BRN-02 nhóm 2).
 *
 * Bốn trường CHỈ Quản trị nhà hàng sửa được: thuế suất VAT, tỷ lệ phí dịch vụ, ngưỡng chiết
 * khấu cần duyệt (BR-10), mã số thuế riêng của chi nhánh (BR-20). Nhóm 1 (giờ giấc, tài khoản
 * ngân hàng, thời gian tự huỷ phiên) nằm ở trang "Cấu hình chi nhánh" mà QL chi nhánh cũng vào
 * được — cố ý tách hai trang để không cần khoá từng ô theo vai trò.
 *
 * BR-08: đổi VAT / phí dịch vụ khi chi nhánh còn phiên ĐANG PHỤC VỤ hoặc CHỜ THANH TOÁN thì
 * backend trả kèm số phiên bị ảnh hưởng — các phiên đó vẫn dùng bộ số đã sao cứng lúc mở bàn.
 */
export default function BranchTaxFeePage() {
  const { branchId: branchIdParam } = useParams<{ branchId: string }>()
  const branchId = branchIdParam ? Number.parseInt(branchIdParam, 10) : undefined
  const navigate = useNavigate()
  const { toast } = useToast()
  const goBack = useGoBack(RESTAURANT_ADMIN_PATHS.BRANCH)

  const { data: branch, isLoading } = useBranch(branchId)
  const updateConfig = useUpdateBranchAdminConfig()

  const [vatRate, setVatRate] = React.useState("")
  const [serviceFeeRate, setServiceFeeRate] = React.useState("")
  const [vatOnServiceFee, setVatOnServiceFee] = React.useState(true)
  const [threshold, setThreshold] = React.useState("")
  const [taxCode, setTaxCode] = React.useState("")
  const [warning, setWarning] = React.useState<number | null>(null)

  // Đổ dữ liệu thật vào form khi tải xong / khi đổi chi nhánh.
  React.useEffect(() => {
    if (!branch) return
    setVatRate(branch.vatRate != null ? String(branch.vatRate) : "")
    setServiceFeeRate(branch.serviceFeeRate != null ? String(branch.serviceFeeRate) : "")
    // `null` hiểu là BẬT, đúng cách backend tính VAT (QĐ-17).
    setVatOnServiceFee(branch.vatAppliedOnServiceFee !== false)
    setThreshold(
      branch.discountApprovalThreshold != null ? String(branch.discountApprovalThreshold) : "",
    )
    setTaxCode(branch.taxCode ?? "")
  }, [branch])

  const branchName = branch?.name ?? `Chi nhánh #${branchId ?? "—"}`
  const vatChanged =
    branch != null && toNumberOrUndefined(vatRate) !== (branch.vatRate ?? undefined)
  const feeChanged =
    branch != null && toNumberOrUndefined(serviceFeeRate) !== (branch.serviceFeeRate ?? undefined)

  async function handleSave() {
    if (!branchId) return
    setWarning(null)
    try {
      const updated = await updateConfig.mutateAsync({
        id: branchId,
        body: {
          vatRate: toNumberOrUndefined(vatRate),
          serviceFeeRate: toNumberOrUndefined(serviceFeeRate),
          vatAppliedOnServiceFee: vatOnServiceFee,
          discountApprovalThreshold: toNumberOrUndefined(threshold),
          taxCode: taxCode.trim(),
        },
      })
      // BR-08: backend đếm phiên đang mở tại thời điểm lưu và trả về kèm response.
      if (updated?.hasOpenSessionWarning && updated.openSessionCount) {
        setWarning(updated.openSessionCount)
      }
      toast({
        title: "Đã lưu thuế & phí",
        description: `${branchName} · áp cho phiên mở từ sau thời điểm này.`,
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Không lưu được cấu hình",
        description: getErrorMessage(error),
        variant: "danger",
      })
    }
  }

  const saving = updateConfig.isPending

  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      <PageHeader
        title="Thuế & phí chi nhánh"
        subtitle={`${branchName} · chỉ Quản trị nhà hàng sửa được`}
        mobileSubtitle={branchName}
        actions={
          <button
            type="button"
            onClick={goBack}
            className="inline-flex cursor-pointer items-center gap-1 text-sm font-medium text-text-tertiary transition-colors hover:text-text-primary"
          >
            <ChevronLeft className="size-4" /> Quay lại
          </button>
        }
      />

      <div className="flex flex-col gap-6 p-6 lg:p-8">
        {isLoading ? (
          <p className="text-sm text-text-tertiary">Đang tải cấu hình chi nhánh...</p>
        ) : (
          <>
            {/* BR-08: cảnh báo sau khi lưu, nêu rõ số phiên vẫn dùng bộ số cũ */}
            {warning ? (
              <div className="flex items-start gap-2.5 rounded-card border border-[#FEDF89] bg-[#FFFCF5] px-4 py-3">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#B54708]" />
                <p className="text-sm text-[#B54708]">
                  Chi nhánh đang có <strong>{warning} phiên mở</strong>. Các phiên đó vẫn tính tiền
                  theo VAT / phí dịch vụ đã sao cứng lúc mở bàn; số mới chỉ áp cho phiên mở từ bây
                  giờ.
                </p>
              </div>
            ) : null}

            <div className="space-y-5 rounded-card border border-border-default bg-surface-card p-6 shadow-2xs">
              <div>
                <h2 className="text-base font-bold tracking-tight text-text-primary">Thuế & phí</h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  Sao cứng vào phiên tại thời điểm mở bàn — đổi ở đây không sửa hoá đơn cũ
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="VAT (%)" htmlFor="branch-vat">
                  <Input
                    id="branch-vat"
                    inputMode="decimal"
                    value={vatRate}
                    disabled={saving}
                    onChange={(e) => setVatRate(e.target.value)}
                    placeholder="8"
                  />
                </FormField>

                <FormField label="Phí dịch vụ (%)" htmlFor="branch-service-fee">
                  <Input
                    id="branch-service-fee"
                    inputMode="decimal"
                    value={serviceFeeRate}
                    disabled={saving}
                    onChange={(e) => setServiceFeeRate(e.target.value)}
                    placeholder="5"
                  />
                </FormField>
              </div>

              {vatChanged || feeChanged ? (
                <p className="flex items-start gap-1.5 text-xs text-status-warning">
                  <AlertTriangle className="mt-px size-3.5 shrink-0" />
                  <span>
                    Đang đổi VAT / phí dịch vụ. Phiên bàn đang mở giữ nguyên bộ số cũ cho tới khi
                    đóng.
                  </span>
                </p>
              ) : null}

              {/* QĐ-17 (câu #7): phí dịch vụ CHỊU VAT là mặc định — TT 219/2013 Điều 7 */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-border-default px-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-text-primary">Phí dịch vụ chịu VAT</p>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    Bật: VAT tính trên (tiền hàng sau chiết khấu + phí dịch vụ). Tắt: VAT chỉ tính
                    trên tiền hàng sau chiết khấu.
                  </p>
                </div>
                <Switch
                  checked={vatOnServiceFee}
                  disabled={saving}
                  onCheckedChange={setVatOnServiceFee}
                  aria-label="Phí dịch vụ chịu VAT"
                />
              </div>

              <FormField label="Ngưỡng chiết khấu cần duyệt (đ)" htmlFor="branch-threshold">
                <Input
                  id="branch-threshold"
                  inputMode="numeric"
                  value={threshold}
                  disabled={saving}
                  onChange={(e) => setThreshold(e.target.value)}
                  placeholder="30000"
                />
                <p className="mt-1.5 text-xs text-text-tertiary">
                  Chiết khấu tay vượt ngưỡng này bắt buộc Quản lý chi nhánh duyệt.
                </p>
              </FormField>

              <FormField label="Mã số thuế riêng của chi nhánh" htmlFor="branch-tax-code">
                <Input
                  id="branch-tax-code"
                  value={taxCode}
                  disabled={saving}
                  onChange={(e) => setTaxCode(e.target.value)}
                  placeholder="Để trống = dùng mã số thuế của nhà hàng"
                />
                <p className="mt-1.5 text-xs text-text-tertiary">
                  Nếu chi nhánh có mã số thuế riêng, hóa đơn sẽ dùng mã đó. Để trống thì dùng mã của
                  nhà hàng.
                </p>
              </FormField>

              <div className="hidden justify-end md:flex">
                <Button
                  type="button"
                  className="h-11 px-6 font-semibold"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Đang lưu..." : "Lưu thuế & phí"}
                </Button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => navigate(`${RESTAURANT_ADMIN_PATHS.BRANCH}/${branchId}/cau-hinh`)}
              className="text-left text-xs text-text-tertiary underline-offset-2 hover:underline"
            >
              Giờ giấc, tài khoản ngân hàng, thời gian tự huỷ phiên → Cấu hình chi nhánh (nhóm 1)
            </button>
          </>
        )}
      </div>

      {/* <md: nút Lưu xuống thanh đáy để luôn bấm tới được */}
      <StickyActionBar>
        <Button
          type="button"
          className="h-11 w-full font-semibold"
          onClick={handleSave}
          disabled={saving || isLoading}
        >
          {saving ? "Đang lưu..." : "Lưu thuế & phí"}
        </Button>
      </StickyActionBar>
    </div>
  )
}

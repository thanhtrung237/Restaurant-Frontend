import { useMemo, useState } from "react"
import { Download } from "lucide-react"
import { HeaderOverflowMenu, type OverflowMenuAction } from "@/components/layout/HeaderOverflowMenu"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE } from "@/config/roles"
import {
  useAccountsByRestaurant,
  useAuditLogs,
  useAuditLogsByPerformedBy,
} from "@/features/restaurant-admin/api"
import { AuditLogFilterBar } from "./components/AuditLogFilterBar"
import { AuditLogPager } from "./components/AuditLogPager"
import { AuditLogTable } from "./components/AuditLogTable"
import { StaffNavigationTabs } from "../staff-management/components/StaffTabs"
import { buildRoleLookup, dateRangeParams, filterAuditLogs, toAuditLogRow } from "./lib"
import { usePerformerOptions } from "./use-performer-options"
import type { AuditLog } from "@/types/models"
import type { AuditActionFilter, AuditDateRangeId, AuditPerformerFilter } from "./types"

/** Tham chiếu ổn định để các `useMemo` phía dưới không chạy lại mỗi lần render. */
const EMPTY_LOGS: AuditLog[] = []

/** Số dòng mỗi trang — dùng chung cho phân trang của BE và cho nguồn "theo người". */
const PAGE_SIZE = 20

/** BE chưa có endpoint xuất .xlsx (FR-LOG-01) — nút hiện nhưng khoá, kèm lý do. */
const EXPORT_TOOLTIP = "Chưa hỗ trợ"

/**
 * Nhật ký hoạt động — Màn hình thuộc Quản trị nhà hàng (restaurant-admin)
 * Nguồn: Desktop / Nhật ký hoạt động.png
 *
 * Dữ liệu thật:
 * - Mặc định: `GET /audit-logs?restaurantId=&startDate=&endDate=` — khoảng thời gian lọc ở BE.
 * - Khi chọn một nhân viên: `GET /audit-logs/performed-by/{accountId}` (trả đủ, không phân
 *   trang) rồi lọc thời gian phía client. Lọc người thực hiện ngay trên trang đang xem sẽ bỏ
 *   sót bản ghi ở trang sau.
 * - Loại thao tác lọc phía client: `GET /audit-logs` chưa có tham số `actionType`.
 */
export default function AuditLogPage() {
  const restaurantId = useAuthStore((s) => s.account?.restaurantId)

  const [selectedAction, setSelectedAction] = useState<AuditActionFilter>("ALL")
  const [selectedPerformer, setSelectedPerformer] = useState<AuditPerformerFilter>("ALL")
  const [selectedDateRange, setSelectedDateRange] = useState<AuditDateRangeId>("LAST_7_DAYS")
  const [pageIndex, setPageIndex] = useState(0)

  /**
   * Đổi bộ lọc thì về trang 1. Không có bước này, đang đứng ở trang 7 mà lọc lại sẽ ra danh
   * sách rỗng — người dùng tưởng không có dữ liệu. Ngược lại, đổi TRANG thì giữ nguyên bộ lọc.
   */
  function changeFilter<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value)
      setPageIndex(0)
    }
  }

  /**
   * `GET /accounts/restaurant/{id}` la `hasRole('MANAGER')`: chi Quan tri nha hang goi duoc.
   * Quan ly chi nhanh cung mo man nay (route /branch-manager/audit-log), goi se an 403 —
   * dung Bang 4.3 nhung khong duoc de no thanh loi tren man hinh, nen khong goi.
   */
  const role = useAuthStore((s) => s.role)
  const canReadAccounts = role === APP_ROLE.RESTAURANT_ADMIN
  const accountsQuery = useAccountsByRestaurant(canReadAccounts ? restaurantId : undefined)

  const listQuery = useAuditLogs({
    restaurantId,
    // be-issues 22: lọc loại thao tác ở BACKEND — trước đây lọc trong trang đang xem nên
    // chọn một loại hiếm có thể ra 0 dòng dù trang sau có.
    actionType: selectedAction === "ALL" ? undefined : selectedAction,
    ...dateRangeParams(selectedDateRange),
    page: pageIndex,
    size: PAGE_SIZE,
  })
  const performerQuery = useAuditLogsByPerformedBy(
    selectedPerformer === "ALL" ? undefined : selectedPerformer,
  )

  const byPerformer = selectedPerformer !== "ALL"
  // Memo hoá: `?? []` tạo mảng mới mỗi lần render, làm useMemo phía dưới mất tác dụng.
  const sourceLogs = useMemo(
    () =>
      byPerformer ? (performerQuery.data ?? EMPTY_LOGS) : (listQuery.data?.content ?? EMPTY_LOGS),
    [byPerformer, performerQuery.data, listQuery.data],
  )
  const isLoading = byPerformer ? performerQuery.isLoading : listQuery.isLoading

  const roleOf = useMemo(() => buildRoleLookup(accountsQuery.data ?? []), [accountsQuery.data])

  /**
   * Nguồn mặc định đã được BE lọc đủ (loại thao tác + khoảng thời gian) nên không lọc lại.
   * Riêng nguồn "theo người thực hiện" dùng `/audit-logs/performed-by/{id}` — endpoint đó
   * không có tham số nào, nên lọc tại client trên TOÀN BỘ danh sách (không phải từng trang).
   */
  const filteredLogs = useMemo(
    () =>
      byPerformer
        ? filterAuditLogs(sourceLogs, { action: selectedAction, range: selectedDateRange })
        : sourceLogs,
    [sourceLogs, selectedAction, byPerformer, selectedDateRange],
  )

  /**
   * Hai nguồn, hai kiểu phân trang:
   * - Mặc định: BE phân trang sẵn (`page` / `size`), `filteredLogs` chỉ lọc thêm loại thao tác
   *   TRONG trang đang xem — `GET /audit-logs` chưa có tham số `actionType` (be-issues mục 22).
   * - Theo người: `/audit-logs/performed-by/{id}` trả đủ, không phân trang, nên cắt tại client.
   */
  const rows = useMemo(() => {
    const visible = byPerformer
      ? filteredLogs.slice(pageIndex * PAGE_SIZE, (pageIndex + 1) * PAGE_SIZE)
      : filteredLogs
    return visible.map((log) => toAuditLogRow(log, roleOf))
  }, [filteredLogs, byPerformer, pageIndex, roleOf])

  /**
   * Lấy tên từ danh sách KHÔNG lọc theo người (`listQuery`), không phải từ `sourceLogs`:
   * khi đang chọn một nhân viên thì `sourceLogs` chỉ còn bản ghi của người đó, dropdown sẽ
   * co lại đúng một mục và không đổi sang người khác được nữa.
   */
  const performerOptions = usePerformerOptions(
    accountsQuery.data,
    listQuery.data?.content ?? EMPTY_LOGS,
  )

  const totalElements = byPerformer ? filteredLogs.length : (listQuery.data?.totalElements ?? 0)
  const totalPages = byPerformer
    ? Math.max(1, Math.ceil(filteredLogs.length / PAGE_SIZE))
    : (listQuery.data?.totalPages ?? 1)

  // <md: nút "Xuất log" chuyển vào menu "⋯" trên MobileHeader. KHÔNG bỏ hẳn vì
  // FR-LOG-01 yêu cầu xuất được .xlsx — giữ chỗ ở trạng thái khoá.
  const headerActions = useMemo<OverflowMenuAction[]>(
    () => [
      {
        key: "export",
        label: `Xuất log (.xlsx) — ${EXPORT_TOOLTIP}`,
        icon: Download,
        disabled: true,
        onSelect: () => undefined,
      },
    ],
    [],
  )
  const headerOverflow = useMemo(
    () => <HeaderOverflowMenu actions={headerActions} />,
    [headerActions],
  )

  const subtitle = isLoading
    ? "Đang tải nhật ký…"
    : `${totalElements} bản ghi · ghi vết giá trị trước, sau, người duyệt`

  return (
    <div className="flex min-h-full flex-col bg-surface-ground">
      <PageHeader
        title="Nhật ký hoạt động"
        subtitle={subtitle}
        mobileSubtitle={`${totalElements} bản ghi`}
        mobileHeaderActions={headerOverflow}
        actions={
          // `title` ở thẻ bọc: nút disabled không tự hiện tooltip.
          <span title={EXPORT_TOOLTIP} className="inline-flex">
            <Button
              type="button"
              variant="outline"
              disabled
              aria-label={`Xuất log — ${EXPORT_TOOLTIP}`}
              className="h-10 gap-2 border-border-default px-4 text-text-primary hover:bg-surface-muted"
            >
              <Download className="size-4 text-text-secondary" />
              <span>Xuất log</span>
            </Button>
          </span>
        }
        tabs={<StaffNavigationTabs activeTab="audit-log" />}
      />

      <div className="flex flex-col gap-6 p-6 lg:p-8">
        {/* <md: PageHeader ẩn nên tab phải hiện lại ở đây */}
        <div className="md:hidden">
          <StaffNavigationTabs activeTab="audit-log" />
        </div>

        <AuditLogFilterBar
          selectedAction={selectedAction}
          onActionChange={changeFilter(setSelectedAction)}
          performerOptions={performerOptions}
          selectedPerformer={selectedPerformer}
          onPerformerChange={changeFilter(setSelectedPerformer)}
          selectedDateRange={selectedDateRange}
          onDateRangeChange={changeFilter(setSelectedDateRange)}
        />

        <AuditLogTable logs={rows} isLoading={isLoading} />

        <AuditLogPager
          pageIndex={pageIndex}
          pageSize={PAGE_SIZE}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={setPageIndex}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}

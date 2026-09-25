import { useNavigate } from "react-router-dom"
import { Info } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { PermissionLegend } from "./components/PermissionLegend"
import { PermissionMatrixTable } from "./components/PermissionMatrixTable"
import { PermissionMatrixList } from "./components/PermissionMatrixList"
import { StaffTabs } from "../staff-management/components/StaffTabs"
import { PERMISSION_MATRIX_SECTIONS, SPEC_ROLE_COUNT } from "./permission-matrix"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import type { StaffTabType } from "../staff-management/types"

/**
 * Vai trò & phân quyền — Màn hình thuộc Quản trị nhà hàng (restaurant-admin)
 * Nguồn: Desktop / Vai trò & phân quyền.png
 *
 * **CHỈ ĐỌC.** Ma trận dựng từ đặc tả Bảng 4.2 + 4.3 (`permission-matrix.ts`), không từ API:
 * backend không có bảng quyền — `Role` chỉ có `name` / `code` / `scope`, và chốt chặn quyền
 * là tên vai trò hard-code trong `@PreAuthorize` (xem `docs/reports/nhan-vien-buoc-0.md`
 * mục 5). Vì vậy không có nút "Tạo vai trò" và không có nút sửa quyền: chưa có gì để lưu.
 */
export default function RolesPermissionsPage() {
  const navigate = useNavigate()

  const handleTabChange = (tab: StaffTabType) => {
    if (tab === "staff") {
      navigate(RESTAURANT_ADMIN_PATHS.STAFF_MANAGEMENT)
    } else if (tab === "roles") {
      navigate(RESTAURANT_ADMIN_PATHS.ROLES_PERMISSIONS)
    } else if (tab === "audit-log") {
      navigate(RESTAURANT_ADMIN_PATHS.AUDIT_LOG)
    }
  }

  const rowCount = PERMISSION_MATRIX_SECTIONS.reduce((sum, s) => sum + s.rows.length, 0)

  return (
    <div className="flex min-h-full flex-col bg-surface-ground">
      <PageHeader
        title="Vai trò & phân quyền"
        subtitle={`${SPEC_ROLE_COUNT} vai trò cố định · ${rowCount} chức năng theo đặc tả · chỉ xem`}
        mobileSubtitle={`${SPEC_ROLE_COUNT} vai trò cố định · chỉ xem`}
        tabs={<StaffTabs activeTab="roles" onTabChange={handleTabChange} />}
      />

      <div className="flex flex-col gap-6 p-6 lg:p-8">
        {/* <md: PageHeader ẩn nên tab phải hiện lại ở đây */}
        <div className="md:hidden">
          <StaffTabs activeTab="roles" onTabChange={handleTabChange} />
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-[#B2DDFF] bg-[#EFF8FF] px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-[#175CD3]" />
          <p className="text-sm text-[#175CD3]">
            Quyền được cố định theo hệ thống, chưa tuỳ chỉnh được. Bảng dưới đây lấy từ đặc tả
            (mục 4.2 và 4.3) và chỉ để tra cứu.
          </p>
        </div>

        <PermissionLegend />

        {PERMISSION_MATRIX_SECTIONS.map((section) => (
          <div key={section.id}>
            <div className="hidden md:block">
              <PermissionMatrixTable section={section} />
            </div>
            <div className="md:hidden">
              <PermissionMatrixList section={section} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

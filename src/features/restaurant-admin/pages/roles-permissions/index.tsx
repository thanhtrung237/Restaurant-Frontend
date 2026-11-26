import { Info } from "lucide-react"
import { PageHeader } from "@/components/layout/PageHeader"
import { PermissionLegend } from "./components/PermissionLegend"
import { PermissionMatrixTable } from "./components/PermissionMatrixTable"
import { PermissionMatrixList } from "./components/PermissionMatrixList"
import { StaffNavigationTabs } from "../staff-management/components/StaffTabs"
import { PERMISSION_MATRIX_SECTIONS, SPEC_ROLE_COUNT } from "./permission-matrix"

export default function RolesPermissionsPage() {
  const rowCount = PERMISSION_MATRIX_SECTIONS.reduce((sum, s) => sum + s.rows.length, 0)

  return (
    <div className="flex min-h-full flex-col bg-surface-ground">
      <PageHeader
        title="Vai trò & phân quyền"
        subtitle={`${SPEC_ROLE_COUNT} vai trò cố định · ${rowCount} chức năng · chỉ xem`}
        mobileSubtitle={`${SPEC_ROLE_COUNT} vai trò cố định · chỉ xem`}
        tabs={<StaffNavigationTabs activeTab="roles" />}
      />

      <div className="flex flex-col gap-6 p-6 max-md:min-w-0 max-md:p-4 lg:p-8">
        {/* <md: PageHeader ẩn nên tab phải hiện lại ở đây */}
        <div className="md:hidden">
          <StaffNavigationTabs activeTab="roles" />
        </div>

        <div className="flex items-start gap-2.5 rounded-xl border border-[#B2DDFF] bg-[#EFF8FF] px-4 py-3">
          <Info className="mt-0.5 size-4 shrink-0 text-[#175CD3]" />
          <p className="text-sm text-[#175CD3]">Tra cứu quyền mặc định của từng vai trò.</p>
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

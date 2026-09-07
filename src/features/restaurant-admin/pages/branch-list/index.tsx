import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import { BranchHeader } from "./components/BranchHeader"
import { BranchCard } from "./components/BranchCard"
import { BranchModal } from "./components/BranchModal"
import { DeleteBranchDialog } from "./components/DeleteBranchDialog"
import { MOCK_BRANCHES } from "./mock-data"
import type { BranchItem, BranchFormData } from "./types"

/**
 * Quản lý chi nhánh — Màn hình thuộc Quản trị nhà hàng (restaurant-admin)
 * Nguồn giao diện: QuanLy/Quản lý chi nhánh.png
 *
 * Bám sát cấu trúc phân rã component, dữ liệu mock, token giao diện
 * từ staff-management và hệ thống Design System.
 */
export default function BranchListPage() {
  const navigate = useNavigate()

  // State danh sách các chi nhánh
  const [branches, setBranches] = useState<BranchItem[]>(MOCK_BRANCHES)

  // State điều khiển modal thêm / sửa chi nhánh
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedBranch, setSelectedBranch] = useState<BranchItem | null>(null)

  // State điều khiển hộp thoại xác nhận xóa chi nhánh
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [deletingBranch, setDeletingBranch] = useState<BranchItem | null>(null)

  // Mở modal thêm mới chi nhánh
  const handleOpenAddModal = () => {
    setSelectedBranch(null)
    setIsModalOpen(true)
  }

  // Mở modal chỉnh sửa chi nhánh
  const handleOpenEditModal = (branch: BranchItem) => {
    setSelectedBranch(branch)
    setIsModalOpen(true)
  }

  // Mở dialog xác nhận xóa chi nhánh
  const handleOpenDeleteDialog = (branch: BranchItem) => {
    setDeletingBranch(branch)
    setIsDeleteDialogOpen(true)
  }

  // Xử lý lưu chi nhánh (thêm mới hoặc cập nhật)
  const handleSaveBranch = (formData: BranchFormData) => {
    if (selectedBranch) {
      // Cập nhật chi nhánh đã có
      setBranches((prev) =>
        prev.map((b) => (b.id === selectedBranch.id ? { ...b, ...formData } : b))
      )
    } else {
      // Thêm chi nhánh mới với ID tự sinh
      const newId = branches.length > 0 ? Math.max(...branches.map((b) => b.id)) + 1 : 1
      const newBranch: BranchItem = {
        id: newId,
        ...formData,
      }
      setBranches((prev) => [...prev, newBranch])
    }
  }

  // Xác nhận xóa chi nhánh
  const handleConfirmDelete = () => {
    if (deletingBranch) {
      setBranches((prev) => prev.filter((b) => b.id !== deletingBranch.id))
      setDeletingBranch(null)
      setIsDeleteDialogOpen(false)
    }
  }

  // Điều hướng sang trang chi tiết chi nhánh (3 tab: Thông tin / Menu chi nhánh / Bàn & QR)
  const handleViewBranch = (branchId: number) => {
    navigate(`${RESTAURANT_ADMIN_PATHS.BRANCH}/${branchId}`, {
      state: { branchId },
    })
  }

  return (
    <div className="flex flex-col min-h-full bg-surface-page p-6 lg:p-8 space-y-6">
      {/* 1. Header trang: Tiêu đề, số lượng chi nhánh và nút + Thêm chi nhánh */}
      <BranchHeader
        totalBranches={branches.length}
        onAddBranch={handleOpenAddModal}
      />

      {/* 2. Danh sách chi nhánh dạng Grid các Card */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {branches.map((branch) => (
          <BranchCard
            key={branch.id}
            branch={branch}
            onView={handleViewBranch}
            onEdit={handleOpenEditModal}
            onDelete={handleOpenDeleteDialog}
          />
        ))}
      </div>

      {/* 3. Modal Thêm / Chỉnh sửa chi nhánh */}
      <BranchModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedBranch(null)
        }}
        onSave={handleSaveBranch}
        initialData={selectedBranch}
      />

      {/* 4. Dialog xác nhận xóa chi nhánh */}
      <DeleteBranchDialog
        isOpen={isDeleteDialogOpen}
        branch={deletingBranch}
        onClose={() => {
          setIsDeleteDialogOpen(false)
          setDeletingBranch(null)
        }}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}

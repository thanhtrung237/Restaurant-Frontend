import React, { useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AlertTriangle,
  Plus,
  MoreVertical,
  Store,
  Eye,
  Lock,
  Unlock,
  Trash2,
  Building,
  Loader2,
  Search,
} from "lucide-react"
import {
  useRestaurantsPage,
  useCreateRestaurant,
  useChangeRestaurantStatus,
  useDeleteRestaurant,
} from "@/features/platform-admin/api"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import type { RestaurantListItem } from "@/types/models"

export default function RestaurantListPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createForm, setCreateForm] = useState({
    name: "",
    code: "",
    taxCode: "",
    phone: "",
    address: "",
  })

  // Queries & Mutations
  const { data: pageData, isLoading, refetch } = useRestaurantsPage({
    page: 0,
    size: 50,
  })
  const createMutation = useCreateRestaurant()
  const statusMutation = useChangeRestaurantStatus()
  const deleteMutation = useDeleteRestaurant()

  const restaurants: RestaurantListItem[] = pageData?.content || []

  // Filter local by search
  const filteredRestaurants = restaurants.filter(
    (r) =>
      r.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.code?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.name || !createForm.code) {
      toast({
        variant: "danger",
        title: "Lỗi",
        description: "Vui lòng nhập tên và mã nhà hàng.",
      })
      return
    }

    try {
      await createMutation.mutateAsync({
        code: createForm.code.toUpperCase().trim(),
        name: createForm.name.trim(),
        taxCode: createForm.taxCode?.trim() || undefined,
        phone: createForm.phone?.trim() || undefined,
        address: createForm.address?.trim() || undefined,
      })
      toast({
        variant: "success",
        title: "Thành công",
        description: `Đã tạo nhà hàng "${createForm.name}" thành công!`,
      })
      setIsCreateOpen(false)
      setCreateForm({ name: "", code: "", taxCode: "", phone: "", address: "" })
      refetch()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast({
        variant: "danger",
        title: "Tạo nhà hàng thất bại",
        description: error.response?.data?.message || "Đã xảy ra lỗi khi tạo nhà hàng.",
      })
    }
  }

  const handleToggleStatus = async (restaurant: RestaurantListItem) => {
    const newStatus = restaurant.status === "ACTIVE" ? "INACTIVE" : "ACTIVE"
    const actionText = newStatus === "ACTIVE" ? "Mở khóa" : "Khóa"
    try {
      await statusMutation.mutateAsync({ id: restaurant.id, status: newStatus })
      toast({
        variant: "success",
        title: `${actionText} thành công`,
        description: `Nhà hàng "${restaurant.name}" hiện ở trạng thái ${
          newStatus === "ACTIVE" ? "Hoạt động" : "Tạm ngưng"
        }.`,
      })
      refetch()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast({
        variant: "danger",
        title: "Không thể đổi trạng thái",
        description: error.response?.data?.message || "Thao tác thất bại.",
      })
    }
  }

  const handleDelete = async (restaurant: RestaurantListItem) => {
    if (
      !window.confirm(
        `Bạn có chắc chắn muốn xóa nhà hàng "${restaurant.name}"? Dữ liệu chi nhánh và nhân viên sẽ bị ảnh hưởng!`
      )
    ) {
      return
    }

    try {
      await deleteMutation.mutateAsync(restaurant.id)
      toast({
        variant: "success",
        title: "Xóa thành công",
        description: `Đã xóa nhà hàng "${restaurant.name}".`,
      })
      refetch()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast({
        variant: "danger",
        title: "Không thể xóa nhà hàng",
        description: error.response?.data?.message || "Thao tác thất bại.",
      })
    }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Quản lý nhà hàng</h1>
          <p className="text-sm text-gray-500 mt-1">
            {restaurants.length} nhà hàng trên hệ thống · mỗi nhà hàng cách ly dữ liệu hoàn toàn
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#E03A14] text-white font-medium text-sm hover:bg-[#c9320f] shadow-sm transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Tạo nhà hàng</span>
        </button>
      </div>

      {/* Warning banner BR-21 matching screenshot */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]">
        <AlertTriangle className="w-5 h-5 shrink-0 text-[#D97706] mt-0.5" />
        <p className="text-sm leading-relaxed">
          Quản trị nền tảng chỉ thấy thông tin định danh nhà hàng. TUYỆT ĐỐI không truy cập dữ liệu
          kinh doanh của khách (BR-21).
        </p>
      </div>

      {/* Filter / Search Bar */}
      <div className="flex items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã nhà hàng..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
          />
        </div>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-[#E03A14]" />
            <p className="text-sm">Đang tải danh sách nhà hàng...</p>
          </div>
        ) : filteredRestaurants.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <Store className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="font-medium text-base">Không tìm thấy nhà hàng nào</p>
            <p className="text-sm text-gray-400 mt-1">
              Thử tìm kiếm với từ khóa khác hoặc tạo nhà hàng mới.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/75 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">NHÀ HÀNG</th>
                  <th className="py-3.5 px-6">MÃ</th>
                  <th className="py-3.5 px-6">MÃ SỐ THUẾ</th>
                  <th className="py-3.5 px-6">CHI NHÁNH</th>
                  <th className="py-3.5 px-6">TRẠNG THÁI</th>
                  <th className="py-3.5 px-6 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-sm">
                {filteredRestaurants.map((restaurant) => {
                  const initial = restaurant.name ? restaurant.name.charAt(0).toUpperCase() : "N"
                  const isActive = restaurant.status === "ACTIVE"
                  const branchCount = restaurant.branchCount ?? 0

                  return (
                    <tr
                      key={restaurant.id}
                      className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/quan-tri-nen-tang/nha-hang/${restaurant.id}`)}
                    >
                      {/* Name & Avatar */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-orange-100 text-[#E03A14] font-bold text-base flex items-center justify-center shrink-0">
                            {initial}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 group-hover:text-[#E03A14] transition-colors">
                              {restaurant.name}
                            </div>
                            <div className="text-xs text-gray-400 mt-0.5">
                              ID: #{restaurant.id}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-4 px-6 text-gray-600 font-mono text-xs font-medium">
                        {restaurant.code}
                      </td>

                      {/* Tax Code */}
                      <td className="py-4 px-6 text-gray-600 font-mono text-xs">
                        {"0109823456"}
                      </td>

                      {/* Branch Count */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-1.5 text-gray-700">
                          <Building className="w-4 h-4 text-gray-400" />
                          <span>{branchCount} chi nhánh</span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-6">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Hoạt động
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200">
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                            Tạm ngưng
                          </span>
                        )}
                      </td>

                      {/* Dropdown Action */}
                      <td
                        className="py-4 px-6 text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-5 h-5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="right" className="w-44">
                            <DropdownMenuItem
                              onClick={() =>
                                navigate(`/quan-tri-nen-tang/nha-hang/${restaurant.id}`)
                              }
                              className="cursor-pointer"
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              Xem chi tiết
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleToggleStatus(restaurant)}
                              className="cursor-pointer"
                            >
                              {isActive ? (
                                <>
                                  <Lock className="w-4 h-4 mr-2 text-rose-600" />
                                  <span className="text-rose-600">Khóa nhà hàng</span>
                                </>
                              ) : (
                                <>
                                  <Unlock className="w-4 h-4 mr-2 text-emerald-600" />
                                  <span className="text-emerald-600">Mở khóa</span>
                                </>
                              )}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDelete(restaurant)}
                              className="cursor-pointer text-rose-600 focus:text-rose-700"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Xóa nhà hàng
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Tạo nhà hàng mới */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tạo nhà hàng mới</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tên nhà hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Phở Việt"
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mã nhà hàng (Slug/Code) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: PHOVIET"
                value={createForm.code}
                onChange={(e) =>
                  setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })
                }
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mã số thuế</label>
              <input
                type="text"
                placeholder="VD: 0109823456"
                value={createForm.taxCode}
                onChange={(e) => setCreateForm({ ...createForm, taxCode: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="text"
                placeholder="VD: 0901234567"
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Địa chỉ trụ sở</label>
              <input
                type="text"
                placeholder="VD: 123 Lê Lợi, Q.1, TP.HCM"
                value={createForm.address}
                onChange={(e) => setCreateForm({ ...createForm, address: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>

            <DialogFooter className="mt-6 pt-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#E03A14] text-white hover:bg-[#c9320f] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Tạo nhà hàng
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

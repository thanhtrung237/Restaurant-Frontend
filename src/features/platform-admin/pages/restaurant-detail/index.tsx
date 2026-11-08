import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  AlertTriangle,
  Lock,
  Unlock,
  Building,
  Calendar,
  Phone,
  Mail,
  MapPin,
  User,
  Loader2,
  Edit2,
  Store,
} from "lucide-react"
import {
  useRestaurant,
  useUpdateRestaurant,
  useChangeRestaurantStatus,
  useBranchesByRestaurant,
  useAccountsByRestaurant,
} from "@/features/platform-admin/api"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

export default function RestaurantDetailPage() {
  const { restaurantId } = useParams<{ restaurantId: string }>()
  const idNumber = restaurantId ? parseInt(restaurantId, 10) : undefined
  const navigate = useNavigate()
  const { toast } = useToast()

  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: "",
    taxCode: "",
    phone: "",
    address: "",
  })

  // Queries
  const { data: restaurant, isLoading, refetch } = useRestaurant(idNumber)
  const { data: branches = [] } = useBranchesByRestaurant(idNumber)
  const { data: accounts = [] } = useAccountsByRestaurant(idNumber)
  const statusMutation = useChangeRestaurantStatus()
  const updateMutation = useUpdateRestaurant()

  const ownerAccount =
    accounts.find((a) =>
      a.assignments?.some((asg) => asg.roleCode === "MANAGER" || asg.roleCode === "RESTAURANT_ADMIN")
    ) || accounts[0]

  const handleOpenEdit = () => {
    if (!restaurant) return
    setEditForm({
      name: restaurant.name || "",
      taxCode: restaurant.taxCode || "",
      phone: restaurant.phone || "",
      address: restaurant.address || "",
    })
    setIsEditModalOpen(true)
  }

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!restaurant) return

    try {
      await updateMutation.mutateAsync({
        id: restaurant.id,
        body: {
          name: editForm.name.trim(),
          taxCode: editForm.taxCode.trim() || undefined,
          phone: editForm.phone.trim() || undefined,
          address: editForm.address.trim() || undefined,
        },
      })
      toast({
        variant: "success",
        title: "Cập nhật thành công",
        description: `Thông tin nhà hàng "${editForm.name}" đã được lưu.`,
      })
      setIsEditModalOpen(false)
      refetch()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast({
        variant: "danger",
        title: "Cập nhật thất bại",
        description: error.response?.data?.message || "Đã xảy ra lỗi khi cập nhật thông tin.",
      })
    }
  }

  const isActive = restaurant?.status === "ACTIVE"

  const handleToggleStatus = async () => {
    if (!restaurant) return
    const newStatus = isActive ? "INACTIVE" : "ACTIVE"
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

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center text-gray-400 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-[#E03A14]" />
        <p className="text-sm">Đang tải thông tin nhà hàng...</p>
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className="p-12 text-center text-gray-500">
        <p className="font-semibold text-lg">Không tìm thấy thông tin nhà hàng</p>
        <button
          onClick={() => navigate("/quan-tri-nen-tang/nha-hang")}
          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm cursor-pointer"
        >
          Quay lại danh sách
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate("/quan-tri-nen-tang/nha-hang")}
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Danh sách nhà hàng</span>
        </button>
      </div>

      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{restaurant.name}</h1>
            {isActive ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Hoạt động
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                Tạm ngưng
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500">
            {restaurant.code} · {branches.length || restaurant.branchCount || 0} chi nhánh · tạo ngày{" "}
            {restaurant.createdAt ? new Date(restaurant.createdAt).toLocaleDateString("vi-VN") : "12/01/2025"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleOpenEdit}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer"
          >
            <Edit2 className="w-4 h-4 text-gray-500" />
            <span>Sửa thông tin</span>
          </button>

          <button
            onClick={handleToggleStatus}
            disabled={statusMutation.isPending}
            className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl shadow-sm transition-colors cursor-pointer ${
              isActive
                ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200"
            }`}
          >
            {isActive ? (
              <>
                <Lock className="w-4 h-4" />
                <span>Khóa nhà hàng</span>
              </>
            ) : (
              <>
                <Unlock className="w-4 h-4" />
                <span>Mở khóa</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Warning BR-21 Banner */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E]">
        <AlertTriangle className="w-5 h-5 shrink-0 text-[#D97706] mt-0.5" />
        <p className="text-sm leading-relaxed">
          Quản trị nền tảng chỉ thấy thông tin định danh nhà hàng. TUYỆT ĐỐI không truy cập dữ liệu
          kinh doanh của khách (BR-21).
        </p>
      </div>

      {/* 2-Column Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Thông tin định danh */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <Building className="w-5 h-5 text-gray-500" />
            <span>Thông tin định danh</span>
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <div className="text-xs text-gray-400 font-medium">Tên nhà hàng</div>
              <div className="text-gray-900 font-medium mt-1">{restaurant.name}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Mã nhà hàng</div>
              <div className="text-gray-900 font-mono mt-1">{restaurant.code}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Mã số thuế</div>
              <div className="text-gray-900 font-mono mt-1">
                {restaurant.taxCode || "—"}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Ngày tạo</div>
              <div className="text-gray-900 mt-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-gray-400" />
                <span>
                  {restaurant.createdAt
                    ? new Date(restaurant.createdAt).toLocaleDateString("vi-VN")
                    : "12/01/2025"}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Địa chỉ trụ sở</div>
              <div className="text-gray-900 mt-1 flex items-start gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <span>{restaurant.address || "Chưa cập nhật địa chỉ"}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Hotline</div>
              <div className="text-gray-900 mt-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{restaurant.phone || "Chưa cập nhật số điện thoại"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Tài khoản chủ nhà hàng */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <User className="w-5 h-5 text-gray-500" />
            <span>Tài khoản chủ nhà hàng (Quản trị nhà hàng)</span>
          </div>
          {ownerAccount ? (
            <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <div className="text-xs text-gray-400 font-medium">Họ tên</div>
                <div className="text-gray-900 font-medium mt-1">{ownerAccount.fullName}</div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Email</div>
                <div className="text-gray-900 mt-1 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-gray-400" />
                  <span>{ownerAccount.email || "Chưa có email"}</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Tên đăng nhập / Mã NV</div>
                <div className="text-gray-900 mt-1 flex items-center gap-1.5 font-mono">
                  <span>{ownerAccount.username} ({ownerAccount.employeeCode || "—"})</span>
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-400 font-medium">Trạng thái tài khoản</div>
                <div className="mt-1">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${
                      ownerAccount.status === "ACTIVE"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {ownerAccount.status === "ACTIVE" ? "Hoạt động" : "Tạm ngưng"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-gray-500 py-4 text-center">
              Chưa tìm thấy tài khoản quản trị viên của nhà hàng này.
            </div>
          )}
        </div>
      </div>

      {/* Card 3: Danh sách Chi nhánh */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <Store className="w-5 h-5 text-gray-500" />
            <span>Danh sách chi nhánh ({branches.length})</span>
          </div>
        </div>

        <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
          {branches.length > 0 ? (
            branches.map((b) => (
              <div key={b.id} className="p-4 hover:bg-gray-50/70 transition-colors flex items-center justify-between">
                <div>
                  <div className="font-semibold text-gray-900">{b.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{b.address || "Chưa có địa chỉ"}</div>
                </div>
                <span
                  className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    b.status === "ACTIVE"
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {b.status === "ACTIVE" ? "Hoạt động" : "Tạm ngưng"}
                </span>
              </div>
            ))
          ) : (
            <div className="text-sm text-gray-500 py-6 text-center">
              Nhà hàng này chưa có chi nhánh nào được tạo.
            </div>
          )}
        </div>
      </div>

      {/* Modal Sửa thông tin nhà hàng */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sửa thông tin nhà hàng</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSaveEdit} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tên nhà hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mã nhà hàng (Không thể sửa - FR-TEN-01)
              </label>
              <input
                type="text"
                disabled
                value={restaurant?.code || ""}
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mã số thuế</label>
              <input
                type="text"
                value={editForm.taxCode}
                onChange={(e) => setEditForm({ ...editForm, taxCode: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Hotline / Số điện thoại</label>
              <input
                type="text"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Địa chỉ trụ sở</label>
              <input
                type="text"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>

            <DialogFooter className="mt-6 pt-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#E03A14] text-white hover:bg-[#c9320f] cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
              >
                {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Lưu thay đổi
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

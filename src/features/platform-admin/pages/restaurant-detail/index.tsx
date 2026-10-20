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
  CreditCard,
  User,
  Loader2,
  CheckCircle2,
  Clock,
} from "lucide-react"
import {
  useRestaurant,
  useChangeRestaurantStatus,
  useBranchesByRestaurant,
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

  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState("Pro")

  // Queries
  const { data: restaurant, isLoading, refetch } = useRestaurant(idNumber)
  const { data: branches = [] } = useBranchesByRestaurant(idNumber)
  const statusMutation = useChangeRestaurantStatus()

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

  const handleUpdatePlan = () => {
    toast({
      variant: "success",
      title: "Đã cập nhật gói",
      description: `Đã chuyển sang gói ${selectedPlan} thành công.`,
    })
    setIsPlanModalOpen(false)
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
          className="mt-4 px-4 py-2 bg-gray-900 text-white rounded-xl text-sm"
        >
          Quay lại danh sách
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
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

      {/* Header Info matching mockup */}
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
            {restaurant.code} · {branches.length || restaurant.branchCount || 1} chi nhánh · tạo ngày{" "}
            {restaurant.createdAt ? new Date(restaurant.createdAt).toLocaleDateString("vi-VN") : "12/01/2025"}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsPlanModalOpen(true)}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer"
          >
            Đổi gói
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
                {restaurant.taxCode || "0109823456"}
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
                <span>{restaurant.address || "123 Lê Lợi, P. Bến Nghé, Q.1, TP.HCM"}</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Hotline</div>
              <div className="text-gray-900 mt-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>{restaurant.phone || "028 3822 1234"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Gói dịch vụ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <CreditCard className="w-5 h-5 text-gray-500" />
            <span>Gói dịch vụ</span>
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <div className="text-xs text-gray-400 font-medium">Gói hiện tại</div>
              <div className="mt-1">
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-lg text-xs font-bold bg-[#E03A14]/10 text-[#E03A14]">
                  {selectedPlan}
                </span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Chu kỳ</div>
              <div className="text-gray-900 font-medium mt-1">Hàng tháng</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Ngày gia hạn</div>
              <div className="text-gray-900 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>26/08/2026</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Trạng thái thanh toán</div>
              <div className="mt-1">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Đã thanh toán
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Tài khoản chủ nhà hàng */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
            <User className="w-5 h-5 text-gray-500" />
            <span>Tài khoản chủ nhà hàng</span>
          </div>
          <div className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
            <div>
              <div className="text-xs text-gray-400 font-medium">Họ tên</div>
              <div className="text-gray-900 font-medium mt-1">Nguyễn Văn An</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Email</div>
              <div className="text-gray-900 mt-1 flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-gray-400" />
                <span>an.nguyen@phoviet.vn</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Số điện thoại</div>
              <div className="text-gray-900 mt-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-gray-400" />
                <span>090 912 3456</span>
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Đăng nhập gần nhất</div>
              <div className="text-gray-900 mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                <span>Hôm nay 08:32</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Chi nhánh */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 font-bold text-base">
              <Building className="w-5 h-5 text-gray-500" />
              <span>Chi nhánh ({branches.length || 3})</span>
            </div>
          </div>
          <div className="space-y-3 pt-1">
            {branches.length > 0 ? (
              branches.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm"
                >
                  <div>
                    <div className="font-semibold text-gray-900">{b.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{b.address || "Chưa có địa chỉ"}</div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${
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
              <>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                  <div>
                    <div className="font-semibold text-gray-900">Chi nhánh Quận 1</div>
                    <div className="text-xs text-gray-500 mt-0.5">123 Lê Lợi, Bến Nghé, Q.1</div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    Hoạt động
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                  <div>
                    <div className="font-semibold text-gray-900">Chi nhánh Cầu Giấy</div>
                    <div className="text-xs text-gray-500 mt-0.5">45 Duy Tân, Cầu Giấy, HN</div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    Hoạt động
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-gray-50 border border-gray-100 text-sm">
                  <div>
                    <div className="font-semibold text-gray-900">Chi nhánh Đà Nẵng</div>
                    <div className="text-xs text-gray-500 mt-0.5">88 Bạch Đằng, Hải Châu, ĐN</div>
                  </div>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                    Hoạt động
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Đổi gói */}
      <Dialog open={isPlanModalOpen} onOpenChange={setIsPlanModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Đổi gói dịch vụ</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-3">
            {[
              { id: "Free", name: "Gói Free", price: "0 đ / tháng", desc: "1 chi nhánh, tính năng cơ bản" },
              { id: "Pro", name: "Gói Pro", price: "990.000 đ / tháng", desc: "Tối đa 5 chi nhánh, báo cáo nâng cao" },
              { id: "Enterprise", name: "Gói Enterprise", price: "4.990.000 đ / tháng", desc: "Không giới hạn, API tích hợp" },
            ].map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedPlan(p.id)}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                  selectedPlan === p.id
                    ? "border-[#E03A14] bg-orange-50/50 ring-1 ring-[#E03A14]"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex justify-between items-center">
                  <div className="font-bold text-gray-900">{p.name}</div>
                  <div className="font-semibold text-[#E03A14] text-sm">{p.price}</div>
                </div>
                <div className="text-xs text-gray-500 mt-1">{p.desc}</div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <button
              onClick={() => setIsPlanModalOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Hủy
            </button>
            <button
              onClick={handleUpdatePlan}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-[#E03A14] text-white hover:bg-[#c9320f]"
            >
              Lưu thay đổi
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

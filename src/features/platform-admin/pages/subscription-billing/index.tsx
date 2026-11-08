import { useState, useMemo } from "react"
import {
  Download,
  Plus,
  Check,
  TrendingUp,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"
import { useRestaurantsPage } from "@/features/platform-admin/api"

interface Plan {
  id: string
  name: string
  price: string
  period: string
  desc: string
  popular?: boolean
  features: string[]
}

const initialPlans: Plan[] = [
  {
    id: "free",
    name: "Free",
    price: "0đ",
    period: "/tháng",
    desc: "Cho quán nhỏ mới bắt đầu",
    features: [
      "Tối đa 1 chi nhánh",
      "5 tài khoản nhân viên",
      "Menu cơ bản, gọi món tại bàn",
      "Không hỗ trợ báo cáo nâng cao",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "990.000đ",
    period: "/tháng",
    desc: "Cho chuỗi quán đang phát triển",
    popular: true,
    features: [
      "Tối đa 5 chi nhánh",
      "Không giới hạn nhân viên",
      "Toàn bộ tính năng báo cáo & KDS",
      "Hỗ trợ máy in & tích hợp thanh toán",
      "Hỗ trợ kỹ thuật 24/7",
    ],
  },
  {
    id: "enterprise",
    name: "Enterprise",
    price: "4.990.000đ",
    period: "/tháng",
    desc: "Cho tập đoàn F&B quy mô lớn",
    features: [
      "Không giới hạn chi nhánh",
      "API tùy chỉnh & tích hợp ERP",
      "Hỗ trợ máy chủ riêng",
      "Quản lý nhượng quyền nhiều cấp",
      "SLA 99.99% & Account Manager riêng",
    ],
  },
]

interface BillingRow {
  id: string
  restaurantName: string
  code: string
  plan: string
  cycle: string
  renewalDate: string
  amount: string
  status: "PAID" | "FREE" | "OVERDUE"
}

const initialBillings: BillingRow[] = [
  {
    id: "1",
    restaurantName: "Phở Việt",
    code: "NH-0001",
    plan: "Pro",
    cycle: "Hàng tháng",
    renewalDate: "26/08/2026",
    amount: "990.000đ",
    status: "PAID",
  },
  {
    id: "2",
    restaurantName: "Cơm Tấm Sài Gòn",
    code: "NH-0003",
    plan: "Pro",
    cycle: "Hàng năm",
    renewalDate: "15/09/2026",
    amount: "9.900.000đ",
    status: "PAID",
  },
  {
    id: "3",
    restaurantName: "Bánh Mì Hà Nội",
    code: "NH-0002",
    plan: "Free",
    cycle: "Vĩnh viễn",
    renewalDate: "—",
    amount: "0đ",
    status: "FREE",
  },
  {
    id: "4",
    restaurantName: "Trà Sữa Mộc",
    code: "NH-0004",
    plan: "Pro",
    cycle: "Hàng tháng",
    renewalDate: "01/08/2026",
    amount: "990.000đ",
    status: "OVERDUE",
  },
]

export default function SubscriptionBillingPage() {
  const { toast } = useToast()
  const { data: restaurantsData } = useRestaurantsPage({ page: 0, size: 50 })
  const restaurants = restaurantsData?.content || []

  const [activeTab, setActiveTab] = useState<"plans" | "billing">("plans")
  const [plans, setPlans] = useState<Plan[]>(() => {
    const saved = localStorage.getItem("saas_plans")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {}
    }
    return initialPlans
  })
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)

  // Kết hợp danh sách nhà hàng thật từ backend với thông tin billing
  const billings = useMemo<BillingRow[]>(() => {
    if (!restaurants || restaurants.length === 0) {
      return initialBillings
    }
    return restaurants.map((r, index) => {
      const isPro = index % 2 === 0
      return {
        id: String(r.id),
        restaurantName: r.name,
        code: r.code,
        plan: isPro ? "Pro" : "Free",
        cycle: isPro ? "Hàng tháng" : "Vĩnh viễn",
        renewalDate: isPro ? "26/08/2026" : "—",
        amount: isPro ? "990.000đ" : "0đ",
        status: isPro ? (r.status === "ACTIVE" ? "PAID" : "OVERDUE") : "FREE",
      }
    })
  }, [restaurants])

  const handleExportInvoice = () => {
    toast({
      variant: "success",
      title: "Xuất dữ liệu hóa đơn",
      description: "Đang tải xuống báo cáo thanh toán subscription...",
    })
    // Dummy download
    const csvContent =
      "data:text/csv;charset=utf-8," +
      "ID,Nha Hang,Ma,Goi,Chu Ky,Gia Han,So Tien,Trang Thai\n" +
      billings
        .map(
          (b) =>
            `${b.id},"${b.restaurantName}",${b.code},${b.plan},${b.cycle},${b.renewalDate},"${b.amount}",${b.status}`
        )
        .join("\n")
    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", "subscription_billing_report.csv")
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handleEditPlan = (plan: Plan) => {
    setEditingPlan({ ...plan })
    setIsEditModalOpen(true)
  }

  const handleSavePlan = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingPlan) return
    const updated = plans.some((p) => p.id === editingPlan.id)
      ? plans.map((p) => (p.id === editingPlan.id ? editingPlan : p))
      : [...plans, editingPlan]
    setPlans(updated)
    localStorage.setItem("saas_plans", JSON.stringify(updated))
    setIsEditModalOpen(false)
    toast({
      variant: "success",
      title: "Cập nhật thành công",
      description: `Đã lưu thông tin gói ${editingPlan.name}.`,
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header matching mockups */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Gói & thanh toán</h1>
          <p className="text-sm text-gray-500 mt-1">
            Quản lý các gói dịch vụ SaaS và theo dõi subscription của nhà hàng
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportInvoice}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl border border-gray-200 bg-white text-gray-700 hover:bg-gray-50 shadow-sm transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 text-gray-500" />
            <span>Xuất hóa đơn</span>
          </button>
          <button
            onClick={() => {
              setEditingPlan({
                id: `plan-${Date.now()}`,
                name: "Gói mới",
                price: "1.990.000đ",
                period: "/tháng",
                desc: "Gói mở rộng mới",
                features: ["Tối đa 10 chi nhánh", "Hỗ trợ 24/7"],
              })
              setIsEditModalOpen(true)
            }}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-xl bg-[#E03A14] text-white hover:bg-[#c9320f] shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tạo gói</span>
          </button>
        </div>
      </div>

      {/* Tabs Switcher matching mockups */}
      <div className="flex border-b border-gray-200 gap-6">
        <button
          onClick={() => setActiveTab("plans")}
          className={`pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === "plans"
              ? "border-[#E03A14] text-[#E03A14] font-bold"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Danh mục gói
        </button>
        <button
          onClick={() => setActiveTab("billing")}
          className={`pb-3 text-sm font-medium border-b-2 transition-all cursor-pointer ${
            activeTab === "billing"
              ? "border-[#E03A14] text-[#E03A14] font-bold"
              : "border-transparent text-gray-500 hover:text-gray-900"
          }`}
        >
          Thanh toán
        </button>
      </div>

      {/* Tab 1: Danh mục gói */}
      {activeTab === "plans" && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`rounded-2xl bg-white border p-6 flex flex-col justify-between relative transition-shadow ${
                plan.popular
                  ? "border-[#E03A14] shadow-md ring-1 ring-[#E03A14]/20"
                  : "border-gray-200 shadow-sm hover:shadow-md"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 right-6 bg-[#E03A14] text-white text-[11px] font-bold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-sm">
                  Phổ biến
                </div>
              )}
              <div>
                <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                <p className="text-xs text-gray-500 mt-1 min-h-[32px]">{plan.desc}</p>

                <div className="mt-4 mb-6">
                  <span className="text-3xl font-extrabold text-gray-900 tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-sm text-gray-500 ml-1 font-medium">{plan.period}</span>
                </div>

                <div className="space-y-3 border-t border-gray-100 pt-5">
                  <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    Tính năng bao gồm:
                  </div>
                  {plan.features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-gray-100">
                <button
                  onClick={() => handleEditPlan(plan)}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-colors cursor-pointer ${
                    plan.popular
                      ? "bg-[#E03A14] text-white hover:bg-[#c9320f] shadow-sm"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  Sửa gói
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Tab 2: Thanh toán */}
      {activeTab === "billing" && (
        <div className="space-y-6 pt-2">
          {/* 4 Stat Cards matching mockup */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Card 1 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="text-xs font-medium text-gray-500">
                Doanh thu subscription / tháng
              </div>
              <div className="text-2xl font-bold text-gray-900 mt-2">12.960.000đ</div>
              <div className="flex items-center gap-1.5 text-xs text-emerald-600 mt-2 font-medium">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+15% so với tháng trước</span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="text-xs font-medium text-gray-500">Nhà hàng trả phí</div>
              <div className="text-2xl font-bold text-gray-900 mt-2">3 / 4</div>
              <div className="text-xs text-gray-400 mt-2">75% chuyển đổi thành công</div>
            </div>

            {/* Card 3 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="text-xs font-medium text-gray-500">Sắp hết hạn (7 ngày)</div>
              <div className="text-2xl font-bold text-amber-600 mt-2">1</div>
              <div className="text-xs text-gray-400 mt-2 flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Cần gửi thông báo gia hạn</span>
              </div>
            </div>

            {/* Card 4 */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm">
              <div className="text-xs font-medium text-gray-500">Quá hạn thanh toán</div>
              <div className="text-2xl font-bold text-rose-600 mt-2">1</div>
              <div className="text-xs text-rose-500 mt-2 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Cần nhắc nhở / khóa gói</span>
              </div>
            </div>
          </div>

          {/* Billing Table matching mockup */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/75 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    <th className="py-3.5 px-6">NHÀ HÀNG</th>
                    <th className="py-3.5 px-6">GÓI</th>
                    <th className="py-3.5 px-6">CHU KỲ</th>
                    <th className="py-3.5 px-6">GIA HẠN</th>
                    <th className="py-3.5 px-6">SỐ TIỀN / THÁNG</th>
                    <th className="py-3.5 px-6">TRẠNG THÁI</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {billings.map((b) => (
                    <tr key={b.id} className="hover:bg-gray-50/80 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-900">{b.restaurantName}</div>
                        <div className="text-xs text-gray-400 font-mono mt-0.5">{b.code}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-semibold text-gray-800">{b.plan}</span>
                      </td>
                      <td className="py-4 px-6 text-gray-600">{b.cycle}</td>
                      <td className="py-4 px-6 text-gray-600 font-mono text-xs">{b.renewalDate}</td>
                      <td className="py-4 px-6 font-semibold text-gray-900">{b.amount}</td>
                      <td className="py-4 px-6">
                        {b.status === "PAID" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            Đã thanh toán
                          </span>
                        )}
                        {b.status === "FREE" && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                            Miễn phí
                          </span>
                        )}
                        {b.status === "OVERDUE" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700">
                            <AlertCircle className="w-3 h-3 text-rose-500" />
                            Quá hạn
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Edit Plan Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cấu hình gói dịch vụ</DialogTitle>
          </DialogHeader>
          {editingPlan && (
            <form onSubmit={handleSavePlan} className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tên gói</label>
                <input
                  type="text"
                  required
                  value={editingPlan.name}
                  onChange={(e) => setEditingPlan({ ...editingPlan, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Giá hiển thị</label>
                <input
                  type="text"
                  required
                  value={editingPlan.price}
                  onChange={(e) => setEditingPlan({ ...editingPlan, price: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Mô tả ngắn</label>
                <input
                  type="text"
                  value={editingPlan.desc}
                  onChange={(e) => setEditingPlan({ ...editingPlan, desc: e.target.value })}
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
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[#E03A14] text-white hover:bg-[#c9320f] cursor-pointer"
                >
                  Lưu thay đổi
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

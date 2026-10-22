import { useState } from "react"
import { Plus, Loader2 } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  initial: string
  bgColor: string
}

const initialAdmins: AdminUser[] = [
  {
    id: "1",
    name: "Super Admin",
    email: "admin@qrestaurant.vn",
    role: "Toàn quyền",
    initial: "S",
    bgColor: "bg-[#E03A14]",
  },
  {
    id: "2",
    name: "Lê Vận Hành",
    email: "ops@qrestaurant.vn",
    role: "Vận hành",
    initial: "L",
    bgColor: "bg-[#E03A14]",
  },
]

export default function PlatformConfigPage() {
  const { toast } = useToast()

  // Form states
  const [platformName, setPlatformName] = useState("QRestaurant Platform")
  const [domain, setDomain] = useState("app.qrestaurant.vn")
  const [supportEmail, setSupportEmail] = useState("support@qrestaurant.vn")
  const [hotline, setHotline] = useState("1900 8080")

  // Defaults for new restaurants
  const [defaultPlan, setDefaultPlan] = useState("Free")
  const [initialBranches, setInitialBranches] = useState(1)
  const [enableProTrial, setEnableProTrial] = useState(true)

  // Admins
  const [admins, setAdmins] = useState<AdminUser[]>(initialAdmins)
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false)
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", role: "Vận hành" })
  const [isSaving, setIsSaving] = useState(false)

  const handleSaveConfig = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast({
        variant: "success",
        title: "Lưu thay đổi thành công",
        description: "Các thiết lập cấu hình nền tảng SaaS đã được áp dụng.",
      })
    }, 400)
  }

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newAdmin.name || !newAdmin.email) return

    const admin: AdminUser = {
      id: `${Date.now()}`,
      name: newAdmin.name,
      email: newAdmin.email,
      role: newAdmin.role,
      initial: newAdmin.name.charAt(0).toUpperCase(),
      bgColor: "bg-[#E03A14]",
    }

    setAdmins([...admins, admin])
    setIsAddAdminOpen(false)
    setNewAdmin({ name: "", email: "", role: "Vận hành" })
    toast({
      variant: "success",
      title: "Thêm thành công",
      description: `Đã cấp quyền quản trị cho ${admin.name}.`,
    })
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header with Save button matching mockup */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Cấu hình nền tảng</h1>
          <p className="text-sm text-gray-500 mt-1">Thiết lập chung cho toàn hệ thống SaaS</p>
        </div>
        <button
          onClick={handleSaveConfig}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E03A14] text-white font-medium text-sm hover:bg-[#c9320f] shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
          <span>Lưu thay đổi</span>
        </button>
      </div>

      {/* Section 1: Thông tin nền tảng */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
        <h2 className="font-bold text-gray-900 text-base">Thông tin nền tảng</h2>

        {/* Logo block */}
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-[#E03A14] flex items-center justify-center text-white shadow-sm">
            <div className="w-6 h-6 rotate-45 border-2 border-white bg-white/20" />
          </div>
          <div>
            <div className="text-xs font-semibold text-gray-700">Logo nền tảng</div>
            <button
              type="button"
              onClick={() =>
                toast({
                  variant: "info",
                  title: "Đổi logo",
                  description: "Chức năng tải lên file ảnh đang mở...",
                })
              }
              className="mt-1.5 px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-xs font-medium text-gray-700 hover:bg-gray-50 shadow-xs cursor-pointer"
            >
              Đổi logo
            </button>
          </div>
        </div>

        {/* Form Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tên nền tảng</label>
            <input
              type="text"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Tên miền</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Email hỗ trợ</label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Hotline hỗ trợ</label>
            <input
              type="text"
              value={hotline}
              onChange={(e) => setHotline(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
            />
          </div>
        </div>
      </div>

      {/* Section 2: Mặc định cho nhà hàng mới */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-5">
        <div>
          <h2 className="font-bold text-gray-900 text-base">Mặc định cho nhà hàng mới</h2>
          <p className="text-xs text-gray-500 mt-0.5">Áp dụng khi tạo nhà hàng mới trên hệ thống</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Gói mặc định</label>
            <select
              value={defaultPlan}
              onChange={(e) => setDefaultPlan(e.target.value)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14] cursor-pointer"
            >
              <option value="Free">Free</option>
              <option value="Pro">Pro</option>
              <option value="Enterprise">Enterprise</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1.5">Số chi nhánh khởi tạo</label>
            <input
              type="number"
              min={1}
              value={initialBranches}
              onChange={(e) => setInitialBranches(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3.5 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
            />
          </div>
        </div>

        {/* Toggle Pro Trial */}
        <div className="flex items-center justify-between pt-2">
          <div>
            <div className="text-sm font-semibold text-gray-900">Cho dùng thử Pro 14 ngày</div>
            <div className="text-xs text-gray-500">
              Nhà hàng mới được trải nghiệm gói Pro miễn phí 14 ngày
            </div>
          </div>
          <button
            type="button"
            onClick={() => setEnableProTrial(!enableProTrial)}
            className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
              enableProTrial ? "bg-[#E03A14]" : "bg-gray-300"
            }`}
          >
            <div
              className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                enableProTrial ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Section 3: Tài khoản quản trị nền tảng */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
        <h2 className="font-bold text-gray-900 text-base">Tài khoản quản trị nền tảng</h2>

        <div className="space-y-3">
          {admins.map((admin) => (
            <div
              key={admin.id}
              className="flex items-center justify-between p-3.5 rounded-xl border border-gray-100 hover:bg-gray-50/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full ${admin.bgColor} text-white font-bold text-sm flex items-center justify-center shrink-0`}
                >
                  {admin.initial}
                </div>
                <div>
                  <div className="font-semibold text-gray-900 text-sm">{admin.name}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{admin.email}</div>
                </div>
              </div>
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${
                  admin.role === "Toàn quyền"
                    ? "bg-purple-50 text-purple-700"
                    : "bg-blue-50 text-blue-700"
                }`}
              >
                {admin.role}
              </span>
            </div>
          ))}
        </div>

        {/* Add Admin Trigger */}
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setIsAddAdminOpen(true)}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#E03A14] hover:text-[#c9320f] transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Thêm quản trị viên</span>
          </button>
        </div>
      </div>

      {/* Add Admin Dialog */}
      <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Thêm quản trị viên nền tảng</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleAddAdmin} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Họ và tên <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Trần Quản Trị"
                value={newAdmin.name}
                onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Email tài khoản <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="VD: admin2@qrestaurant.vn"
                value={newAdmin.email}
                onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Vai trò</label>
              <select
                value={newAdmin.role}
                onChange={(e) => setNewAdmin({ ...newAdmin, role: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              >
                <option value="Vận hành">Vận hành</option>
                <option value="Toàn quyền">Toàn quyền</option>
              </select>
            </div>
            <DialogFooter className="mt-6 pt-2">
              <button
                type="button"
                onClick={() => setIsAddAdminOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#E03A14] text-white hover:bg-[#c9320f] cursor-pointer"
              >
                Thêm quản trị viên
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

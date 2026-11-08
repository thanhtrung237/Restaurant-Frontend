import React, { useState } from "react"
import {
  Sliders,
  Shield,
  KeyRound,
  Bell,
  Wrench,
  Database,
  History,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Upload,
  Download,
  Save,
  RefreshCw,
  Info,
} from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { useToast } from "@/hooks/use-toast"

type ConfigTab =
  | "general"
  | "security"
  | "session"
  | "notifications"
  | "maintenance"
  | "backup"
  | "history"

interface ConfigHistoryItem {
  id: string
  timestamp: string
  category: string
  changedBy: string
  summary: string
}

export default function PlatformConfigPage() {
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<ConfigTab>("general")
  const [isSaving, setIsSaving] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [pendingChangesSummary, setPendingChangesSummary] = useState<string>("")

  // -------------------------------------------------------------
  // 1. NHÓM: THÔNG TIN NỀN TẢNG
  // -------------------------------------------------------------
  const [platformName, setPlatformName] = useState(
    () => localStorage.getItem("cfg_platform_name") || "QRestaurant SaaS Platform"
  )
  const [systemVersion, setSystemVersion] = useState(
    () => localStorage.getItem("cfg_system_version") || "v2.4.0-stable"
  )
  const [domain, setDomain] = useState(
    () => localStorage.getItem("cfg_domain") || "app.qrestaurant.vn"
  )
  const [supportEmail, setSupportEmail] = useState(
    () => localStorage.getItem("cfg_support_email") || "support@qrestaurant.vn"
  )
  const [hotline, setHotline] = useState(
    () => localStorage.getItem("cfg_hotline") || "1900 8080"
  )
  const [logoPreview, setLogoPreview] = useState<string | null>(
    () => localStorage.getItem("cfg_platform_logo") || null
  )

  // -------------------------------------------------------------
  // 2. NHÓM: CẤU HÌNH BẢO MẬT
  // -------------------------------------------------------------
  const [maxLoginAttempts, setMaxLoginAttempts] = useState(
    () => parseInt(localStorage.getItem("cfg_max_login_attempts") || "5", 10)
  )
  const [lockoutDurationMinutes, setLockoutDurationMinutes] = useState(
    () => parseInt(localStorage.getItem("cfg_lockout_duration") || "15", 10)
  )
  const [minPasswordLength, setMinPasswordLength] = useState(
    () => parseInt(localStorage.getItem("cfg_min_password_len") || "8", 10)
  )
  const [requireSpecialChar, setRequireSpecialChar] = useState(
    () => localStorage.getItem("cfg_req_special_char") !== "false"
  )
  const [enforceAdmin2FA, setEnforceAdmin2FA] = useState(
    () => localStorage.getItem("cfg_enforce_admin_2fa") === "true"
  )

  // -------------------------------------------------------------
  // 3. NHÓM: CẤU HÌNH PHIÊN ĐĂNG NHẬP
  // -------------------------------------------------------------
  const [accessTokenExpirationMin, setAccessTokenExpirationMin] = useState(
    () => parseInt(localStorage.getItem("cfg_access_token_exp_min") || "60", 10)
  )
  const [refreshTokenExpirationDays, setRefreshTokenExpirationDays] = useState(
    () => parseInt(localStorage.getItem("cfg_refresh_token_exp_days") || "7", 10)
  )
  const [revokeOnNewDevice, setRevokeOnNewDevice] = useState(
    () => localStorage.getItem("cfg_revoke_on_new_device") !== "false"
  )
  const [allowRememberMe, setAllowRememberMe] = useState(
    () => localStorage.getItem("cfg_allow_remember_me") !== "false"
  )

  // -------------------------------------------------------------
  // 4. NHÓM: THÔNG BÁO HỆ THỐNG
  // -------------------------------------------------------------
  const [enableBroadcastBanner, setEnableBroadcastBanner] = useState(
    () => localStorage.getItem("cfg_enable_broadcast") === "true"
  )
  const [broadcastLevel, setBroadcastLevel] = useState<"info" | "warning" | "urgent">(
    () => (localStorage.getItem("cfg_broadcast_level") as any) || "info"
  )
  const [broadcastTitle, setBroadcastTitle] = useState(
    () => localStorage.getItem("cfg_broadcast_title") || "Thông báo cập nhật hệ thống"
  )
  const [broadcastMessage, setBroadcastMessage] = useState(
    () =>
      localStorage.getItem("cfg_broadcast_msg") ||
      "Nền tảng sẽ cập nhật các tính năng mới vào cuối tuần. Các nhà hàng vẫn hoạt động bình thường."
  )

  // -------------------------------------------------------------
  // 5. NHÓM: BẢO TRÌ HỆ THỐNG
  // -------------------------------------------------------------
  const [maintenanceMode, setMaintenanceMode] = useState(
    () => localStorage.getItem("cfg_maintenance_mode") === "true"
  )
  const [maintenanceMessage, setMaintenanceMessage] = useState(
    () =>
      localStorage.getItem("cfg_maintenance_msg") ||
      "Hệ thống đang được bảo trì nâng cấp hạ tầng kỹ thuật định kỳ. Vui lòng quay lại sau."
  )
  const [maintenanceStart, setMaintenanceStart] = useState(
    () => localStorage.getItem("cfg_maintenance_start") || ""
  )
  const [maintenanceEnd, setMaintenanceEnd] = useState(
    () => localStorage.getItem("cfg_maintenance_end") || ""
  )
  const [allowSuperAdminBypass, setAllowSuperAdminBypass] = useState(
    () => localStorage.getItem("cfg_maintenance_bypass_admin") !== "false"
  )

  // -------------------------------------------------------------
  // 6. NHÓM: SAO LƯU DỰ PHÒNG
  // -------------------------------------------------------------
  const [autoBackupEnabled, setAutoBackupEnabled] = useState(
    () => localStorage.getItem("cfg_backup_auto") !== "false"
  )
  const [backupFrequency, setBackupFrequency] = useState(
    () => localStorage.getItem("cfg_backup_freq") || "DAILY"
  )
  const [lastBackupTime, setLastBackupTime] = useState(
    () => localStorage.getItem("cfg_last_backup_time") || "2026-11-06 02:00:15"
  )
  const [backupStatus, setBackupStatus] = useState(
    () => localStorage.getItem("cfg_backup_status") || "Thành công (dung lượng 248 MB)"
  )
  const [isBackingUp, setIsBackingUp] = useState(false)

  // -------------------------------------------------------------
  // 7. LỊCH SỬ THAY ĐỔI CẤU HÌNH (Audit Trail)
  // -------------------------------------------------------------
  const [historyItems, setHistoryItems] = useState<ConfigHistoryItem[]>(() => {
    const saved = localStorage.getItem("cfg_audit_history")
    if (saved) {
      try {
        return JSON.parse(saved)
      } catch {
        // fallback
      }
    }
    return [
      {
        id: "1",
        timestamp: "2026-11-05 14:20:10",
        category: "Bảo mật",
        changedBy: "Super Admin",
        summary: "Kích hoạt chính sách mật khẩu tối thiểu 8 ký tự và kiểm tra ký tự đặc biệt",
      },
      {
        id: "2",
        timestamp: "2026-11-04 09:15:30",
        category: "Phiên đăng nhập",
        changedBy: "Super Admin",
        summary: "Thiết lập thời hạn Access Token là 60 phút, Refresh Token 7 ngày",
      },
      {
        id: "3",
        timestamp: "2026-10-28 16:45:00",
        category: "Thông tin nền tảng",
        changedBy: "Super Admin",
        summary: "Cập nhật hotline hỗ trợ 1900 8080 và email liên hệ",
      },
    ]
  })

  // Lưu lịch sử khi cập nhật
  const recordHistory = (category: string, summary: string) => {
    const newItem: ConfigHistoryItem = {
      id: `${Date.now()}`,
      timestamp: new Date().toLocaleString("vi-VN"),
      category,
      changedBy: "Super Admin",
      summary,
    }
    const updated = [newItem, ...historyItems].slice(0, 50)
    setHistoryItems(updated)
    localStorage.setItem("cfg_audit_history", JSON.stringify(updated))
  }

  // Handle Logo Upload (Simulated Local Preview)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          variant: "danger",
          title: "File quá lớn",
          description: "Kích thước logo không được vượt quá 2MB.",
        })
        return
      }
      const reader = new FileReader()
      reader.onload = (event) => {
        const base64 = event.target?.result as string
        setLogoPreview(base64)
        localStorage.setItem("cfg_platform_logo", base64)
        toast({
          variant: "success",
          title: "Cập nhật logo",
          description: "Logo nền tảng đã được tải lên thành công.",
        })
      }
      reader.readAsDataURL(file)
    }
  }

  // Pre-validate before save
  const handleRequestSave = () => {
    // Validate inputs
    if (!platformName.trim()) {
      toast({
        variant: "danger",
        title: "Thiếu thông tin",
        description: "Tên nền tảng không được để trống.",
      })
      return
    }
    if (minPasswordLength < 6) {
      toast({
        variant: "danger",
        title: "Giá trị không hợp lệ",
        description: "Độ dài mật khẩu tối thiểu phải từ 6 ký tự trở lên.",
      })
      return
    }
    if (maxLoginAttempts < 3) {
      toast({
        variant: "danger",
        title: "Giá trị không hợp lệ",
        description: "Số lần thử đăng nhập tối đa phải từ 3 lần trở lên.",
      })
      return
    }
    if (accessTokenExpirationMin < 5) {
      toast({
        variant: "danger",
        title: "Giá trị không hợp lệ",
        description: "Thời gian hết hạn phiên (Access token) tối thiểu là 5 phút.",
      })
      return
    }

    // Nếu có thay đổi quan trọng (Bảo trì hoặc Thay đổi bảo mật/phiên), hiển thị Confirmation Dialog
    const isCritical =
      maintenanceMode !== (localStorage.getItem("cfg_maintenance_mode") === "true") ||
      enforceAdmin2FA !== (localStorage.getItem("cfg_enforce_admin_2fa") === "true")

    if (isCritical) {
      const summary = maintenanceMode
        ? "⚠️ CẢNH BÁO: Bạn đang BẬT chế độ bảo trì toàn hệ thống. Người dùng các nhà hàng sẽ không thể truy cập!"
        : "Xác nhận áp dụng các thay đổi cấu hình bảo mật và vận hành hệ thống."
      setPendingChangesSummary(summary)
      setIsConfirmOpen(true)
    } else {
      executeSaveConfig()
    }
  }

  // Thực hiện ghi cấu hình vào storage & audit trail
  const executeSaveConfig = () => {
    setIsSaving(true)
    setIsConfirmOpen(false)

    // Save All to LocalStorage
    localStorage.setItem("cfg_platform_name", platformName)
    localStorage.setItem("cfg_system_version", systemVersion)
    localStorage.setItem("cfg_domain", domain)
    localStorage.setItem("cfg_support_email", supportEmail)
    localStorage.setItem("cfg_hotline", hotline)

    localStorage.setItem("cfg_max_login_attempts", String(maxLoginAttempts))
    localStorage.setItem("cfg_lockout_duration", String(lockoutDurationMinutes))
    localStorage.setItem("cfg_min_password_len", String(minPasswordLength))
    localStorage.setItem("cfg_req_special_char", String(requireSpecialChar))
    localStorage.setItem("cfg_enforce_admin_2fa", String(enforceAdmin2FA))

    localStorage.setItem("cfg_access_token_exp_min", String(accessTokenExpirationMin))
    localStorage.setItem("cfg_refresh_token_exp_days", String(refreshTokenExpirationDays))
    localStorage.setItem("cfg_revoke_on_new_device", String(revokeOnNewDevice))
    localStorage.setItem("cfg_allow_remember_me", String(allowRememberMe))

    localStorage.setItem("cfg_enable_broadcast", String(enableBroadcastBanner))
    localStorage.setItem("cfg_broadcast_level", broadcastLevel)
    localStorage.setItem("cfg_broadcast_title", broadcastTitle)
    localStorage.setItem("cfg_broadcast_msg", broadcastMessage)

    localStorage.setItem("cfg_maintenance_mode", String(maintenanceMode))
    localStorage.setItem("cfg_maintenance_msg", maintenanceMessage)
    localStorage.setItem("cfg_maintenance_start", maintenanceStart)
    localStorage.setItem("cfg_maintenance_end", maintenanceEnd)
    localStorage.setItem("cfg_maintenance_bypass_admin", String(allowSuperAdminBypass))

    localStorage.setItem("cfg_backup_auto", String(autoBackupEnabled))
    localStorage.setItem("cfg_backup_freq", backupFrequency)

    // Ghi nhận lịch sử
    const activeTabLabel =
      activeTab === "general"
        ? "Thông tin nền tảng"
        : activeTab === "security"
        ? "Bảo mật"
        : activeTab === "session"
        ? "Phiên đăng nhập"
        : activeTab === "notifications"
        ? "Thông báo"
        : activeTab === "maintenance"
        ? "Bảo trì"
        : "Sao lưu"

    recordHistory(activeTabLabel, `Cập nhật cấu hình danh mục [${activeTabLabel}]`)

    setTimeout(() => {
      setIsSaving(false)
      toast({
        variant: "success",
        title: "Lưu cấu hình thành công",
        description: "Các thông số quản trị nền tảng đã được cập nhật và lưu vết lịch sử.",
      })
    }, 350)
  }

  // Trigger Instant Backup
  const handleCreateBackupNow = () => {
    setIsBackingUp(true)
    setTimeout(() => {
      const now = new Date().toLocaleString("vi-VN")
      setLastBackupTime(now)
      setBackupStatus("Thành công (dung lượng 254 MB)")
      localStorage.setItem("cfg_last_backup_time", now)
      localStorage.setItem("cfg_backup_status", "Thành công (dung lượng 254 MB)")
      setIsBackingUp(false)

      recordHistory("Sao lưu", "Khởi tạo bản sao lưu dữ liệu thủ công thành công (254 MB)")

      toast({
        variant: "success",
        title: "Sao lưu hoàn tất",
        description: `Bản sao lưu cơ sở dữ liệu đã được tạo lúc ${now}.`,
      })
    }, 1200)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <Sliders className="w-6 h-6 text-[#E03A14]" />
            <span>Cấu hình nền tảng</span>
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Thiết lập thông số vận hành dùng chung cho toàn bộ hệ thống SaaS
          </p>
        </div>

        <button
          onClick={handleRequestSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#E03A14] text-white font-medium text-sm hover:bg-[#c9320f] shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          <span>Lưu cấu hình</span>
        </button>
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-gray-200 scrollbar-none">
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === "general"
              ? "bg-[#E03A14] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Info className="w-4 h-4" />
          <span>Thông tin nền tảng</span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === "security"
              ? "bg-[#E03A14] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Shield className="w-4 h-4" />
          <span>Bảo mật</span>
        </button>

        <button
          onClick={() => setActiveTab("session")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === "session"
              ? "bg-[#E03A14] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <KeyRound className="w-4 h-4" />
          <span>Phiên đăng nhập</span>
        </button>

        <button
          onClick={() => setActiveTab("notifications")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === "notifications"
              ? "bg-[#E03A14] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Thông báo hệ thống</span>
        </button>

        <button
          onClick={() => setActiveTab("maintenance")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === "maintenance"
              ? "bg-[#E03A14] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>Bảo trì</span>
        </button>

        <button
          onClick={() => setActiveTab("backup")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === "backup"
              ? "bg-[#E03A14] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Sao lưu dữ liệu</span>
        </button>

        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors whitespace-nowrap cursor-pointer flex items-center gap-2 ${
            activeTab === "history"
              ? "bg-[#E03A14] text-white shadow-xs"
              : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
          }`}
        >
          <History className="w-4 h-4" />
          <span>Lịch sử thay đổi</span>
        </button>
      </div>

      {/* ----------------- TAB 1: THÔNG TIN NỀN TẢNG ----------------- */}
      {activeTab === "general" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Thông tin chung nền tảng</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Định danh và các kênh liên hệ hỗ trợ kỹ thuật của nền tảng SaaS
            </p>
          </div>

          {/* Logo upload */}
          <div className="flex items-center gap-5 p-4 rounded-xl bg-gray-50/70 border border-gray-100">
            <div className="w-16 h-16 rounded-2xl bg-[#E03A14] flex items-center justify-center text-white shadow-sm overflow-hidden shrink-0">
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Platform Logo"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-7 h-7 rotate-45 border-2 border-white bg-white/20" />
              )}
            </div>
            <div>
              <div className="text-sm font-semibold text-gray-900">Logo nền tảng</div>
              <p className="text-xs text-gray-500 mt-0.5">
                Định dạng PNG, JPG, SVG tối đa 2MB. Hiển thị ở thanh điều hướng và trang đăng nhập.
              </p>
              <label className="mt-2 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 shadow-2xs cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-gray-500" />
                <span>Tải ảnh mới</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Fields Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Tên nền tảng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Phiên bản hệ thống
              </label>
              <input
                type="text"
                value={systemVersion}
                onChange={(e) => setSystemVersion(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Tên miền chính (Domain)
              </label>
              <input
                type="text"
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Hotline hỗ trợ kỹ thuật
              </label>
              <input
                type="text"
                value={hotline}
                onChange={(e) => setHotline(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Email tiếp nhận yêu cầu hỗ trợ
              </label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 2: CẤU HÌNH BẢO MẬT ----------------- */}
      {activeTab === "security" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Cấu hình chính sách bảo mật</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Thiết lập quy tắc phòng thủ mật khẩu và bảo vệ tài khoản cho toàn hệ thống
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Số lần đăng nhập sai tối đa trước khi khóa
              </label>
              <input
                type="number"
                min={3}
                max={10}
                value={maxLoginAttempts}
                onChange={(e) => setMaxLoginAttempts(parseInt(e.target.value, 10) || 5)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Khuyến nghị: 5 lần nhằm chống tấn công vét cạn (brute-force).
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Thời gian khóa tạm thời (phút)
              </label>
              <input
                type="number"
                min={5}
                max={120}
                value={lockoutDurationMinutes}
                onChange={(e) => setLockoutDurationMinutes(parseInt(e.target.value, 10) || 15)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Tài khoản sẽ được tự động mở khóa sau số phút này.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Độ dài mật khẩu tối thiểu
              </label>
              <input
                type="number"
                min={6}
                max={32}
                value={minPasswordLength}
                onChange={(e) => setMinPasswordLength(parseInt(e.target.value, 10) || 8)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Áp dụng khi tạo mới hoặc đặt lại mật khẩu nhân sự.
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/70 border border-gray-100">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Yêu cầu mật khẩu phức tạp
                </div>
                <div className="text-xs text-gray-500">
                  Bắt buộc chứa chữ in hoa, chữ số và ít nhất một ký tự đặc biệt (@, #, $...)
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRequireSpecialChar(!requireSpecialChar)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  requireSpecialChar ? "bg-[#E03A14]" : "bg-gray-300"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    requireSpecialChar ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/70 border border-gray-100">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Bắt buộc xác thực hai yếu tố (2FA) cho Quản trị viên
                </div>
                <div className="text-xs text-gray-500">
                  Yêu cầu mã OTP qua ứng dụng Authenticator khi đăng nhập vai trò Quản trị
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEnforceAdmin2FA(!enforceAdmin2FA)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  enforceAdmin2FA ? "bg-[#E03A14]" : "bg-gray-300"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    enforceAdmin2FA ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 3: PHIÊN ĐĂNG NHẬP ----------------- */}
      {activeTab === "session" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Cấu hình thời hạn phiên đăng nhập (JWT)</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Kiểm soát vòng đời của Access Token và Refresh Token cho toàn bộ phiên làm việc
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Thời gian hết hạn Access Token (phút)
              </label>
              <input
                type="number"
                min={5}
                max={1440}
                value={accessTokenExpirationMin}
                onChange={(e) => setAccessTokenExpirationMin(parseInt(e.target.value, 10) || 60)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Thời gian tồn tại của mã xác thực ngắn hạn trong các yêu cầu API.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Thời gian hết hạn Refresh Token (ngày)
              </label>
              <input
                type="number"
                min={1}
                max={90}
                value={refreshTokenExpirationDays}
                onChange={(e) => setRefreshTokenExpirationDays(parseInt(e.target.value, 10) || 7)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
              <span className="text-[11px] text-gray-400 mt-1 block">
                Thời hạn tối đa phiên làm việc được duy trì trước khi buộc đăng nhập lại.
              </span>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/70 border border-gray-100">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Thu hồi phiên cũ khi đăng nhập thiết bị mới
                </div>
                <div className="text-xs text-gray-500">
                  Ngăn chặn sử dụng tài khoản đồng thời trên nhiều trình duyệt hoặc thiết bị lạ
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevokeOnNewDevice(!revokeOnNewDevice)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  revokeOnNewDevice ? "bg-[#E03A14]" : "bg-gray-300"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    revokeOnNewDevice ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/70 border border-gray-100">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Cho phép tính năng "Ghi nhớ đăng nhập"
                </div>
                <div className="text-xs text-gray-500">
                  Lưu lại thông tin định danh để tự động điền trong các lần truy cập tiếp theo
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAllowRememberMe(!allowRememberMe)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  allowRememberMe ? "bg-[#E03A14]" : "bg-gray-300"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    allowRememberMe ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 4: THÔNG BÁO HỆ THỐNG ----------------- */}
      {activeTab === "notifications" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Cấu hình thông báo toàn hệ thống</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Phát đi banner thông báo xuất hiện ở đầu trang của mọi nhà hàng trong nền tảng
            </p>
          </div>

          <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50/80 border border-gray-200">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Hiển thị Banner thông báo toàn hệ thống
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                Khi kích hoạt, thông báo sẽ hiển thị ngay cho nhân viên và quản lý các nhà hàng
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEnableBroadcastBanner(!enableBroadcastBanner)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                enableBroadcastBanner ? "bg-[#E03A14]" : "bg-gray-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  enableBroadcastBanner ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="md:col-span-1">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Mức độ thông báo
              </label>
              <select
                value={broadcastLevel}
                onChange={(e) => setBroadcastLevel(e.target.value as any)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14] cursor-pointer"
              >
                <option value="info">Thông tin (Xanh lam)</option>
                <option value="warning">Cảnh báo (Vàng cam)</option>
                <option value="urgent">Khẩn cấp (Đỏ)</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Tiêu đề thông báo
              </label>
              <input
                type="text"
                value={broadcastTitle}
                onChange={(e) => setBroadcastTitle(e.target.value)}
                placeholder="VD: Bảo trì hạ tầng ngày 15/11"
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>

            <div className="md:col-span-3">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Nội dung chi tiết thông báo
              </label>
              <textarea
                rows={3}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
          </div>

          {/* Live Preview */}
          <div className="pt-2">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider block mb-2">
              Xem trước hiển thị thực tế:
            </span>
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                broadcastLevel === "urgent"
                  ? "bg-red-50 border-red-200 text-red-800"
                  : broadcastLevel === "warning"
                  ? "bg-amber-50 border-amber-200 text-amber-800"
                  : "bg-blue-50 border-blue-200 text-blue-800"
              }`}
            >
              <Bell className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <div className="font-bold text-sm">{broadcastTitle || "Tiêu đề thông báo"}</div>
                <div className="text-xs mt-0.5 leading-relaxed">
                  {broadcastMessage || "Nội dung chi tiết thông báo phát toàn hệ thống."}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 5: BẢO TRÌ HỆ THỐNG ----------------- */}
      {activeTab === "maintenance" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div>
            <h2 className="font-bold text-gray-900 text-base text-red-600 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <span>Chế độ bảo trì hệ thống (Maintenance Mode)</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Tạm khóa truy cập người dùng để nâng cấp phần mềm, sửa lỗi hoặc di chuyển cơ sở dữ liệu
            </p>
          </div>

          {/* Maintenance Switch */}
          <div
            className={`p-4 rounded-xl border flex items-center justify-between transition-colors ${
              maintenanceMode
                ? "bg-red-50/80 border-red-200 text-red-900"
                : "bg-gray-50/80 border-gray-200 text-gray-900"
            }`}
          >
            <div>
              <div className="text-sm font-bold flex items-center gap-2">
                <span>Trạng thái chế độ bảo trì:</span>
                <span
                  className={`px-2 py-0.5 rounded text-xs uppercase font-extrabold ${
                    maintenanceMode ? "bg-red-600 text-white" : "bg-gray-200 text-gray-700"
                  }`}
                >
                  {maintenanceMode ? "ĐANG BẬT" : "ĐANG TẮT"}
                </span>
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {maintenanceMode
                  ? "⚠️ Hệ thống đang ở chế độ bảo trì. Tất cả màn hình người dùng sẽ hiển thị trang thông báo bảo trì."
                  : "Hệ thống đang hoạt động bình thường, phục vụ người dùng 24/7."}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMaintenanceMode(!maintenanceMode)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                maintenanceMode ? "bg-red-600" : "bg-gray-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  maintenanceMode ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Thời gian bắt đầu dự kiến
              </label>
              <input
                type="datetime-local"
                value={maintenanceStart}
                onChange={(e) => setMaintenanceStart(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Thời gian kết thúc dự kiến
              </label>
              <input
                type="datetime-local"
                value={maintenanceEnd}
                onChange={(e) => setMaintenanceEnd(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Thông điệp bảo trì hiển thị cho người dùng
              </label>
              <textarea
                rows={3}
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/70 border border-gray-100">
            <div>
              <div className="text-sm font-semibold text-gray-900">
                Cho phép Quản trị nền tảng (Super Admin) bypass bảo trì
              </div>
              <div className="text-xs text-gray-500">
                Tài khoản cấp Quản trị nền tảng vẫn đăng nhập và thao tác kỹ thuật bình thường
              </div>
            </div>
            <button
              type="button"
              onClick={() => setAllowSuperAdminBypass(!allowSuperAdminBypass)}
              className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                allowSuperAdminBypass ? "bg-[#E03A14]" : "bg-gray-300"
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                  allowSuperAdminBypass ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
          </div>
        </div>
      )}

      {/* ----------------- TAB 6: SAO LƯU DỮ LIỆU ----------------- */}
      {activeTab === "backup" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 text-base">Cấu hình sao lưu dữ liệu (Database Backup)</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Thiết lập tần suất và giám sát các điểm sao lưu dự phòng cho cơ sở dữ liệu
              </p>
            </div>
            <button
              onClick={handleCreateBackupNow}
              disabled={isBackingUp}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gray-900 text-white text-xs font-semibold hover:bg-black transition-colors cursor-pointer disabled:opacity-50"
            >
              {isBackingUp ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
              <span>Tạo bản sao lưu ngay</span>
            </button>
          </div>

          {/* Backup Summary Status Card */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
              <span className="text-xs text-gray-500 font-medium">Lần sao lưu gần nhất</span>
              <div className="text-base font-bold text-gray-900 mt-1">{lastBackupTime}</div>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
              <span className="text-xs text-gray-500 font-medium">Trạng thái bản sao lưu</span>
              <div className="text-base font-bold text-emerald-600 mt-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>{backupStatus}</span>
              </div>
            </div>
            <div className="p-4 rounded-xl border border-gray-200 bg-gray-50/50">
              <span className="text-xs text-gray-500 font-medium">Tải về bản dự phòng</span>
              <div className="mt-1">
                <button
                  type="button"
                  onClick={() =>
                    toast({
                      variant: "success",
                      title: "Tải bản sao lưu",
                      description: "Đang tải xuống file backup_restaurantservicedb.sql.gz...",
                    })
                  }
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#E03A14] hover:underline cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải bản gần nhất (.sql.gz)</span>
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                Tần suất sao lưu tự động
              </label>
              <select
                value={backupFrequency}
                onChange={(e) => setBackupFrequency(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14] cursor-pointer"
              >
                <option value="DAILY">Hàng ngày vào 02:00 sáng</option>
                <option value="TWICE_DAILY">Hai lần mỗi ngày (02:00 và 14:00)</option>
                <option value="WEEKLY">Hàng tuần vào Chủ nhật</option>
              </select>
            </div>

            <div className="flex items-center justify-between p-3.5 rounded-xl bg-gray-50/70 border border-gray-100 self-end">
              <div>
                <div className="text-sm font-semibold text-gray-900">
                  Bật sao lưu định kỳ tự động
                </div>
                <div className="text-xs text-gray-500">
                  Hệ thống tự động kích hoạt tiến trình sao lưu theo lịch
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoBackupEnabled(!autoBackupEnabled)}
                className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                  autoBackupEnabled ? "bg-[#E03A14]" : "bg-gray-300"
                }`}
              >
                <div
                  className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                    autoBackupEnabled ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------- TAB 7: LỊCH SỬ THAY ĐỔI CẤU HÌNH ----------------- */}
      {activeTab === "history" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-bold text-gray-900 text-base">Lịch sử thay đổi cấu hình</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Theo dõi nhật ký các lần cập nhật thông số kỹ thuật và bảo mật của nền tảng
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-gray-100 text-gray-600">
              {historyItems.length} bản ghi
            </span>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-100 rounded-xl overflow-hidden">
            {historyItems.map((item) => (
              <div
                key={item.id}
                className="p-4 hover:bg-gray-50/70 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-sm"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-gray-100 text-gray-700">
                      {item.category}
                    </span>
                    <span className="font-semibold text-gray-900">{item.changedBy}</span>
                  </div>
                  <div className="text-gray-600 text-xs">{item.summary}</div>
                </div>
                <div className="text-xs text-gray-400 font-medium shrink-0">
                  {item.timestamp}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ----------------- CONFIRMATION DIALOG CHO THAY ĐỔI QUAN TRỌNG ----------------- */}
      <Dialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              <span>Xác nhận thay đổi cấu hình quan trọng</span>
            </DialogTitle>
            <DialogDescription className="text-gray-600 pt-2 text-sm leading-relaxed">
              {pendingChangesSummary}
            </DialogDescription>
          </DialogHeader>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 my-2">
            Hành động này sẽ tác động tức thì tới người dùng và nhân sự của tất cả các nhà hàng
            trên toàn bộ nền tảng SaaS. Bạn có chắc chắn muốn áp dụng thay đổi này không?
          </div>

          <DialogFooter className="mt-4 pt-2">
            <button
              type="button"
              onClick={() => setIsConfirmOpen(false)}
              className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 cursor-pointer"
            >
              Hủy bỏ
            </button>
            <button
              type="button"
              onClick={executeSaveConfig}
              className="px-4 py-2 rounded-xl text-sm font-medium bg-red-600 text-white hover:bg-red-700 cursor-pointer shadow-sm"
            >
              Xác nhận lưu thay đổi
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

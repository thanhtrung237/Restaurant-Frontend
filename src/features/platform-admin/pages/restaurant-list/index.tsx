import React, { useState, useMemo } from "react"
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
  Loader2,
  Search,
  Edit2,
  User,
  KeyRound,
  Mail,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  GitBranch,
} from "lucide-react"

/** Bản đồ ánh xạ Windows-1252 / ISO-8859-1 sang UTF-8 để sửa lỗi font tiếng Việt trong DB cũ */
const WINDOWS_1252_MAP: Record<number, number> = {
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
}

function cleanText(str?: string | null): string {
  if (!str) return ""
  if (/(?:Ã|á»|áº|Ä|Â|É|È|á|»|‡|‘|…)/.test(str)) {
    try {
      const bytes: number[] = []
      for (let i = 0; i < str.length; i++) {
        const code = str.charCodeAt(i)
        if (WINDOWS_1252_MAP[code]) {
          bytes.push(WINDOWS_1252_MAP[code])
        } else if (code <= 255) {
          bytes.push(code)
        } else {
          return str
        }
      }
      const decoded = new TextDecoder("utf-8").decode(new Uint8Array(bytes))
      if (decoded && !decoded.includes("\ufffd")) {
        return decoded
      }
    } catch {
      return str
    }
  }
  return str
}
import {
  useRestaurantsPage,
  useBranchesByRestaurant,
  useCreateRestaurant,
  useUpdateRestaurant,
  useChangeRestaurantStatus,
  useDeleteRestaurant,
  useCreateAccount,
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

function RestaurantBranchCell({ restaurant }: { restaurant: RestaurantListItem }) {
  const needsFetch =
    restaurant.branchCount === undefined ||
    restaurant.branchCount === null ||
    restaurant.branchCount === 0

  const { data: branches } = useBranchesByRestaurant(needsFetch ? restaurant.id : undefined)

  const count =
    restaurant.branchCount && restaurant.branchCount > 0
      ? restaurant.branchCount
      : branches && branches.length > 0
      ? branches.length
      : restaurant.branchCount ?? 0

  const isChain = count >= 2

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
        isChain
          ? "bg-indigo-50 text-indigo-700 border border-indigo-200"
          : "bg-gray-100 text-gray-700"
      }`}
    >
      <GitBranch className="w-3.5 h-3.5" />
      <span>{count} chi nhánh</span>
    </span>
  )
}

export default function RestaurantListPage() {
  const navigate = useNavigate()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "INACTIVE">("ALL")
  const [currentPage, setCurrentPage] = useState(1)
  const pageSize = 8

  // ---- State form Tạo nhà hàng (2 bước) ----
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [createStep, setCreateStep] = useState<1 | 2>(1) // Bước 1: Thông tin NH, Bước 2: Tài khoản chủ
  const [createForm, setCreateForm] = useState({
    // Bước 1 - Thông tin nhà hàng
    name: "",
    code: "",
    taxCode: "",
    phone: "",
    address: "",
    logoUrl: "",
    // Bước 2 - Tài khoản chủ nhà hàng
    ownerFullName: "",
    ownerUsername: "",
    ownerEmail: "",
    ownerPassword: "",
    ownerPasswordConfirm: "",
    skipOwner: false, // Tùy chọn bỏ qua bước tạo tài khoản
  })

  const [isEditOpen, setIsEditOpen] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
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
  const createAccountMutation = useCreateAccount()
  const updateMutation = useUpdateRestaurant()
  const statusMutation = useChangeRestaurantStatus()
  const deleteMutation = useDeleteRestaurant()

  const restaurants: RestaurantListItem[] = pageData?.content || []

  // Counts
  const activeCount = useMemo(
    () => restaurants.filter((r) => r.status === "ACTIVE").length,
    [restaurants]
  )
  const inactiveCount = useMemo(
    () => restaurants.filter((r) => r.status === "INACTIVE").length,
    [restaurants]
  )

  // Filter local by search & status + clean text
  const filteredRestaurants = useMemo(() => {
    return restaurants.filter((r) => {
      const cleanedName = cleanText(r.name).toLowerCase()
      const code = (r.code || "").toLowerCase()
      const search = searchTerm.toLowerCase().trim()
      const matchSearch = cleanedName.includes(search) || code.includes(search)
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter
      return matchSearch && matchStatus
    })
  }, [restaurants, searchTerm, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredRestaurants.length / pageSize))
  const paginatedRestaurants = useMemo(() => {
    const start = (currentPage - 1) * pageSize
    return filteredRestaurants.slice(start, start + pageSize)
  }, [filteredRestaurants, currentPage, pageSize])

  const resetCreateForm = () => {
    setCreateForm({
      name: "",
      code: "",
      taxCode: "",
      phone: "",
      address: "",
      logoUrl: "",
      ownerFullName: "",
      ownerUsername: "",
      ownerEmail: "",
      ownerPassword: "",
      ownerPasswordConfirm: "",
      skipOwner: false,
    })
    setCreateStep(1)
  }

  // Bước 1 → Bước 2: validate thông tin nhà hàng
  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault()
    if (!createForm.name.trim()) {
      toast({ variant: "danger", title: "Lỗi", description: "Tên nhà hàng không được để trống." })
      return
    }
    if (!createForm.code.trim()) {
      toast({ variant: "danger", title: "Lỗi", description: "Mã nhà hàng không được để trống." })
      return
    }
    if (!/^[A-Z0-9]+$/.test(createForm.code.toUpperCase().trim())) {
      toast({ variant: "danger", title: "Mã không hợp lệ", description: "Mã nhà hàng chỉ được chứa chữ in hoa và số (không dấu, không dấu cách)." })
      return
    }
    setCreateStep(2)
  }

  // Bước 2 → Submit: Tạo nhà hàng rồi tạo tài khoản chủ
  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validate bước 2 (nếu không bỏ qua)
    if (!createForm.skipOwner) {
      if (!createForm.ownerFullName.trim()) {
        toast({ variant: "danger", title: "Lỗi", description: "Họ tên chủ nhà hàng không được để trống." })
        return
      }
      if (!createForm.ownerUsername.trim()) {
        toast({ variant: "danger", title: "Lỗi", description: "Tên đăng nhập không được để trống." })
        return
      }
      if (!createForm.ownerPassword || createForm.ownerPassword.length < 8) {
        toast({ variant: "danger", title: "Mật khẩu quá ngắn", description: "Mật khẩu phải có ít nhất 8 ký tự." })
        return
      }
      if (createForm.ownerPassword !== createForm.ownerPasswordConfirm) {
        toast({ variant: "danger", title: "Mật khẩu không khớp", description: "Xác nhận mật khẩu không khớp với mật khẩu đã nhập." })
        return
      }
    }

    try {
      // Bước A: Tạo nhà hàng
      const newRestaurant = await createMutation.mutateAsync({
        code: createForm.code.toUpperCase().trim(),
        name: createForm.name.trim(),
        taxCode: createForm.taxCode?.trim() || undefined,
        phone: createForm.phone?.trim() || undefined,
        address: createForm.address?.trim() || undefined,
        logoUrl: createForm.logoUrl?.trim() || undefined,
      })

      // Bước B: Tạo tài khoản chủ nhà hàng (nếu không bỏ qua)
      if (!createForm.skipOwner && newRestaurant?.id) {
        try {
          await createAccountMutation.mutateAsync({
            restaurantId: newRestaurant.id,
            fullName: createForm.ownerFullName.trim(),
            username: createForm.ownerUsername.trim(),
            email: createForm.ownerEmail?.trim() || undefined,
            password: createForm.ownerPassword,
          })
          toast({
            variant: "success",
            title: "Tạo nhà hàng thành công!",
            description: `Đã tạo nhà hàng "${createForm.name}" và tài khoản chủ "${createForm.ownerUsername}" thành công.`,
          })
        } catch (accErr: unknown) {
          const error = accErr as { response?: { data?: { message?: string } } }
          // Nhà hàng đã tạo thành công, chỉ có tài khoản bị lỗi
          toast({
            variant: "danger",
            title: "Nhà hàng đã tạo — Tài khoản chủ chưa tạo được",
            description: error.response?.data?.message || "Nhà hàng đã được tạo nhưng tài khoản chủ bị lỗi. Vui lòng vào trang chi tiết nhà hàng để tạo tài khoản sau.",
          })
        }
      } else {
        toast({
          variant: "success",
          title: "Tạo nhà hàng thành công!",
          description: `Nhà hàng "${createForm.name}" đã được tạo. Hãy vào Chi tiết để thêm tài khoản chủ sau.`,
        })
      }

      setIsCreateOpen(false)
      resetCreateForm()
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

  const handleOpenEdit = (restaurant: RestaurantListItem) => {
    setEditingId(restaurant.id)
    setEditForm({
      name: restaurant.name || "",
      code: restaurant.code || "",
      taxCode: restaurant.taxCode || "",
      phone: restaurant.phone || "",
      address: restaurant.address || "",
    })
    setIsEditOpen(true)
  }

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingId || !editForm.name) {
      toast({
        variant: "danger",
        title: "Lỗi",
        description: "Vui lòng nhập tên nhà hàng.",
      })
      return
    }

    try {
      await updateMutation.mutateAsync({
        id: editingId,
        body: {
          name: editForm.name.trim(),
          taxCode: editForm.taxCode?.trim() || undefined,
          phone: editForm.phone?.trim() || undefined,
          address: editForm.address?.trim() || undefined,
        },
      })
      toast({
        variant: "success",
        title: "Thành công",
        description: `Đã cập nhật thông tin nhà hàng "${editForm.name}" thành công!`,
      })
      setIsEditOpen(false)
      refetch()
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } }
      toast({
        variant: "danger",
        title: "Cập nhật thất bại",
        description: error.response?.data?.message || "Đã xảy ra lỗi khi cập nhật.",
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
          <span>Tạo nhà hàng</span>
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

      {/* Filter / Search Bar & Status Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Tìm theo tên hoặc mã nhà hàng..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value)
              setCurrentPage(1)
            }}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-gray-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
          />
        </div>

        {/* Status Filter Tabs */}
        <div className="inline-flex p-1 bg-gray-100 rounded-xl text-xs font-medium self-start sm:self-auto">
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ALL")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "ALL"
                ? "bg-white text-gray-900 font-semibold shadow-2xs"
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            Tất cả ({restaurants.length})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("ACTIVE")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "ACTIVE"
                ? "bg-white text-emerald-700 font-semibold shadow-2xs"
                : "text-gray-500 hover:text-emerald-700"
            }`}
          >
            Đang hoạt động ({activeCount})
          </button>
          <button
            type="button"
            onClick={() => {
              setStatusFilter("INACTIVE")
              setCurrentPage(1)
            }}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              statusFilter === "INACTIVE"
                ? "bg-white text-rose-700 font-semibold shadow-2xs"
                : "text-gray-500 hover:text-rose-700"
            }`}
          >
            Tạm ngưng ({inactiveCount})
          </button>
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
                {paginatedRestaurants.map((restaurant) => {
                  const cleanedName = cleanText(restaurant.name) || "Chưa đặt tên"
                  const initial = cleanedName.charAt(0).toUpperCase() || "N"
                  const isActive = restaurant.status === "ACTIVE"

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
                              {cleanedName}
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
                        {restaurant.taxCode || "—"}
                      </td>

                      {/* Branch Count */}
                      <td className="py-4 px-6">
                        <RestaurantBranchCell restaurant={restaurant} />
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
                              onClick={() => handleOpenEdit(restaurant)}
                              className="cursor-pointer text-blue-600 focus:text-blue-700"
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Sửa thông tin
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

            {/* Pagination footer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-t border-gray-200 bg-gray-50/50 text-xs text-gray-500">
              <div>
                Hiển thị <strong>{filteredRestaurants.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong> - <strong>{Math.min(currentPage * pageSize, filteredRestaurants.length)}</strong> trên tổng số <strong>{filteredRestaurants.length}</strong> nhà hàng
              </div>

              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="font-semibold px-2 text-gray-700">
                    Trang {currentPage} / {totalPages}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal Tạo nhà hàng mới — 2 bước */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          setIsCreateOpen(open)
          if (!open) resetCreateForm()
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Tạo nhà hàng mới</span>
              <span className="text-xs font-normal text-gray-400 ml-2">
                Bước {createStep}/2
              </span>
            </DialogTitle>
            {/* Step indicator */}
            <div className="flex items-center gap-2 mt-3">
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${createStep === 1 ? "bg-[#E03A14] text-white" : "bg-emerald-100 text-emerald-700"}`}>
                {createStep > 1 ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Store className="w-3.5 h-3.5" />}
                Thông tin nhà hàng
              </div>
              <div className="h-px flex-1 bg-gray-200" />
              <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full transition-colors ${createStep === 2 ? "bg-[#E03A14] text-white" : "bg-gray-100 text-gray-400"}`}>
                <User className="w-3.5 h-3.5" />
                Tài khoản chủ
              </div>
            </div>
          </DialogHeader>

          {/* ===== BƯỚC 1: Thông tin nhà hàng ===== */}
          {createStep === 1 && (
            <form onSubmit={handleStep1Next} className="space-y-4 py-2">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Tên nhà hàng <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  autoFocus
                  placeholder="VD: Phở Việt"
                  value={createForm.name}
                  onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Mã nhà hàng <span className="text-red-500">*</span>
                  <span className="text-gray-400 font-normal ml-1">(chữ in hoa và số, không dấu cách)</span>
                </label>
                <input
                  type="text"
                  placeholder="VD: PHOVIET"
                  value={createForm.code}
                  onChange={(e) =>
                    setCreateForm({ ...createForm, code: e.target.value.toUpperCase().replace(/\s/g, "") })
                  }
                  className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
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
                  onClick={() => { setIsCreateOpen(false); resetCreateForm() }}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[#E03A14] text-white hover:bg-[#c9320f] transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  Tiếp theo
                  <ChevronRight className="w-4 h-4" />
                </button>
              </DialogFooter>
            </form>
          )}

          {/* ===== BƯỚC 2: Tài khoản chủ nhà hàng ===== */}
          {createStep === 2 && (
            <form onSubmit={handleCreate} className="space-y-4 py-2">
              {/* Summary box */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-200">
                <div className="w-9 h-9 rounded-lg bg-orange-100 text-[#E03A14] font-bold text-base flex items-center justify-center shrink-0">
                  {createForm.name.charAt(0).toUpperCase() || "N"}
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-900">{createForm.name}</div>
                  <div className="text-xs text-gray-400 font-mono">{createForm.code}</div>
                </div>
              </div>

              {!createForm.skipOwner && (
                <>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      <User className="w-3.5 h-3.5 inline mr-1" />
                      Họ tên chủ nhà hàng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="VD: Nguyễn Văn A"
                      value={createForm.ownerFullName}
                      onChange={(e) => setCreateForm({ ...createForm, ownerFullName: e.target.value })}
                      className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Tên đăng nhập <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="VD: admin_phoviet"
                        value={createForm.ownerUsername}
                        onChange={(e) => setCreateForm({ ...createForm, ownerUsername: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        <Mail className="w-3.5 h-3.5 inline mr-1" />
                        Email
                      </label>
                      <input
                        type="email"
                        placeholder="VD: owner@example.com"
                        value={createForm.ownerEmail}
                        onChange={(e) => setCreateForm({ ...createForm, ownerEmail: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        <KeyRound className="w-3.5 h-3.5 inline mr-1" />
                        Mật khẩu <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Tối thiểu 8 ký tự"
                        value={createForm.ownerPassword}
                        onChange={(e) => setCreateForm({ ...createForm, ownerPassword: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-700 mb-1">
                        Xác nhận mật khẩu <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="password"
                        placeholder="Nhập lại mật khẩu"
                        value={createForm.ownerPasswordConfirm}
                        onChange={(e) => setCreateForm({ ...createForm, ownerPasswordConfirm: e.target.value })}
                        className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
                      />
                    </div>
                  </div>
                </>
              )}

              {/* Skip owner checkbox */}
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <input
                  type="checkbox"
                  checked={createForm.skipOwner}
                  onChange={(e) => setCreateForm({ ...createForm, skipOwner: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 accent-[#E03A14] cursor-pointer"
                />
                <span className="text-xs text-gray-600 group-hover:text-gray-900 transition-colors">
                  Bỏ qua — tạo tài khoản chủ sau (vào trang chi tiết nhà hàng)
                </span>
              </label>

              <DialogFooter className="mt-6 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateStep(1)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer inline-flex items-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Quay lại
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || createAccountMutation.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[#E03A14] text-white hover:bg-[#c9320f] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
                >
                  {(createMutation.isPending || createAccountMutation.isPending) && (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  )}
                  Tạo nhà hàng
                </button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal Sửa nhà hàng */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Sửa thông tin nhà hàng</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4 py-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tên nhà hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="VD: Phở Việt"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Mã nhà hàng (Không thể sửa theo FR-TEN-01)
              </label>
              <input
                type="text"
                disabled
                value={editForm.code}
                className="w-full px-3.5 py-2 text-sm font-mono rounded-xl border border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mã số thuế</label>
              <input
                type="text"
                placeholder="VD: 0109823456"
                value={editForm.taxCode}
                onChange={(e) => setEditForm({ ...editForm, taxCode: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Số điện thoại</label>
              <input
                type="text"
                placeholder="VD: 0901234567"
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Địa chỉ trụ sở</label>
              <input
                type="text"
                placeholder="VD: 123 Lê Lợi, Q.1, TP.HCM"
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#E03A14]/20 focus:border-[#E03A14]"
              />
            </div>

            <DialogFooter className="mt-6 pt-2">
              <button
                type="button"
                onClick={() => setIsEditOpen(false)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={updateMutation.isPending}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-[#E03A14] text-white hover:bg-[#c9320f] transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
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

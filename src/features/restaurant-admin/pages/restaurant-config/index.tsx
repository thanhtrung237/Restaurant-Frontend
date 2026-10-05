import * as React from "react"
import { Button } from "@/components/ui/button"
import { StickyActionBar } from "@/components/layout/StickyActionBar"
import { useToast } from "@/hooks/use-toast"
import { PageHeader } from "@/components/layout/PageHeader"
import { getErrorMessage } from "@/lib/http"
import { useAuthStore } from "@/stores/auth.store"
import { useRestaurant, useUpdateRestaurant } from "@/api/restaurants.api"
import { RestaurantConfigTab } from "./components/RestaurantConfigTab"
import type { RestaurantInfoConfig } from "./types"

const EMPTY_INFO: RestaurantInfoConfig = {
  restaurantName: "",
  taxCode: "",
  address: "",
  phone: "",
  logoUrl: "",
}

/**
 * Cấu hình nhà hàng — Quản trị nhà hàng (FR-ADM-03).
 *
 * CHỈ cấp NHÀ HÀNG: tên, mã số thuế, địa chỉ, điện thoại, logo — cả năm đều in lên hoá đơn.
 * Cấu hình RIÊNG của một chi nhánh nằm ở hai trang khác: "Cấu hình chi nhánh" (nhóm 1) và
 * "Thuế & phí chi nhánh" (nhóm 2, FR-BRN-02).
 *
 * Bản trước của trang này chạy hoàn toàn bằng dữ liệu giả và nút "Lưu" chỉ `setTimeout` rồi
 * báo thành công — người dùng đổi mã số thuế xong tưởng đã lưu, F5 là mất. Nay mọi ô đọc/ghi
 * thẳng `GET/PUT /restaurants/{id}`, lỗi thì báo lỗi và **giữ nguyên dữ liệu đang nhập**.
 */
export default function RestaurantConfigPage() {
  const { toast } = useToast()
  const restaurantId = useAuthStore((s) => s.account?.restaurantId)

  const { data: restaurant, isLoading, isError, error } = useRestaurant(restaurantId)
  const updateRestaurant = useUpdateRestaurant()

  const [info, setInfo] = React.useState<RestaurantInfoConfig>(EMPTY_INFO)

  // Đổ dữ liệu thật vào form khi tải xong. Không trộn dữ liệu mẫu: thiếu trường nào thì để
  // trống, chứ không mượn số của nhà hàng khác như trang chi tiết chi nhánh từng làm.
  React.useEffect(() => {
    if (!restaurant) return
    setInfo({
      restaurantName: restaurant.name ?? "",
      taxCode: restaurant.taxCode ?? "",
      address: restaurant.address ?? "",
      phone: restaurant.phone ?? "",
      logoUrl: restaurant.logoUrl ?? "",
    })
  }, [restaurant])

  const savedLogoUrl = restaurant?.logoUrl ?? ""
  const savedTaxCode = restaurant?.taxCode ?? ""
  const saving = updateRestaurant.isPending

  async function handleSave() {
    if (!restaurantId) return
    if (!info.restaurantName.trim()) {
      toast({
        title: "Thiếu tên nhà hàng",
        description: "Tên nhà hàng được in lên hoá đơn nên không được để trống.",
        variant: "danger",
      })
      return
    }

    try {
      await updateRestaurant.mutateAsync({
        id: restaurantId,
        body: {
          name: info.restaurantName.trim(),
          taxCode: info.taxCode.trim(),
          address: info.address.trim(),
          phone: info.phone.trim(),
          logoUrl: info.logoUrl.trim(),
        },
      })
      toast({
        title: "Đã lưu cấu hình",
        description: "Thông tin nhà hàng đã được cập nhật.",
        variant: "success",
      })
    } catch (err) {
      // KHÔNG đụng vào `info`: người dùng giữ nguyên những gì vừa nhập để sửa rồi lưu lại.
      toast({
        title: "Không lưu được cấu hình",
        description: getErrorMessage(err),
        variant: "danger",
      })
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      {/* Figma KHÔNG đặt nút "Lưu" trên thanh tiêu đề — nó nằm cuối vùng nội dung */}
      <PageHeader
        title="Cấu hình"
        subtitle="Cấp nhà hàng: thông tin doanh nghiệp in lên hoá đơn"
        mobileSubtitle="Cấp nhà hàng"
      />

      <div className="flex flex-col gap-6 p-6 lg:p-8">
        {isLoading ? (
          <p className="text-sm text-text-tertiary">Đang tải cấu hình nhà hàng...</p>
        ) : isError || !restaurant ? (
          <div className="rounded-card border border-border-default bg-surface-card p-6">
            <p className="text-sm font-semibold text-text-primary">
              Không tải được cấu hình nhà hàng
            </p>
            <p className="mt-1 text-sm text-text-tertiary">{getErrorMessage(error)}</p>
          </div>
        ) : (
          <>
            <RestaurantConfigTab
              info={info}
              onInfoChange={setInfo}
              savedLogoUrl={savedLogoUrl}
              savedTaxCode={savedTaxCode}
              disabled={saving}
            />

            {/* md+: nút lưu cuối nội dung, căn phải (Figma "Cấu hình · Chi nhánh") */}
            <div className="hidden justify-end md:flex">
              <Button
                type="button"
                className="h-11 px-6 font-semibold"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu cấu hình"}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* "Lưu cấu hình" là chức năng đặc tả yêu cầu (FR-ADM-03) nên không bỏ ở <md —
          chuyển xuống thanh thao tác cố định đáy màn hình. */}
      <StickyActionBar>
        <Button
          type="button"
          className="h-11 w-full font-semibold"
          onClick={handleSave}
          disabled={saving || isLoading || isError}
        >
          {saving ? "Đang lưu..." : "Lưu cấu hình"}
        </Button>
      </StickyActionBar>
    </div>
  )
}

import * as React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronLeft, Search, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { QuantityStepper } from "@/components/common/QuantityStepper";
import { useToast } from "@/hooks/use-toast";
import { useAuthStore } from "@/stores/auth.store";
import { cn } from "@/lib/utils";
import { useTableSession, useBranchMenu, useCreateOrder } from "@/features/shared/floor-ops/api";
import type { BranchMenuItem } from "@/types/models";
import type { OrderDetailAddRequest } from "@/types/requests";

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

const ALL_CATEGORY_ID = "all";

interface SelectedLine {
  dishId: number;
  dishName: string;
  unitPrice: number;
  quantity: number;
  note: string;
}

/**
 * Thêm món vào bàn — dùng chung Phục vụ / QL chi nhánh / Quản trị NH
 * Nguồn: nút "+ Thêm món vào bàn" ở màn Order chi tiết (@/features/shared/floor-ops/order-detail)
 *
 * API:
 *  - GET /table-sessions/{id}       → lấy branchId + tên bàn để load đúng menu chi nhánh
 *  - GET /branches/{branchId}/menu  → danh sách món (đã resolve giá đè + trạng thái còn/hết)
 *  - POST /orders                   → tạo 1 lượt gọi món mới { tableSessionId, items[], orderedById }
 *    (giống hệt cơ chế "Lượt 1, Lượt 2..." mà khách tự gọi qua QR — chỉ khác `orderedById`
 *    được set = tài khoản nhân viên đang thao tác)
 *
 * Nhân viên chỉ chọn món + số lượng + ghi chú, KHÔNG có bước chọn option/topping như khách vì
 * `OrderDetailAddRequest` hiện tại chưa hỗ trợ field option đã chọn (xem TODO tương tự ở
 * customer/pages/cart — đây là giới hạn chung của BE, không phải riêng màn này).
 */
export default function AddDishPage() {
  const navigate = useNavigate();
  const { orderId } = useParams<{ orderId: string }>(); // Thực chất là tableSessionId
  const { toast } = useToast();
  const account = useAuthStore((s) => s.account);

  const tableSessionId = orderId ? Number.parseInt(orderId, 10) : undefined;

  const { data: session } = useTableSession(tableSessionId);
  const branchId = session?.branchId;

  const {
    data: menuItems = [],
    isLoading: menuLoading,
    error: menuError,
  } = useBranchMenu(branchId);

  const createOrderMutation = useCreateOrder();

  const [searchText, setSearchText] = React.useState("");
  const [activeCategoryId, setActiveCategoryId] = React.useState<string>(ALL_CATEGORY_ID);
  const [selected, setSelected] = React.useState<Map<number, SelectedLine>>(new Map());

  // Chỉ hiển thị món chưa bị ẩn ở chi nhánh này
  const visibleItems = React.useMemo(
    () => menuItems.filter((item) => !item.isHidden),
    [menuItems]
  );

  // Tab danh mục suy ra trực tiếp từ dữ liệu món thật, giống MenuPage của khách
  const categoryTabs = React.useMemo(() => {
    const seen = new Map<number, string>();
    visibleItems.forEach((item) => {
      if (!seen.has(item.categoryId)) {
        seen.set(item.categoryId, item.categoryName || `Danh mục ${item.categoryId}`);
      }
    });
    return [
      { id: ALL_CATEGORY_ID, label: "Tất cả" },
      ...Array.from(seen.entries()).map(([id, label]) => ({ id: String(id), label })),
    ];
  }, [visibleItems]);

  const filteredItems = React.useMemo(() => {
    let filtered = visibleItems;

    if (activeCategoryId !== ALL_CATEGORY_ID) {
      filtered = filtered.filter((d) => String(d.categoryId) === activeCategoryId);
    }

    if (searchText.trim()) {
      const q = searchText.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.dishName.toLowerCase().includes(q) ||
          d.description?.toLowerCase().includes(q)
      );
    }

    return filtered;
  }, [visibleItems, activeCategoryId, searchText]);

  function addDish(dish: BranchMenuItem) {
    setSelected((prev) => {
      const next = new Map(prev);
      const existing = next.get(dish.dishId);
      if (existing) {
        next.set(dish.dishId, { ...existing, quantity: existing.quantity + 1 });
      } else {
        next.set(dish.dishId, {
          dishId: dish.dishId,
          dishName: dish.dishName,
          unitPrice: dish.effectivePrice,
          quantity: 1,
          note: "",
        });
      }
      return next;
    });
  }

  function updateQuantity(dishId: number, quantity: number) {
    setSelected((prev) => {
      const next = new Map(prev);
      const line = next.get(dishId);
      if (!line) return prev;
      next.set(dishId, { ...line, quantity });
      return next;
    });
  }

  function updateNote(dishId: number, note: string) {
    setSelected((prev) => {
      const next = new Map(prev);
      const line = next.get(dishId);
      if (!line) return prev;
      next.set(dishId, { ...line, note });
      return next;
    });
  }

  function removeLine(dishId: number) {
    setSelected((prev) => {
      const next = new Map(prev);
      next.delete(dishId);
      return next;
    });
  }

  const selectedLines = Array.from(selected.values());
  const totalQuantity = selectedLines.reduce((sum, l) => sum + l.quantity, 0);
  const totalAmount = selectedLines.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

  async function handleConfirm() {
    if (!tableSessionId || selectedLines.length === 0) return;

    const items: OrderDetailAddRequest[] = selectedLines.map((line) => ({
      dishId: line.dishId,
      quantity: line.quantity,
      note: line.note.trim() || undefined,
    }));

    try {
      await createOrderMutation.mutateAsync({
        tableSessionId,
        items,
        orderedById: account?.id,
      });
      toast({
        title: "Đã thêm món vào bàn",
        description: `${totalQuantity} món · ${formatVnd(totalAmount)}`,
        variant: "success",
      });
      navigate(-1);
    } catch (error) {
      toast({
        title: "Không thể thêm món",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "danger",
      });
    }
  }

  const tableName = session?.tableName || `Bàn #${tableSessionId}`;

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page">
      {/* ============================================================
          1. HEADER
          ============================================================ */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border-default/60 bg-surface-card px-6 py-4 sm:px-8">
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="mb-1 inline-flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
          >
            <ChevronLeft className="size-3.5" /> Về Order chi tiết
          </button>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Thêm món vào bàn — {tableName}
          </h1>
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-6 p-6 sm:p-8 lg:flex-row items-start">
        {/* ============================================================
            2. CỘT TRÁI: DANH SÁCH MÓN (menu chi nhánh)
            ============================================================ */}
        <div className="flex-1 w-full rounded-2xl border border-border-default/60 bg-surface-card p-6 shadow-xs">
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-text-tertiary" />
            <Input
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder="Tìm món trong thực đơn..."
              className="pl-10"
            />
          </div>

          <div className="mt-4 flex gap-2.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categoryTabs.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setActiveCategoryId(c.id)}
                className={cn(
                  "h-9 shrink-0 rounded-full px-4 text-sm transition-all whitespace-nowrap",
                  c.id === activeCategoryId
                    ? "bg-brand-primary font-bold text-white"
                    : "border border-border-default bg-surface-card font-medium text-text-secondary hover:border-border-strong"
                )}
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="mt-5">
            {menuLoading ? (
              <p className="py-8 text-center text-text-tertiary">Đang tải thực đơn...</p>
            ) : menuError ? (
              <p className="py-8 text-center text-status-danger">
                Không thể tải thực đơn. Vui lòng thử lại.
              </p>
            ) : filteredItems.length === 0 ? (
              <p className="py-8 text-center text-text-tertiary">Không tìm thấy món phù hợp.</p>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredItems.map((dish) => {
                  const outOfStock = dish.stockStatus === "OUT_OF_STOCK";
                  const inCart = selected.get(dish.dishId);
                  return (
                    <button
                      key={dish.dishId}
                      type="button"
                      disabled={outOfStock}
                      onClick={() => addDish(dish)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors cursor-pointer",
                        outOfStock
                          ? "cursor-not-allowed border-border-default/60 bg-surface-muted/50 opacity-60"
                          : inCart
                            ? "border-brand-primary bg-brand-primary-subtle"
                            : "border-border-default bg-surface-card hover:border-border-strong"
                      )}
                    >
                      <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-muted text-xl">
                        {dish.imageUrl ? (
                          <img
                            src={dish.imageUrl}
                            alt={dish.dishName}
                            className="size-full object-cover"
                          />
                        ) : (
                          "🍽️"
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-text-primary">
                          {dish.dishName}
                        </p>
                        <p className="mt-0.5 text-sm font-semibold text-brand-primary">
                          {formatVnd(dish.effectivePrice)}
                        </p>
                        {outOfStock ? (
                          <p className="mt-0.5 text-xs font-medium text-status-danger">Hết hàng</p>
                        ) : inCart ? (
                          <p className="mt-0.5 text-xs font-medium text-brand-primary">
                            Đã chọn x{inCart.quantity}
                          </p>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ============================================================
            3. CỘT PHẢI: GIỎ TẠM + XÁC NHẬN
            ============================================================ */}
        <div className="w-full shrink-0 lg:w-[380px]">
          <div className="sticky top-6 flex flex-col rounded-2xl border border-border-default/60 bg-surface-card p-6 shadow-xs">
            <p className="flex items-center gap-2 text-sm font-bold text-text-primary">
              <ShoppingCart className="size-4" />
              Món sẽ thêm ({totalQuantity})
            </p>

            {selectedLines.length === 0 ? (
              <p className="mt-6 text-center text-sm text-text-tertiary">
                Chọn món từ danh sách bên trái để thêm vào bàn.
              </p>
            ) : (
              <div className="mt-4 max-h-[50vh] space-y-3 overflow-y-auto pr-1">
                {selectedLines.map((line) => (
                  <div key={line.dishId} className="rounded-lg border border-border-default/60 p-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-semibold text-text-primary">{line.dishName}</p>
                      <button
                        type="button"
                        onClick={() => removeLine(line.dishId)}
                        aria-label="Bỏ món"
                        className="shrink-0 text-text-tertiary hover:text-status-danger transition-colors cursor-pointer"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <QuantityStepper
                        value={line.quantity}
                        onChange={(q) => updateQuantity(line.dishId, q)}
                        variant="simple"
                      />
                      <span className="text-sm font-bold text-text-primary">
                        {formatVnd(line.unitPrice * line.quantity)}
                      </span>
                    </div>
                    <input
                      value={line.note}
                      onChange={(e) => updateNote(line.dishId, e.target.value)}
                      placeholder="Ghi chú (vd: ít cay)..."
                      className="mt-2 w-full rounded-md border border-border-default bg-surface-page px-2.5 py-1.5 text-xs text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-primary"
                    />
                  </div>
                ))}
              </div>
            )}

            <div className="mt-5 flex items-center justify-between border-t border-border-default/60 pt-4">
              <span className="text-sm font-bold text-text-secondary">Tổng cộng</span>
              <span className="text-xl font-bold text-text-primary">{formatVnd(totalAmount)}</span>
            </div>

            <Button
              className="mt-4 h-12 w-full text-base font-bold"
              disabled={selectedLines.length === 0 || createOrderMutation.isPending}
              onClick={handleConfirm}
            >
              {createOrderMutation.isPending ? "Đang gửi..." : "Xác nhận thêm món"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Package, ChevronLeft } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { useOutOfStockDishes, useRestoreAllBranchStock, useToggleBranchDishStock } from "@/api/branch-dish-stocks.api";
import { useBranch } from "@/api/branches.api";

/**
 * Trang "Món đang hết hàng" - FR-MNU-03, GĐ2
 * Hiển thị danh sách món đang hết hàng tại một chi nhánh.
 * Cho phép:
 * - Đánh dấu từng món là "còn hàng" (toggle)
 * - Restore tất cả món thành "còn hàng" (với xác nhận)
 */
export default function OutOfStockPage() {
  const navigate = useNavigate();
  const { branchId: branchIdParam } = useParams();
  const branchId = branchIdParam ? Number(branchIdParam) : 0;

  const [showRestoreAllDialog, setShowRestoreAllDialog] = useState(false);

  const { data: branch } = useBranch(branchId);
  const { data: outOfStockDishes = [], isLoading } = useOutOfStockDishes(branchId);
  const toggleStockMutation = useToggleBranchDishStock();
  const restoreAllMutation = useRestoreAllBranchStock();


  const handleBack = () => {
    navigate(-1);
  };

  const handleToggleSingle = async (dishId: number, dishName: string) => {
    try {
      await toggleStockMutation.mutateAsync({ branchId, dishId });
      toast.success(`"${dishName}" đã chuyển sang còn hàng`);
    } catch (error) {
      toast.error("Không thể cập nhật trạng thái hàng");
      console.error("Toggle stock error:", error);
    }
  };

  const handleRestoreAll = async () => {
    try {
      await restoreAllMutation.mutateAsync(branchId);
      toast.success("Đã khôi phục tất cả món thành còn hàng");
      setShowRestoreAllDialog(false);
    } catch (error) {
      toast.error("Không thể khôi phục hàng");
      console.error("Restore all error:", error);
    }
  };

  const busy = toggleStockMutation.isPending || restoreAllMutation.isPending;

  return (
    <div className="flex min-h-screen flex-col bg-surface-default">
      <Button variant="ghost" onClick={handleBack}><ChevronLeft />Quay lại</Button>
      <PageHeader
        title={`Món hết hàng - ${branch?.name || "..."}`}
        actions={
          outOfStockDishes.length > 0 ? (
            <Button
              variant="default"
              onClick={() => setShowRestoreAllDialog(true)}
              disabled={busy}
            >
              Khôi phục tất cả
            </Button>
          ) : undefined
        }
      />

      <div className="flex-1 px-4 py-6 md:px-6">
        {isLoading ? (
          <div className="rounded-card border border-border-default bg-surface-card py-12 text-center">
            <p className="text-sm text-text-tertiary">Đang tải...</p>
          </div>
        ) : outOfStockDishes.length === 0 ? (
          <div className="rounded-card border border-border-default bg-surface-card py-12 text-center">
            <Package className="mx-auto size-12 text-text-tertiary" />
            <p className="mt-3 text-sm font-medium text-text-primary">
              Không có món nào hết hàng
            </p>
            <p className="mt-1 text-xs text-text-tertiary">
              Tất cả món đang trong trạng thái còn hàng
            </p>
          </div>
        ) : (
          <>
            {/* Mobile view: Cards */}
            <div className="space-y-3 md:hidden">
              {outOfStockDishes.map((stock) => (
                <div
                  key={stock.id}
                  className="rounded-card border border-border-default bg-surface-card p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-text-primary">
                        {stock.dishName || "Món không tên"}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleToggleSingle(stock.dishId, stock.dishName || "món")}
                      disabled={busy}
                    >
                      Còn hàng
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Desktop view: Table */}
            <div className="hidden overflow-hidden rounded-card border border-border-default bg-surface-card shadow-2xs md:block">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface-muted/40 hover:bg-surface-muted/40 border-b border-border-default">
                    <TableHead className="py-3.5 pl-6 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                      MÓN
                    </TableHead>
                    <TableHead className="py-3.5 pr-6 pl-4 text-right text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                      THAO TÁC
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outOfStockDishes.map((stock) => (
                    <TableRow
                      key={stock.id}
                      className="hover:bg-surface-muted/30 transition-colors border-b border-border-default last:border-b-0"
                    >
                      <TableCell className="py-3.5 pl-6 font-semibold text-text-primary">
                        {stock.dishName || "Món không tên"}
                      </TableCell>
                      <TableCell className="py-3.5 pr-6 pl-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleToggleSingle(stock.dishId, stock.dishName || "món")}
                          disabled={busy}
                        >
                          Đánh dấu còn hàng
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>

      {/* Restore All Confirmation Dialog */}
      <AlertDialog open={showRestoreAllDialog} onOpenChange={setShowRestoreAllDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Khôi phục tất cả món?</AlertDialogTitle>
            <AlertDialogDescription>
              Xác nhận đánh dấu tất cả <strong>{outOfStockDishes.length} món</strong> thành
              "còn hàng"? Món sẽ hiện lại trên menu của khách.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={restoreAllMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRestoreAll}
              disabled={restoreAllMutation.isPending}
            >
              {restoreAllMutation.isPending ? "Đang khôi phục..." : "Khôi phục tất cả"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

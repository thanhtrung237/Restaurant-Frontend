import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { toast } from 'sonner';
import { useCreateDishOverride, useUpdateDishOverride } from '@/api/dish-overrides.api';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import type { BranchMenuItem } from '@/types/models';

// ============================================================================
// Types
// ============================================================================

interface DishOverrideModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  branchId: number;
  dish: BranchMenuItem | null;
  /** Override ID if editing existing override, undefined if creating new */
  overrideId?: number;
}

// Định dạng tiền VND — khai báo tại chỗ để file không phụ thuộc `@/lib/format`.
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);
}

// ============================================================================
// Validation Schema
// ============================================================================

const overrideSchema = z.object({
  overridePrice: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Number(val)),
      'Giá phải là số hợp lệ'
    )
    .refine(
      (val) => !val || Number(val) >= 0,
      'Giá không được âm'
    ),
  // Không dùng .default(): defaultValues của useForm đã lo, và .default() làm
  // kiểu input (optional) lệch kiểu output (required) → lỗi Resolver.
  isHidden: z.boolean(),
});

type OverrideFormValues = z.infer<typeof overrideSchema>;

// ============================================================================
// Component
// ============================================================================

export function DishOverrideModal({
  open,
  onOpenChange,
  branchId,
  dish,
  overrideId,
}: DishOverrideModalProps) {
  const createMutation = useCreateDishOverride();
  const updateMutation = useUpdateDishOverride();

  const form = useForm<OverrideFormValues>({
    resolver: zodResolver(overrideSchema),
    defaultValues: {
      overridePrice: '',
      isHidden: false,
    },
  });

  // Pre-fill form when editing existing override
  useEffect(() => {
    if (open && dish) {
      form.reset({
        overridePrice: overrideId ? (dish.overridePrice?.toString() ?? '') : '',
        isHidden: Boolean(overrideId && dish.isHidden),
      });
    }
  }, [open, dish, overrideId, form]);

  const onSubmit = async (values: OverrideFormValues) => {
    if (!dish) return;

    try {
      const payload = {
        overridePrice: values.overridePrice ? Number(values.overridePrice) : undefined,
        isHidden: values.isHidden,
      };

      if (overrideId) {
        // Update existing override
        await updateMutation.mutateAsync({
          id: overrideId,
          body: { ...payload, clearOverridePrice: dish.hasOverride && payload.overridePrice === undefined ? true : undefined },
        });
        toast.success('Cập nhật ghi đè thành công');
      } else {
        // Create new override
        await createMutation.mutateAsync({
          branchId,
          dishId: dish.dishId,
          ...payload,
        });
        toast.success('Tạo ghi đè thành công');
      }

      onOpenChange(false);
    } catch (error) {
      toast.error(overrideId ? 'Không thể cập nhật ghi đè' : 'Không thể tạo ghi đè');
      console.error('Override mutation error:', error);
    }
  };

  if (!dish) return null;

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isEditing = !!overrideId;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Giá và hiển thị · {dish.dishName}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Cập nhật giá hoặc trạng thái ẩn cho món tại chi nhánh này.'
              : 'Đặt giá riêng hoặc ẩn món tại chi nhánh này mà không ảnh hưởng chi nhánh khác.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Price Override */}
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">Giá gốc:</span>{' '}
                {formatCurrency(dish.basePrice)}
              </div>

              <FormField
                control={form.control}
                name="overridePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Giá ghi đè</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Để trống để giữ giá gốc"
                        {...field}
                        disabled={isLoading}
                      />
                    </FormControl>
                    <FormDescription>
                      Giá áp dụng riêng cho chi nhánh này. Để trống để dùng giá gốc.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Hidden Status */}
            <FormField
              control={form.control}
              name="isHidden"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Ẩn tại chi nhánh</FormLabel>
                    <FormDescription>
                      Món sẽ không hiện trên menu của chi nhánh này. Khác với "Hết hàng".
                    </FormDescription>
                  </div>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isLoading}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Hủy
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Đang lưu...' : isEditing ? 'Cập nhật' : 'Tạo ghi đè'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

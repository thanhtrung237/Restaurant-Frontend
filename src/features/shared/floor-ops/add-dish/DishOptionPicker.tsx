import { useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { getOptionItemsByGroup } from "@/api/option-items.api";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatCurrency } from "@/lib/format";
import { qk } from "@/lib/query-keys";
import type { BranchMenuItem, DishOptionGroup, OptionItem } from "@/types/models";

export function getUnitPrice(dish: BranchMenuItem, options: OptionItem[]) {
  return Number(dish.effectivePrice) + options.reduce((sum, item) => sum + Number(item.extraPrice), 0);
}

export function DishOptionPicker({ dish, groups, initialOptions, editing, onSave, onClose, onRestoreFocus }: {
  dish: BranchMenuItem;
  groups: DishOptionGroup[];
  initialOptions: OptionItem[];
  editing: boolean;
  onSave: (options: OptionItem[]) => void;
  onClose: () => void;
  onRestoreFocus: () => void;
}) {
  const [selectedIds, setSelectedIds] = useState(() => new Set(initialOptions.map((option) => option.id)));
  const queries = useQueries({
    queries: groups.map((group) => ({
      queryKey: qk.optionItems.byGroup(group.optionGroupId),
      queryFn: () => getOptionItemsByGroup(group.optionGroupId),
    })),
  });
  const loading = queries.some((query) => query.isPending);
  const failed = queries.some((query) => query.isError);
  const selections = groups.map((group, index) => {
    const items = queries[index].data ?? [];
    const chosen = items.filter((item) => selectedIds.has(item.id));
    const min = group.selectionType === "REQUIRED" ? Math.max(1, group.minSelect) : group.minSelect;
    return { group, items, chosen, min };
  });
  const allValid = selections.every(({ chosen, group, min }) => chosen.length >= min && chosen.length <= group.maxSelect);
  const selected = selections.flatMap((entry) => entry.chosen);
  const unitPrice = getUnitPrice(dish, selected);

  function toggle(item: OptionItem, items: OptionItem[], single: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        if (single) items.forEach((option) => next.delete(option.id));
        next.add(item.id);
      }
      return next;
    });
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col p-4 sm:p-6"
        onCloseAutoFocus={(event) => { event.preventDefault(); onRestoreFocus(); }}>
        <DialogHeader className="shrink-0 pr-6">
          <DialogTitle className="break-words">{dish.dishName}</DialogTitle>
          <DialogDescription>Chọn tùy chọn cho món.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-4 overflow-y-auto pr-1">
          {failed ? (
            <div>
              <p role="alert" className="text-sm text-status-danger">Không tải được tùy chọn của món.</p>
              <Button type="button" variant="link" onClick={() => queries.forEach((query) => { if (query.isError) void query.refetch(); })}>Thử lại</Button>
            </div>
          ) : loading ? (
            <p role="status" className="text-sm text-text-secondary">Đang tải tùy chọn…</p>
          ) : selections.length === 0 ? (
            <p className="text-sm text-text-secondary">Món này hiện chưa có tùy chọn.</p>
          ) : selections.map(({ group, items, chosen, min }) => (
            <fieldset key={group.optionGroupId} className="min-w-0 space-y-1.5 border-b border-border-default pb-3 last:border-0">
              <legend className="max-w-full break-words text-sm font-bold">{group.optionGroupName || "Tùy chọn"}</legend>
              <p className="text-xs text-text-secondary">
                {min > 0 ? `Bắt buộc · ${min === group.maxSelect ? `Chọn ${min}` : `Chọn từ ${min} đến ${group.maxSelect}`}`
                  : `Tùy chọn · tối đa ${group.maxSelect}`}
              </p>
              {items.length ? items.map((item) => {
                const checked = selectedIds.has(item.id);
                const single = group.maxSelect === 1;
                return (
                  <label key={item.id} className="flex min-h-11 items-center gap-2.5 rounded-lg border border-border-default px-3 py-2 text-sm">
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={!checked && !single && chosen.length >= group.maxSelect}
                      onChange={() => toggle(item, items, single)}
                      className="size-4 shrink-0 accent-brand-primary"
                    />
                    <span className="min-w-0 flex-1 break-words">{item.name}</span>
                    {Number(item.extraPrice) > 0 ? <span className="shrink-0 text-text-secondary">+{formatCurrency(item.extraPrice)}</span> : null}
                  </label>
                );
              }) : <p className="text-sm text-text-secondary">Nhóm này chưa có lựa chọn.</p>}
            </fieldset>
          ))}
        </div>
        <DialogFooter className="shrink-0 border-t border-border-default pt-3 sm:items-center sm:justify-between">
          <span className="text-sm font-bold tabular-nums" aria-live="polite">
            {formatCurrency(unitPrice)}{dish.soldByWeight ? " / kg" : " / suất"}
          </span>
          <Button type="button" disabled={loading || failed || !allValid} onClick={() => onSave(selected)}>
            {editing ? "Lưu tùy chọn" : "Thêm vào bàn"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

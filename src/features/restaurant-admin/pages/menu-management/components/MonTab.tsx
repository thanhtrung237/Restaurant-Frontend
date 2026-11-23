import { useState } from "react"
import { Pencil } from "lucide-react"
import { DishThumbnail } from "@/components/common/DishThumbnail"
import { SearchInput } from "@/components/common/SearchInput"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { CategoryItem, DishItem } from "../types"

interface MonTabProps {
  dishes: DishItem[]
  categories: CategoryItem[]
  onEditDish: (dish: DishItem) => void
  isLoading: boolean
  loadError?: string
  onRetry: () => void
}

export function MonTab({ dishes, categories, onEditDish, isLoading, loadError, onRetry }: MonTabProps) {
  const [search, setSearch] = useState("")
  const [categoryId, setCategoryId] = useState("all")
  const [status, setStatus] = useState("all")
  const category = categories.some((item) => String(item.id) === categoryId) ? categoryId : "all"
  const query = search.trim().toLowerCase()
  const filteredDishes = dishes.filter((dish) =>
    (category === "all" || String(dish.categoryId) === category) &&
    (status === "all" || dish.isAvailable === (status === "active")) &&
    [dish.name, dish.description, dish.category].some((text) => text?.toLowerCase().includes(query)),
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 items-center gap-2 sm:flex sm:gap-3" role="group" aria-label="Lọc thực đơn chung">
        <div className="col-span-2 min-w-0 sm:w-64">
          <SearchInput
            aria-label="Tìm món"
            placeholder="Tìm món…"
            className="border-border-strong bg-surface-card placeholder:font-medium placeholder:text-text-secondary"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch("")}
          />
        </div>
        <Select value={category} onValueChange={setCategoryId}>
          <SelectTrigger aria-label="Danh mục món" className="h-10 w-full min-w-0 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tất cả danh mục</SelectItem>
            {categories.map((item) => <SelectItem key={item.id} value={String(item.id)}>{item.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger aria-label="Trạng thái bán" className="h-10 w-full min-w-0 sm:w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Mọi trạng thái</SelectItem>
            <SelectItem value="active">Đang bán</SelectItem>
            <SelectItem value="inactive">Ngừng bán</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="overflow-hidden rounded-card border border-border-default bg-surface-card shadow-2xs" aria-busy={isLoading}>
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-muted/40">
              <TableHead className="pl-3 md:pl-6">Món</TableHead>
              <TableHead className="hidden md:table-cell">Danh mục</TableHead>
              <TableHead className="hidden sm:table-cell">Giá gốc</TableHead>
              <TableHead>Trạng thái</TableHead>
              <TableHead><span className="sr-only">Thao tác</span></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDishes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="whitespace-normal px-4 py-10 text-center text-text-tertiary">
                  {isLoading ? "Đang tải món…" : loadError ? (
                    <>
                      <p>{loadError}</p>
                      <Button type="button" variant="link" onClick={onRetry}>Thử lại</Button>
                    </>
                  ) : dishes.length === 0 ? "Chưa có món trong thực đơn chung." : "Không tìm thấy món phù hợp."}
                </TableCell>
              </TableRow>
            ) : filteredDishes.map((dish) => {
              const price = `${dish.price.toLocaleString("vi-VN")}đ`
              return (
                <TableRow key={dish.id}>
                  <TableCell className="whitespace-normal py-3 pl-3 md:pl-6">
                    <div className="flex items-center gap-2 md:gap-3">
                      <DishThumbnail imageUrl={dish.image} />
                      <div className="min-w-0">
                        <p className="break-words font-semibold text-text-primary">{dish.name}</p>
                        <p className="text-xs text-text-tertiary md:hidden">{dish.category}</p>
                        <p className="mt-1 text-xs font-semibold sm:hidden">{price}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="hidden whitespace-normal text-text-secondary md:table-cell">{dish.category}</TableCell>
                  <TableCell className="hidden font-semibold sm:table-cell">{price}</TableCell>
                  <TableCell>
                    <Badge dot variant={dish.isAvailable ? "success" : "secondary"}>
                      {dish.isAvailable ? "Đang bán" : "Ngừng bán"}
                    </Badge>
                  </TableCell>
                  <TableCell className="pr-2 text-right md:pr-6">
                    <Button type="button" variant="ghost" size="sm" className="px-2" aria-label={`Chỉnh sửa món: ${dish.name}`} onClick={() => onEditDish(dish)}>
                      <Pencil aria-hidden="true" />
                      <span className="hidden sm:inline">Chỉnh sửa</span>
                    </Button>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

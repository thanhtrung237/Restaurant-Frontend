import type { ReactNode } from "react"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { EmptyState } from "@/components/common/EmptyState"
import { cn } from "@/lib/utils"

export interface DataTableColumn<T> {
  key: string
  header: ReactNode
  /** Nếu không truyền, mặc định đọc row[key] (chỉ dùng được khi key là field của T dạng string/number). */
  cell?: (row: T, rowIndex: number) => ReactNode
  align?: "left" | "right" | "center"
  className?: string
  headerClassName?: string
}

interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  rows: T[]
  rowKey: (row: T, rowIndex: number) => string | number
  isLoading?: boolean
  /** Số dòng skeleton hiện khi isLoading (mặc định 5). */
  skeletonRowCount?: number
  emptyTitle?: string
  emptyDescription?: string
  onRowClick?: (row: T) => void
  className?: string
}

const ALIGN_CLASS: Record<NonNullable<DataTableColumn<unknown>["align"]>, string> = {
  left: "text-left",
  right: "text-right",
  center: "text-center",
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  isLoading = false,
  skeletonRowCount = 5,
  emptyTitle = "Không có dữ liệu",
  emptyDescription,
  onRowClick,
  className,
}: DataTableProps<T>) {
  return (
    <Table className={className}>
      <TableHeader>
        <TableRow>
          {columns.map((col) => (
            <TableHead
              key={col.key}
              className={cn(col.align ? ALIGN_CLASS[col.align] : undefined, col.headerClassName)}
            >
              {col.header}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          Array.from({ length: skeletonRowCount }).map((_, i) => (
            <TableRow key={`skeleton-${i}`}>
              {columns.map((col) => (
                <TableCell key={col.key}>
                  <div className="h-4 w-full max-w-32 animate-pulse rounded bg-muted" />
                </TableCell>
              ))}
            </TableRow>
          ))
        ) : rows.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={columns.length} className="p-0">
              <EmptyState title={emptyTitle} description={emptyDescription} />
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, rowIndex) => (
            <TableRow
              key={rowKey(row, rowIndex)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(onRowClick ? "cursor-pointer" : undefined)}
            >
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={cn(col.align ? ALIGN_CLASS[col.align] : undefined, col.className)}
                >
                  {col.cell
                    ? col.cell(row, rowIndex)
                    : String((row as Record<string, unknown>)[col.key] ?? "")}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}

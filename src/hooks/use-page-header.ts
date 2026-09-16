import * as React from "react"

/**
 * Tiêu đề trang cho MobileHeader (phương án P2).
 *
 * Mặc định tiêu đề lấy từ mục menu đang active — xem `StaffLayout`. Trang nào cần ghi đè
 * (hoặc cần thêm dòng phụ động như "12 bàn · 5 đang phục vụ" trong Figma) thì gọi
 * `usePageHeader({ title, subtitle })`.
 *
 * Vì sao không dùng `route handle`: tiêu đề ở đó là hằng số khai báo lúc định nghĩa
 * router, không đặt được dòng phụ phụ thuộc dữ liệu đang tải.
 */
export interface PageHeaderValue {
  title?: string
  subtitle?: string
  /**
   * Điều khiển riêng của trang, hiển thị trong header mobile (vd bộ chọn kỳ
   * "Hôm nay ▾" của màn Báo cáo theo Figma).
   *
   * CHỈ dùng cho bộ lọc phạm vi trang, KHÔNG phải nút hành động — thao tác tạo mới đặt ở
   * FAB, thao tác trên từng dòng đặt trong card (xem các bản Figma mobile).
   *
   * BẮT BUỘC memo hoá ở nơi gọi (`React.useMemo`): giá trị được so sánh bằng tham chiếu,
   * truyền JSX tạo mới mỗi lần render sẽ gây vòng lặp cập nhật.
   */
  headerActions?: React.ReactNode
}

interface PageHeaderContextValue extends PageHeaderValue {
  setPageHeader: (value: PageHeaderValue) => void
}

export const PageHeaderContext =
  React.createContext<PageHeaderContextValue | null>(null)

/**
 * Tạo giá trị cho `PageHeaderContext.Provider`.
 * Tách khỏi component Provider để file này chỉ export hook/context — tránh cảnh báo
 * only-export-components của React Compiler (fast refresh).
 */
export function usePageHeaderState(): PageHeaderContextValue {
  const [value, setValue] = React.useState<PageHeaderValue>({})

  const setPageHeader = React.useCallback((next: PageHeaderValue) => {
    setValue((prev) =>
      prev.title === next.title &&
      prev.subtitle === next.subtitle &&
      prev.headerActions === next.headerActions
        ? prev
        : next,
    )
  }, [])

  return React.useMemo<PageHeaderContextValue>(
    () => ({ ...value, setPageHeader }),
    [value, setPageHeader],
  )
}

/** Dùng trong StaffLayout để đọc giá trị trang hiện tại ghi đè. */
export function usePageHeaderValue(): PageHeaderValue {
  const ctx = React.useContext(PageHeaderContext)
  return {
    title: ctx?.title,
    subtitle: ctx?.subtitle,
    headerActions: ctx?.headerActions,
  }
}

/**
 * Đặt tiêu đề / dòng phụ cho header mobile của trang hiện tại.
 * Tự dọn khi rời trang để trang sau không dính tiêu đề cũ.
 */
export function usePageHeader(value: PageHeaderValue): void {
  const ctx = React.useContext(PageHeaderContext)
  const setPageHeader = ctx?.setPageHeader
  const { title, subtitle, headerActions } = value

  React.useEffect(() => {
    if (!setPageHeader) return
    setPageHeader({ title, subtitle, headerActions })
    return () => setPageHeader({})
  }, [setPageHeader, title, subtitle, headerActions])
}

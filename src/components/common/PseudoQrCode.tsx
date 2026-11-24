import * as React from "react"

/**
 * PseudoQrCode — hoạ tiết QR giả lập, KHÔNG gọi thư viện ngoài (chưa có backend phát mã QR
 * VietQR thật). Pattern tất định dựa trên `seed` để cùng 1 hoá đơn luôn ra cùng 1 hình,
 * ổn định giữa các lần render thay vì random mỗi lần.
 *
 * Tách ra từ cashier/pages/qr-transfer-payment/index.tsx (nơi component này được viết lần
 * đầu) để Khách hàng (Thanh toán QR) dùng lại — tránh lặp code sinh hoạ tiết QR ở 2 nơi.
 *
 * TODO(api): thay bằng mã QR VietQR thật (ảnh trả về từ BE theo chuẩn NAPAS) khi có backend.
 */
export function PseudoQrCode({ seed, size = 220 }: { seed: string; size?: number }) {
  const GRID = 21
  const cell = size / GRID

  const modules = React.useMemo(() => {
    let h = 0
    for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0
    const rand = () => {
      h = (h * 1664525 + 1013904223) >>> 0
      return h / 0xffffffff
    }
    const grid: boolean[][] = Array.from({ length: GRID }, () =>
      Array.from({ length: GRID }, () => rand() > 0.55),
    )
    // Khoét 3 góc để chừa chỗ vẽ finder pattern
    const clearCorner = (r0: number, c0: number) => {
      for (let r = r0; r < r0 + 7; r++) for (let c = c0; c < c0 + 7; c++) grid[r][c] = false
    }
    clearCorner(0, 0)
    clearCorner(0, GRID - 7)
    clearCorner(GRID - 7, 0)
    return grid
  }, [seed])

  const Finder = ({ x, y }: { x: number; y: number }) => (
    <g transform={`translate(${x * cell}, ${y * cell})`}>
      <rect width={cell * 7} height={cell * 7} fill="#111111" />
      <rect x={cell} y={cell} width={cell * 5} height={cell * 5} fill="#ffffff" />
      <rect x={cell * 2} y={cell * 2} width={cell * 3} height={cell * 3} fill="#111111" />
    </g>
  )

  return (
    <svg
      viewBox={`0 0 ${size} ${size}`}
      width={size}
      height={size}
      role="img"
      aria-label="Mã QR chuyển khoản"
    >
      <rect width={size} height={size} fill="#ffffff" />
      {modules.map((row, r) =>
        row.map((on, c) =>
          on ? (
            <rect
              key={`${r}-${c}`}
              x={c * cell}
              y={r * cell}
              width={cell}
              height={cell}
              fill="#111111"
            />
          ) : null,
        ),
      )}
      <Finder x={0} y={0} />
      <Finder x={GRID - 7} y={0} />
      <Finder x={0} y={GRID - 7} />
    </svg>
  )
}

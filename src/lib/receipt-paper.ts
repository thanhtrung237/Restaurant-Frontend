import { toast } from "@/hooks/use-toast"

export const RECEIPT_PAPER_WIDTH_MM = 80
export const RECEIPT_MARGIN_MM = 4
export const RECEIPT_CONTENT_WIDTH_MM = RECEIPT_PAPER_WIDTH_MM - 2 * RECEIPT_MARGIN_MM

export function setReceiptPaperSize(receipt: HTMLElement, pageName: string) {
  const doc = receipt.ownerDocument
  const id = `print-size-${pageName}`
  const style = doc.getElementById(id) ?? doc.createElement("style")
  receipt.setAttribute("data-measuring-receipt", "")
  const contentHeight = receipt.getBoundingClientRect().height
  receipt.removeAttribute("data-measuring-receipt")

  // CSS pixels are 1/96 inch. Use two fixed dimensions for browser/PDF printing.
  const heightMm = Math.ceil((contentHeight * 25.4) / 96) + 2 * RECEIPT_MARGIN_MM + 2
  const pageHeight = Math.min(500, Math.max(85, heightMm))
  style.id = id
  style.textContent = `@page ${pageName} { size: ${RECEIPT_PAPER_WIDTH_MM}mm ${pageHeight}mm; margin: ${RECEIPT_MARGIN_MM}mm; }`
  if (!style.isConnected) doc.head.appendChild(style)
}

export function printToLocalEmulator(getHtml: () => string) {
  if (!import.meta.env.DEV_POS_EMULATOR) return

  return fetch("/__local-pos-print", {
    method: "POST",
    headers: { "Content-Type": "text/html", "X-Local-POS-Print": "1" },
    body: getHtml(),
  })
    .then(async (response) => {
      if (!response.ok) {
        throw new Error(
          response.status === 403
            ? "Mở trang trên chính máy Windows đang chạy Vite và POS Printer Emulator."
            : await response.text(),
        )
      }
      toast({ title: "Đã gửi phiếu đến POS Printer Emulator", variant: "success" })
    })
    .catch((error: Error) => {
      toast({
        title: "Không in được qua máy in ảo",
        description: error.message,
        variant: "danger",
      })
    })
}

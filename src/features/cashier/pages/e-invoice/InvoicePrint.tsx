import { useEffect } from "react"
import { createPortal } from "react-dom"
import type { Invoice } from "@/types/models"
import type { InvoiceLine } from "./invoice-lines"
import type { QrCodeResponse } from "@/api/invoices.api"
import { printToLocalEmulator, setReceiptPaperSize } from "@/lib/receipt-paper"
import "./invoice-print.css"
import invoicePrintCss from "./invoice-print.css?inline"

const formatVnd = (amount: number) => `${Math.round(amount).toLocaleString("vi-VN")}đ`

export interface InvoiceAmountRow {
  label: string
  amount: number
}

export function formatInvoiceIssuer(invoice: Invoice) {
  return formatReceiptEmployee(invoice.eInvoiceIssuedByName, invoice.eInvoiceIssuedByEmployeeCode)
}

function formatReceiptEmployee(name?: string | null, code?: string | null) {
  return [name, code]
    .map((value) => value?.trim())
    .filter(Boolean)
    .join(" · ")
}

const requestedPrints = new Set<string>()

export function printInvoiceReceipt() {
  const receipt = document.getElementById("invoice-print")
  if (!receipt) return
  if (printToLocalEmulator(() => `<style>${invoicePrintCss}</style>${receipt.outerHTML}`)) return
  setReceiptPaperSize(receipt, "invoice-receipt")
  window.print()
}

export function InvoicePrint({
  invoice,
  issuedAt,
  tableName,
  items,
  amounts,
  autoPrint,
  transfer,
  printedBy,
}: {
  invoice: Invoice
  issuedAt: string
  tableName: string
  items: InvoiceLine[]
  amounts: InvoiceAmountRow[]
  autoPrint?: boolean
  transfer?: QrCodeResponse
  printedBy?: { fullName?: string } | null
}) {
  useEffect(() => {
    if (!autoPrint) return
    const key = `invoice-auto-print:${invoice.id}:${invoice.invoiceNumber}`
    if (requestedPrints.has(key)) return
    try {
      if (localStorage.getItem(key)) return
      localStorage.setItem(key, "requested")
    } catch {
      // Keep at most one automatic request per loaded app if storage is unavailable.
    }
    requestedPrints.add(key)
    printInvoiceReceipt()
  }, [autoPrint, invoice.id, invoice.invoiceNumber])

  const seller = transfer ? printedBy?.fullName?.trim() : invoice.eInvoiceIssuedByName?.trim()

  return createPortal(
    <article id="invoice-print" lang="vi">
      <header>
        <p>{invoice.branchName ?? "Nhà hàng"}</p>
        <h1>{transfer ? "Phiếu tạm tính" : "Hóa đơn thanh toán"}</h1>
        <p>Số hóa đơn {invoice.invoiceNumber}</p>
        <p>
          {issuedAt} · {tableName}
        </p>
        {invoice.eInvoiceRef && <p>Mã tham chiếu {invoice.eInvoiceRef}</p>}
        <p>Nhân viên bán: {seller || "Chưa có thông tin"}</p>
      </header>

      <table aria-label="Các món tính tiền">
        <thead>
          <tr>
            <th>Món</th>
            <th>SL</th>
            <th>Đơn giá</th>
            <th>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <strong>{item.name}</strong>
                {!!item.options?.length && (
                  <div>
                    {item.options
                      .map((option) =>
                        option.priceSnapshot > 0
                          ? `${option.optionItemName} (+${formatVnd(option.priceSnapshot)})`
                          : option.optionItemName,
                      )
                      .join(" · ")}
                  </div>
                )}
              </td>
              <td>
                {item.weightKg != null
                  ? `${item.weightKg.toLocaleString("vi-VN")} kg`
                  : item.quantity}
              </td>
              <td>
                {formatVnd(item.price)}
                {item.weightKg != null ? " / kg" : ""}
              </td>
              <td>{formatVnd(item.lineTotal)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <dl className="invoice-print-totals">
        {amounts.map(({ label, amount }) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{formatVnd(amount)}</dd>
          </div>
        ))}
        <div className="invoice-print-grand-total">
          <dt>Tổng cộng</dt>
          <dd>{formatVnd(invoice.grandTotal)}</dd>
        </div>
        {transfer && (
          <div>
            <dt>Còn phải chuyển</dt>
            <dd>{formatVnd(transfer.remainingAmount)}</dd>
          </div>
        )}
      </dl>
      {transfer && (
        <section className="invoice-print-transfer">
          <img src={transfer.qrImageUrl} alt="VietQR chuyển khoản cho phiếu tạm tính" />
          <p>
            {transfer.bankName} · {transfer.accountNo}
          </p>
          <p>{transfer.accountName}</p>
          <p>
            Nội dung chuyển khoản <strong>{transfer.transferContent}</strong>
          </p>
        </section>
      )}
    </article>,
    document.body,
  )
}

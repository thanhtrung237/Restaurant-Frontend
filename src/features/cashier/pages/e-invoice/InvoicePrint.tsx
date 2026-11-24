import { Fragment, useEffect } from "react"
import { createPortal } from "react-dom"
import { PAYMENT_METHOD_LABEL } from "@/types/enums"
import type { Invoice } from "@/types/models"
import type { InvoiceLine } from "./invoice-lines"
import type { QrCodeResponse } from "@/api/invoices.api"
import "./invoice-print.css"

const formatVnd = (amount: number) => `${Math.round(amount).toLocaleString("vi-VN")}đ`

export interface InvoiceAmountRow {
  label: string
  amount: number
}

const requestedPrints = new Set<string>()

export function InvoicePrint({
  invoice,
  issuedAt,
  tableName,
  items,
  amounts,
  autoPrint,
  transfer,
}: {
  invoice: Invoice
  issuedAt: string
  tableName: string
  items: InvoiceLine[]
  amounts: InvoiceAmountRow[]
  autoPrint?: boolean
  transfer?: QrCodeResponse
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
    window.print()
  }, [autoPrint, invoice.id, invoice.invoiceNumber])

  return createPortal(
    <article id="invoice-print" lang="vi">
      <header>
        <p>{invoice.branchName ?? "Nhà hàng"}</p>
        <h1>{transfer ? "Phiếu tạm tính" : "Hóa đơn thanh toán"}</h1>
        <p>Số hóa đơn {invoice.invoiceNumber}</p>
        <p>
          {issuedAt} · {tableName}
        </p>
        {invoice.taxCodeUsed && <p>Mã số thuế {invoice.taxCodeUsed}</p>}
        {invoice.eInvoiceRef && <p>Mã tham chiếu {invoice.eInvoiceRef}</p>}
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
        {invoice.payments?.map((payment) => (
          <Fragment key={payment.id}>
            <div>
              <dt>{PAYMENT_METHOD_LABEL[payment.method] ?? payment.method}</dt>
              <dd>{formatVnd(payment.amount)}</dd>
            </div>
            {payment.method === "CASH" && payment.amountTendered != null && (
              <div>
                <dt>Khách đưa</dt>
                <dd>{formatVnd(payment.amountTendered)}</dd>
              </div>
            )}
            {payment.method === "CASH" && payment.changeAmount != null && (
              <div>
                <dt>Tiền thối</dt>
                <dd>{formatVnd(payment.changeAmount)}</dd>
              </div>
            )}
          </Fragment>
        ))}
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
          <p>Vui lòng dùng phiếu mới nhất nếu có điều chỉnh món.</p>
        </section>
      )}
    </article>,
    document.body,
  )
}

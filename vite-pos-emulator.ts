import type { IncomingMessage } from "node:http"
import { createConnection } from "node:net"
import type { Plugin } from "vite"

const receiptWidth = 288
const receiptHeightLimit = 3500
const requestLimit = 512 * 1024

async function readReceipt(request: IncomingMessage) {
  const chunks: Buffer[] = []
  let length = 0
  for await (const chunk of request.iterator({ destroyOnReturn: false })) {
    length += chunk.length
    if (length > requestLimit) {
      request.resume()
      throw new Error("Nội dung phiếu vượt giới hạn in thử.")
    }
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString("utf8")
}

async function renderReceipt(html: string) {
  const { chromium } = await import("@playwright/test")
  const browser = await chromium.launch({
    channel: process.env.PW_CHANNEL || (process.platform === "win32" ? "msedge" : undefined),
    chromiumSandbox: true,
  })
  try {
    const page = await browser.newPage({
      viewport: { width: receiptWidth, height: 1 },
      deviceScaleFactor: 2,
      serviceWorkers: "block",
    })
    await page.route("**/*", async (route) => {
      const request = route.request()
      const url = new URL(request.url())
      if (
        request.resourceType() === "image" &&
        url.origin === "https://img.vietqr.io" &&
        url.pathname.startsWith("/image/")
      ) {
        const response = await route.fetch({ maxRedirects: 0, timeout: 5000 }).catch(() => null)
        if (response?.ok()) {
          await route.fulfill({ response })
          return
        }
      }
      await route.abort()
    })
    await page.setContent(
      `<!doctype html><html lang="vi"><head><meta charset="utf-8">
      <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https://img.vietqr.io/image/; base-uri 'none'; form-action 'none'">
      </head><body>${html}
      <style>
        body { width: auto; margin: 0; padding: 12px 8px; background: white; }
        #invoice-print { display: block; }
        #invoice-print p, #invoice-print dl, #invoice-print dd { margin: 0; }
        #invoice-print .invoice-print-totals { margin-top: 4mm; }
        #invoice-print img { display: block; }
      </style></body></html>`,
      { waitUntil: "load", timeout: 10000 },
    )
    if (await page.evaluate("Array.from(document.images).some(img => !img.naturalWidth)")) {
      throw new Error("Không tải được ảnh trên phiếu. Kiểm tra kết nối rồi in lại.")
    }
    if (await page.evaluate<number>("document.body.scrollHeight") > receiptHeightLimit) {
      throw new Error("Phiếu quá dài để in thử qua máy in ảo.")
    }
    const png = await page.screenshot({ fullPage: true, timeout: 10000 })

    // GS v 0 expects one bit per pixel, most significant bit first.
    const raster = await page.evaluate<number[]>(`(async () => {
      const image = new Image()
      image.src = "data:image/png;base64,${png.toString("base64")}"
      await image.decode()
      const canvas = document.createElement("canvas")
      canvas.width = image.width
      canvas.height = image.height
      const ctx = canvas.getContext("2d")
      ctx.drawImage(image, 0, 0)
      const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data
      const rowBytes = Math.ceil(canvas.width / 8)
      const bytes = new Uint8Array(rowBytes * canvas.height + 8)
      bytes.set([29, 118, 48, 0, rowBytes & 255, rowBytes >> 8,
        canvas.height & 255, canvas.height >> 8])
      for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
          const pixel = (y * canvas.width + x) * 4
          if (pixels[pixel] + pixels[pixel + 1] + pixels[pixel + 2] < 3 * 170) {
            bytes[8 + y * rowBytes + (x >> 3)] |= 128 >> (x & 7)
          }
        }
      }
      return Array.from(bytes)
    })()`)
    return Buffer.concat([Buffer.from([27, 64]), Buffer.from(raster), Buffer.from([10, 29, 86, 0])])
  } finally {
    await browser.close()
  }
}

function sendToEmulator(bytes: Buffer) {
  return new Promise<void>((resolve, reject) => {
    const socket = createConnection({ host: "127.0.0.1", port: 9100 })
    socket.setTimeout(3000, () => socket.destroy(new Error("Printer timeout")))
    socket.once("error", reject)
    socket.once("connect", () => socket.end(bytes, resolve))
  })
}

export function posEmulator(): Plugin {
  return {
    name: "local-pos-emulator",
    configureServer(server) {
      server.middlewares.use("/__local-pos-print", async (request, response) => {
        const { remoteAddress, localAddress } = request.socket
        const origin = `${server.config.server.https ? "https" : "http"}://${request.headers.host}`
        if (
          !remoteAddress ||
          remoteAddress !== localAddress ||
          request.method !== "POST" ||
          request.headers.origin !== origin ||
          request.headers["content-type"] !== "text/html" ||
          request.headers["x-local-pos-print"] !== "1"
        ) {
          response.writeHead(403).end()
          return
        }

        try {
          const bytes = await renderReceipt(await readReceipt(request))
          await sendToEmulator(bytes).catch(() => {
            throw new Error("Không gửi được phiếu. Hãy mở POS Printer Emulator trên cổng 9100.")
          })
          response.writeHead(204).end()
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          server.config.logger.error(`POS Printer Emulator: ${message}`)
          response.writeHead(502, { "Content-Type": "text/plain; charset=utf-8" })
          response.end(
            message.startsWith("browserType.")
              ? "Không mở được trình duyệt để tạo ảnh phiếu. Kiểm tra Microsoft Edge trên máy chạy Vite."
              : message,
          )
        }
      })
    },
  }
}

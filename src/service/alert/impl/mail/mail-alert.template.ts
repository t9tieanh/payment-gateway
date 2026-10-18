import { payosConfig } from '~/config/payment'
import { PaymentAlertKind } from '~/enums/paymentAlertKind.enum'
import { PaymentAlert } from '~/types/payment-alert'

type Severity = 'critical' | 'warning'

interface AlertCopy {
  severity: Severity
  badge: string
  title: string
  lead: string
  steps: string[]
}

interface Row {
  label: string
  value: string
  mono?: boolean
  note?: string
}

export class PaymentAlertMailTemplate {
  private readonly color = {
    brand: '#3d6ad9',
    brandEnd: '#5d93ea',
    brandInk: '#2c54c4',
    mint: '#5ad8a6',
    sky: '#8ccdf3',
    fg: '#1d232e',
    muted: '#5f6878',
    line: '#e4e7ec',
    soft: '#f5f6f8',
    page: '#eef0f3',
    critical: '#b42318',
    criticalSoft: '#fdecea',
    warning: '#a15c07',
    warningSoft: '#fdf3e2',
  }

  private readonly font = "-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
  private readonly fontMono = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace'
  private readonly fontBrand = "Montserrat, 'Arial Black', Arial, sans-serif"

  private readonly signature = { handle: '@phamtienanh', role: 'Software Engineer', site: 'https://t9tieanh.io.vn' }

  render(alert: PaymentAlert): { subject: string; text: string; html: string } {
    const copy = this.copyOf(alert)
    return {
      subject: this.subjectOf(alert),
      text: this.renderText(alert, copy),
      html: this.renderHtml(alert, copy),
    }
  }

  private money(amount: number | null): string {
    return amount === null ? '-' : `${new Intl.NumberFormat('vi-VN').format(amount)} ₫`
  }

  private time(iso: string): string {
    const date = new Date(iso)
    const zone = { timeZone: 'Asia/Ho_Chi_Minh' }
    return `${date.toLocaleDateString('vi-VN', zone)}, ${date.toLocaleTimeString('vi-VN', { ...zone, hour12: false })}`
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] as string)
  }

  private withCode(value: string): string {
    return this.escapeHtml(value).replace(
      /`([^`]+)`/g,
      `<code style="font-family:${this.fontMono};font-size:12px;background:${this.color.soft};padding:1px 4px;border-radius:3px;">$1</code>`
    )
  }

  private sourceHost(): string {
    try {
      return new URL(payosConfig.webhookUrl).host
    } catch {
      return 'unknown host'
    }
  }

  private copyOf(alert: PaymentAlert): AlertCopy {
    const app = alert.app ?? '-'
    const order = alert.referenceId ?? alert.orderId ?? '-'
    const paid = this.money(alert.expectedAmount ?? alert.receivedAmount)
    const orderCode = alert.payosOrderCode ?? '-'
    const notifyApp = alert.app
      ? `Báo app ${app} cập nhật đơn ${order} sang đã trả.`
      : `Báo app của đơn ${order} cập nhật sang đã trả.`

    switch (alert.kind) {
      case PaymentAlertKind.OrderNotFound:
        return {
          severity: 'critical',
          badge: 'Đã nhận tiền · không tìm thấy order',
          title: `Nhận ${this.money(alert.receivedAmount)} cho một orderCode không có trong gateway`,
          lead: `PayOS báo đã nhận tiền cho orderCode ${orderCode}, nhưng không order nào đang giữ mã này. Thường là link thanh toán cũ đã bị thay bằng link mới.`,
          steps: [
            `Tra giao dịch trên my.payos.vn theo orderCode ${orderCode}.`,
            'Dò order theo mô tả chuyển khoản: phần sau "DH" là đuôi của Order ID (đã bỏ dấu "-").',
            'Tìm thấy thì cập nhật order sang Paid bằng tay và báo app. Không thấy thì hoàn tiền.',
          ],
        }
      case PaymentAlertKind.AmountMismatch:
        return {
          severity: 'critical',
          badge: 'Đã nhận tiền · order chưa được ghi nhận',
          title: `Số tiền nhận được khác với order ${order}`,
          lead: `PayOS báo đã nhận ${this.money(alert.receivedAmount)}, nhưng order cần ${this.money(alert.expectedAmount)}. Gateway không đánh dấu Paid, order vẫn ở Pending.`,
          steps: [
            `Tra giao dịch trên my.payos.vn theo orderCode ${orderCode}.`,
            `Liên hệ người trả để xử lý phần chênh lệch, hoặc hoàn lại ${this.money(alert.receivedAmount)}.`,
            'Nếu chấp nhận số tiền này, cập nhật order sang Paid bằng tay và báo app.',
          ],
        }
      case PaymentAlertKind.AppNotConfigured:
        return {
          severity: 'warning',
          badge: 'Order đã Paid · app chưa được báo',
          title: `App "${app}" của order không có trong cấu hình gateway`,
          lead: `Khách đã trả ${paid} cho đơn ${order}. Order đã Paid, nhưng app "${app}" không có trong APPS nên gateway không biết báo cho ai.`,
          steps: [
            `Thêm "${app}" vào \`APPS\` và khai \`APP_${app.toUpperCase().replace(/-/g, '_')}_*\` trong \`.env\` của gateway, rồi khởi động lại.`,
            notifyApp,
          ],
        }
      case PaymentAlertKind.HandlerFailed:
        return {
          severity: 'warning',
          badge: 'Order đã Paid · app chưa được báo',
          title: `Callback sang ${app} thất bại sau ${alert.handlerAttempts ?? '-'} lần thử`,
          lead: `Khách đã trả ${paid} cho đơn ${order}. Gateway đã đánh dấu order Paid, nhưng app ${app} chưa nhận được kết quả nên phía app vẫn coi là chưa trả.`,
          steps: [
            `Kiểm tra app ${app} có đang chạy và nhận được callback từ gateway không.`,
            notifyApp,
            'Không cần hoàn tiền: tiền đã vào đúng order.',
          ],
        }
      case PaymentAlertKind.HandlerCrashed:
        return {
          severity: 'warning',
          badge: 'Order đã Paid · app chưa được báo',
          title: `Xử lý sau thanh toán của đơn ${order} dừng vì lỗi`,
          lead: alert.expectedAmount === null
            ? `Order ${order} đã Paid, nhưng gateway gặp lỗi khi đọc lại order nên chưa báo được cho app.`
            : `Khách đã trả ${paid} cho đơn ${order}. Order đã Paid, nhưng gateway gặp lỗi trước khi báo được cho app.`,
          steps: [
            'Xem `logs/error.log` của gateway quanh thời điểm trên.',
            'Kiểm tra kết nối Supabase của gateway.',
            notifyApp,
          ],
        }
      default: {
        const unknownKind: never = alert.kind
        throw new Error(`Unknown alert kind ${unknownKind}`)
      }
    }
  }

  private rowsOf(alert: PaymentAlert): Row[] {
    const rows: Row[] = [{ label: 'Loại', value: alert.kind, mono: true }]

    if (alert.app)
      rows.push({ label: 'App', value: alert.app })
    if (alert.referenceId)
      rows.push({ label: 'Reference ID', value: alert.referenceId, mono: true })
    if (alert.orderId)
      rows.push({ label: 'Order ID', value: alert.orderId, mono: true })
    if (alert.payosOrderCode !== null)
      rows.push({ label: 'PayOS orderCode', value: String(alert.payosOrderCode), mono: true })
    if (alert.transferDescription)
      rows.push({ label: 'Mô tả chuyển khoản', value: alert.transferDescription, mono: true })

    const { expectedAmount: expected, receivedAmount: received } = alert
    if (expected !== null && received !== null && expected !== received) {
      const gap = received - expected
      rows.push({ label: 'Order cần', value: this.money(expected) })
      rows.push({ label: 'Đã nhận', value: this.money(received), note: `(${gap < 0 ? 'thiếu' : 'thừa'} ${this.money(Math.abs(gap))})` })
    } else if (expected !== null || received !== null) {
      rows.push({ label: 'Số tiền', value: this.money(expected ?? received) })
    }

    if (alert.paidAt)
      rows.push({ label: 'Thanh toán lúc', value: this.time(alert.paidAt) })
    else
      rows.push({ label: 'Thời điểm', value: this.time(alert.occurredAt) })

    if (alert.handlerKind)
      rows.push({ label: 'Handler', value: `${alert.handlerKind} · ${alert.handlerAttempts ?? 0} lần thử`, mono: true })

    return rows
  }

  private subjectOf(alert: PaymentAlert): string {
    const order = alert.referenceId ?? alert.payosOrderCode ?? alert.orderId ?? '-'
    return `[PaymentGateway] ${alert.kind} app=${alert.app ?? '-'} order=${order}`
  }

  private renderHtml(alert: PaymentAlert, copy: AlertCopy): string {
    const tone = copy.severity === 'critical'
      ? { fg: this.color.critical, bg: this.color.criticalSoft }
      : { fg: this.color.warning, bg: this.color.warningSoft }
    const sectionTitle = (text: string) =>
      `<p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${this.color.brandInk};">${text}</p>`

    const rows = this.rowsOf(alert)
      .map((row) => {
        const valueStyle = row.mono ? `font-family:${this.fontMono};font-size:12.5px;word-break:break-all;` : ''
        const note = row.note ? ` <span style="color:${this.color.critical};font-weight:600;">${this.escapeHtml(row.note)}</span>` : ''
        return `<tr>
          <td style="padding:7px 12px 7px 0;border-top:1px solid ${this.color.line};color:${this.color.muted};width:38%;vertical-align:top;">${this.escapeHtml(row.label)}</td>
          <td style="padding:7px 0;border-top:1px solid ${this.color.line};vertical-align:top;${valueStyle}">${this.escapeHtml(row.value)}${note}</td>
        </tr>`
      })
      .join('')

    const error = alert.error
      ? `<tr><td style="padding:0 24px 18px;">
          ${sectionTitle('Lỗi cuối')}
          <div style="font-family:${this.fontMono};font-size:12.5px;background:${this.color.soft};border:1px solid ${this.color.line};border-radius:4px;padding:10px 12px;white-space:pre-wrap;word-break:break-all;">${this.escapeHtml(alert.error)}</div>
        </td></tr>`
      : ''

    const steps = copy.steps.map((step) => `<li style="margin:0 0 4px;">${this.withCode(step)}</li>`).join('')

    return `<!doctype html>
  <html lang="vi">
  <head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${this.escapeHtml(copy.title)}</title></head>
  <body style="margin:0;padding:0;background:${this.color.page};">
  <div style="display:none;max-height:0;overflow:hidden;">${this.escapeHtml(copy.lead)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${this.color.page};">
  <tr><td align="center" style="padding:20px 12px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border:1px solid ${this.color.line};border-radius:6px;font-family:${this.font};font-size:14px;line-height:1.55;color:${this.color.fg};">
    <tr><td style="background-color:${this.color.brand};background-image:linear-gradient(100deg,${this.color.brand} 0%,${this.color.brandEnd} 100%);padding:14px 24px;border-radius:6px 6px 0 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${this.fontBrand};font-size:15px;font-weight:800;color:#ffffff;">Payment Gateway</td>
        <td align="right" style="font-family:${this.fontBrand};font-size:10.5px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#ffffff;">Cảnh báo ✦</td>
      </tr></table>
    </td></tr>
    <tr><td style="padding:20px 24px 4px;">
      <span style="display:inline-block;font-size:12px;font-weight:600;padding:3px 8px;border-radius:4px;color:${tone.fg};background:${tone.bg};">${this.escapeHtml(copy.badge)}</span>
      <h1 style="margin:10px 0 8px;font-size:19px;line-height:1.3;color:${this.color.fg};">${this.escapeHtml(copy.title)}</h1>
      <p style="margin:0;">${this.escapeHtml(copy.lead)}</p>
    </td></tr>
    <tr><td style="padding:16px 24px 18px;">
      ${sectionTitle('Chi tiết')}
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:13.5px;border-collapse:collapse;">${rows}</table>
    </td></tr>
    ${error}
    <tr><td style="padding:0 24px 22px;">
      ${sectionTitle('Việc cần làm')}
      <ol style="margin:0;padding-left:20px;">${steps}</ol>
    </td></tr>
    <tr><td style="background-color:${this.color.brand};background-image:linear-gradient(100deg,${this.color.brand} 0%,${this.color.brandEnd} 100%);padding:22px 24px 20px;border-radius:0 0 6px 6px;">
      <div style="font-family:${this.fontBrand};font-size:26px;line-height:1.1;font-weight:800;color:${this.color.mint};">${this.signature.handle} <span style="font-size:16px;color:#ffffff;">✦</span></div>
      <div style="margin:12px 0;">
        <span style="display:inline-block;margin:0 8px 6px 0;font-family:${this.fontBrand};font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#ffffff;background-color:${this.color.brandEnd};background-image:linear-gradient(90deg,${this.color.sky} 0%,${this.color.brandEnd} 100%);padding:9px 14px;border-radius:999px;">${this.signature.role}</span>
        <a href="${this.signature.site}" style="display:inline-block;margin:0 0 6px;font-size:12.5px;font-weight:600;color:#ffffff;border:1px solid #a9c1f2;padding:8px 14px;border-radius:999px;text-decoration:underline;">${this.signature.site.replace('https://', '')}</a>
      </div>
      <div style="display:inline-block;background:#ffffff;color:${this.color.fg};font-size:12.5px;line-height:1.45;padding:9px 14px;border-radius:10px;">
        Mail tự động từ <b style="color:${this.color.brandInk};">payment-gateway (${this.escapeHtml(this.sourceHost())})</b> lúc ${this.time(alert.occurredAt)}. Mỗi sự cố chỉ gửi một lần.
      </div>
    </td></tr>
  </table>
  </td></tr>
  </table>
  </body>
  </html>`
  }

  private renderText(alert: PaymentAlert, copy: AlertCopy): string {
    const rows = this.rowsOf(alert)
    const width = Math.max(...rows.map((row) => row.label.length)) + 2

    const lines = [
      `[${copy.badge.toUpperCase()}]`,
      copy.title,
      '',
      copy.lead,
      '',
      'CHI TIẾT',
      ...rows.map((row) => `${`${row.label}:`.padEnd(width)}${row.value}${row.note ? ` ${row.note}` : ''}`),
    ]
    if (alert.error)
      lines.push('', 'LỖI CUỐI', alert.error)

    lines.push('', 'VIỆC CẦN LÀM', ...copy.steps.map((step, index) => `${index + 1}. ${step}`))
    lines.push(
      '',
      '--',
      `${this.signature.handle} · ${this.signature.role} · ${this.signature.site}`,
      `Mail tự động từ payment-gateway (${this.sourceHost()}) lúc ${this.time(alert.occurredAt)}. Mỗi sự cố chỉ gửi một lần.`
    )
    return lines.join('\n')
  }
}

export const paymentAlertMailTemplate = new PaymentAlertMailTemplate()

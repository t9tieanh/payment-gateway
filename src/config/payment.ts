export const payosConfig = {
  clientId: process.env.PAYOS_CLIENT_ID || '',
  apiKey: process.env.PAYOS_API_KEY || '',
  checksumKey: process.env.PAYOS_CHECKSUM_KEY || '',
  returnUrl:
    process.env.PAYOS_RETURN_URL || 'http://localhost:3000/payment/success',
  cancelUrl:
    process.env.PAYOS_CANCEL_URL || 'http://localhost:3000/payment/cancel',
  webhookUrl:
    process.env.PAYOS_WEBHOOK_URL || 'http://localhost:4000/orders/payment/payos/webhook',
  webhookConfirmInitialDelayMs: (() => {
    const parsed = Number.parseInt(process.env.PAYOS_WEBHOOK_CONFIRM_INITIAL_DELAY_MS ?? '', 10)
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 30000
  })(),
  webhookConfirmRetryDelaysMs: (() => {
    const delays = (process.env.PAYOS_WEBHOOK_CONFIRM_RETRY_DELAYS_MS ?? '')
      .split(',')
      .map((part) => Number.parseInt(part.trim(), 10))
      .filter((delay) => Number.isFinite(delay) && delay > 0)
    return delays.length > 0 ? delays : [15000, 30000, 45000, 60000, 90000, 120000]
  })(),
}

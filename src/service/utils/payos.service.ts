import { PayOS, Webhook } from '@payos/node'
import { payosConfig } from '~/config/payment'
import ApiError from '~/middleware/ApiError'
import StatusCodes from 'http-status-codes'
import orderRepository from '~/repositories/order.repository'
import Logger from '~/utils/logger'

export interface CreatePayosPaymentInput {
  amount: number
  orderId: string
  description?: string | null
}

export class PayosService {
  private payosClient: PayOS | null = null

  private getPayosClient(): PayOS {
    if (!this.payosClient) {
      if (!payosConfig.clientId || !payosConfig.apiKey || !payosConfig.checksumKey) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'PayOS is not configured (CLIENT_ID, API_KEY, CHECKSUM_KEY)')
      }
      this.payosClient = new PayOS({
        clientId: payosConfig.clientId,
        apiKey: payosConfig.apiKey,
        checksumKey: payosConfig.checksumKey,
      })
    }
    return this.payosClient
  }

  private generateOrderCode(): number {
    const suffix = Math.floor(Math.random() * 1000)
    return Number(`${Date.now()}${suffix}`.slice(-12))
  }

  private shortDescription(orderId: string): string {
    return `DH${orderId.replace(/\W/g, '').slice(-20)}`.slice(0, 25)
  }

  async createPayment(data: CreatePayosPaymentInput): Promise<{ checkoutUrl: string; qrCode: string }> {
    const { amount, orderId, description } = data

    const payos = this.getPayosClient()
    const orderCode = this.generateOrderCode()

    const paymentLink = await payos.paymentRequests.create({
      orderCode,
      amount,
      description: this.shortDescription(orderId),
      returnUrl: payosConfig.returnUrl,
      cancelUrl: payosConfig.cancelUrl,
      items: [
        {
          name: description || 'Order',
          quantity: 1,
          price: amount,
        },
      ],
    })

    await orderRepository.savePaymentLink(orderId, {
      payos_order_code: orderCode,
      checkout_url: paymentLink.checkoutUrl,
      qr_code: paymentLink.qrCode,
    })

    Logger.info(`PayOS link created orderId=${orderId} orderCode=${orderCode}`)

    return {
      checkoutUrl: paymentLink.checkoutUrl,
      qrCode: paymentLink.qrCode,
    }
  }

  async verifyWebhook(body: Webhook): Promise<{ orderCode: number; amount: number }> {
    const payos = this.getPayosClient()
    let webhookData
    try {
      webhookData = await payos.webhooks.verify(body)
    } catch (err) {
      Logger.warn(`PayOS webhook verify failed: ${err}`)
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid webhook signature')
    }

    if (!webhookData || webhookData.code !== '00') {
      throw new ApiError(StatusCodes.PAYMENT_REQUIRED, 'Payment is not successful')
    }

    return {
      orderCode: webhookData.orderCode,
      amount: webhookData.amount,
    }
  }

  async confirmWebhook(): Promise<void> {
    if (!payosConfig.webhookUrl) {
      throw new ApiError(StatusCodes.BAD_REQUEST, 'PAYOS_WEBHOOK_URL is not configured')
    }

    const payos = this.getPayosClient()
    await payos.webhooks.confirm(payosConfig.webhookUrl)
    Logger.info(`PayOS webhook registered: ${payosConfig.webhookUrl}`)
  }

  /**
   * Retry webhook registration after an initial delay so API gateway / tunnel can come up.
   * Default backoff: 15s → 30s → 45s → 60s → 90s → 120s between attempts.
   */
  async confirmWebhookWithRetry(
    options: {
      initialDelayMs?: number
      retryDelaysMs?: number[]
    } = {}
  ): Promise<void> {
    const initialDelayMs = options.initialDelayMs ?? payosConfig.webhookConfirmInitialDelayMs
    const retryDelaysMs = options.retryDelaysMs ?? payosConfig.webhookConfirmRetryDelaysMs
    const maxAttempts = retryDelaysMs.length + 1

    Logger.info(
      `PayOS webhook confirm scheduled (url=${payosConfig.webhookUrl}, initialDelay=${initialDelayMs / 1000}s, maxAttempts=${maxAttempts})`
    )

    if (initialDelayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, initialDelayMs))
    }

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.confirmWebhook()
        if (attempt > 1) {
          Logger.info(`PayOS webhook registered on attempt ${attempt}/${maxAttempts}`)
        }
        return
      } catch (err) {
        const isLastAttempt = attempt === maxAttempts
        if (isLastAttempt) {
          throw err
        }

        const delayMs = retryDelaysMs[attempt - 1]
        Logger.warn(
          `PayOS webhook confirm failed (attempt ${attempt}/${maxAttempts}): ${err}. Retrying in ${delayMs / 1000}s...`
        )
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }
}

export default new PayosService()

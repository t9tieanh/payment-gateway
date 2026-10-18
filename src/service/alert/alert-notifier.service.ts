import { AlertChannel } from '~/enums/alertChannel.enum'
import { PaymentAlert } from '~/types/payment-alert'
import Logger from '~/utils/logger'

/** A channel that tells the gateway admin about a payment alert. */
export abstract class AlertNotifierService {
  abstract readonly channel: AlertChannel

  abstract isEnabled(): boolean

  protected abstract deliver(alert: PaymentAlert): Promise<void>

  async notify(alert: PaymentAlert): Promise<void> {
    if (!this.isEnabled())
      return

    await this.deliver(alert)
    Logger.info(`Alert ${alert.kind} sent via ${this.channel} (order=${alert.orderId ?? alert.payosOrderCode ?? '-'})`)
  }
}

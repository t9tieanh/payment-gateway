import { AppProfile } from '~/config/apps'
import { HandlerStatus } from '~/enums/handlerStatus.enum'
import { PaymentHandlerKind } from '~/enums/paymentHandlerKind.enum'
import orderRepository from '~/repositories/order.repository'
import { Order } from '~/types/order'
import Logger from '~/utils/logger'

/** What a connected app wants done once one of its orders is paid. */
export abstract class PaymentHandlerService {
  abstract readonly kind: PaymentHandlerKind

  protected readonly maxAttempts: number = 3
  protected readonly retryDelayMs: number = 2000

  protected abstract execute(order: Order, app: AppProfile): Promise<void>

  async handle(order: Order, app: AppProfile): Promise<void> {
    for (let attempt = 1; attempt <= this.maxAttempts; attempt++) {
      try {
        await this.execute(order, app)
        await orderRepository.saveHandlerResult(order.id, HandlerStatus.Done, attempt)
        Logger.info(`Payment handler ${this.kind} done (app=${app.code}, order=${order.id}, attempt=${attempt})`)
        return
      } catch (err) {
        Logger.warn(
          `Payment handler ${this.kind} failed (app=${app.code}, order=${order.id}, attempt=${attempt}/${this.maxAttempts}): ${err}`
        )
        if (attempt < this.maxAttempts)
          await new Promise((resolve) => setTimeout(resolve, this.retryDelayMs * attempt))
      }
    }

    await orderRepository.saveHandlerResult(order.id, HandlerStatus.Failed, this.maxAttempts)
  }
}

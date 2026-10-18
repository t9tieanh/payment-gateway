import { PaymentAlertKind } from '~/enums/paymentAlertKind.enum'
import { Order } from '~/types/order'
import { PaymentAlert } from '~/types/payment-alert'
import Logger from '~/utils/logger'
import { alertNotifierFactory } from './impl/alert-notifier.factory'

type AlertFields = Partial<Omit<PaymentAlert, 'kind' | 'occurredAt'>>

class PaymentAlertService {
  /** Never rejects: a failing channel is logged and must not affect the payment flow. */
  async notify(alert: PaymentAlert): Promise<void> {
    for (const notifier of alertNotifierFactory.all()) {
      try {
        await notifier.notify(alert)
      } catch (err) {
        Logger.error(
          `Alert ${alert.kind} via ${notifier.channel} failed (order=${alert.orderId ?? alert.payosOrderCode ?? '-'}): ${err}`
        )
      }
    }
  }

  build(kind: PaymentAlertKind, fields: AlertFields): PaymentAlert {
    return {
      kind,
      occurredAt: new Date().toISOString(),
      app: null,
      orderId: null,
      referenceId: null,
      payosOrderCode: null,
      expectedAmount: null,
      receivedAmount: null,
      paidAt: null,
      transferDescription: null,
      handlerKind: null,
      handlerAttempts: null,
      error: null,
      ...fields,
    }
  }

  fieldsOf(order: Order): AlertFields {
    return {
      app: order.app,
      orderId: order.id,
      referenceId: order.reference_id,
      payosOrderCode: order.payos_order_code,
      expectedAmount: order.amount,
      paidAt: order.paid_at,
    }
  }
}

export default new PaymentAlertService()

import axios from 'axios'
import crypto from 'crypto'
import { AppProfile } from '~/config/apps'
import { PaymentHandlerKind } from '~/enums/paymentHandlerKind.enum'
import { Order } from '~/types/order'
import { PaymentHandlerService } from '../payment-handler.service'

const CALLBACK_TIMEOUT_MS = 10_000

class HttpCallbackHandler extends PaymentHandlerService {
  readonly kind = PaymentHandlerKind.HTTP_CALLBACK

  protected async execute(order: Order, app: AppProfile): Promise<void> {
    const body = JSON.stringify({
      orderId: order.id,
      referenceId: order.reference_id,
      amount: order.amount,
      status: order.status,
      paidAt: order.paid_at,
    })
    const signature = crypto.createHmac('sha256', app.callbackSecret).update(body).digest('hex')

    await axios.post(app.callbackUrl, body, {
      headers: { 'Content-Type': 'application/json', 'x-signature': signature },
      timeout: CALLBACK_TIMEOUT_MS,
    })
  }
}

export const httpCallbackHandler = new HttpCallbackHandler()

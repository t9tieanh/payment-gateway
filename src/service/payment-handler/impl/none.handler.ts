import { PaymentHandlerKind } from '~/enums/paymentHandlerKind.enum'
import { PaymentHandlerService } from '../payment-handler.service'

/** For an app that only reads the order status itself. */
class NoneHandler extends PaymentHandlerService {
  readonly kind = PaymentHandlerKind.NONE

  protected async execute(): Promise<void> {}
}

export const noneHandler = new NoneHandler()

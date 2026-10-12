import { PaymentHandlerKind } from '~/enums/paymentHandlerKind.enum'
import { PaymentHandlerService } from '../payment-handler.service'
import { httpCallbackHandler } from './http-callback.handler'
import { noneHandler } from './none.handler'

class PaymentHandlerFactory {
  private readonly handlers: Record<PaymentHandlerKind, PaymentHandlerService> = {
    [PaymentHandlerKind.HTTP_CALLBACK]: httpCallbackHandler,
    [PaymentHandlerKind.NONE]: noneHandler,
  }

  for(kind: PaymentHandlerKind): PaymentHandlerService {
    return this.handlers[kind]
  }
}

export const paymentHandlerFactory = new PaymentHandlerFactory()

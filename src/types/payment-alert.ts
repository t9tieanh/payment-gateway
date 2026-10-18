import { PaymentAlertKind } from '~/enums/paymentAlertKind.enum'
import { PaymentHandlerKind } from '~/enums/paymentHandlerKind.enum'

/** A payment whose money was received but whose processing stopped before the end. */
export interface PaymentAlert {
  kind: PaymentAlertKind
  occurredAt: string
  app: string | null
  orderId: string | null
  referenceId: string | null
  payosOrderCode: number | null
  expectedAmount: number | null
  receivedAmount: number | null
  paidAt: string | null
  transferDescription: string | null
  handlerKind: PaymentHandlerKind | null
  handlerAttempts: number | null
  error: string | null
}

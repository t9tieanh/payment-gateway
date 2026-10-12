import { HandlerStatus } from '~/enums/handlerStatus.enum'
import { OrderStatus } from '~/enums/orderStatus.enum'

/** A row of the `orders` table. */
export interface Order {
  id: string
  app: string
  reference_id: string
  amount: number
  description: string | null
  status: OrderStatus
  payos_order_code: number | null
  checkout_url: string | null
  qr_code: string | null
  paid_at: string | null
  handler_status: HandlerStatus
  handler_attempts: number
  created_at: string
  updated_at: string
}

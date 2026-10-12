import { PostgrestError } from '@supabase/supabase-js'
import { HandlerStatus } from '~/enums/handlerStatus.enum'
import { OrderStatus } from '~/enums/orderStatus.enum'
import supabase from '~/service/utils/supabase.service'
import { Order } from '~/types/order'

const TABLE = 'orders'

function assertOk(error: PostgrestError | null, action: string): void {
  if (error)
    throw new Error(`orders ${action} failed: ${error.message} (${error.code})`)
}

class OrderRepository {
  /** Creates the order unless the app already has one with this reference id, and returns the stored row either way. */
  async findOrCreate(data: Pick<Order, 'app' | 'reference_id' | 'amount' | 'description'>): Promise<Order> {
    const { error } = await supabase
      .from(TABLE)
      .upsert(data, { onConflict: 'app,reference_id', ignoreDuplicates: true })
    assertOk(error, 'create')

    const { data: order, error: readError } = await supabase
      .from(TABLE)
      .select()
      .eq('app', data.app)
      .eq('reference_id', data.reference_id)
      .single<Order>()
    assertOk(readError, 'read')

    return order as Order
  }

  async findById(id: string): Promise<Order | null> {
    const { data, error } = await supabase.from(TABLE).select().eq('id', id).maybeSingle<Order>()
    assertOk(error, 'read')

    return data
  }

  async findByPayosOrderCode(orderCode: number): Promise<Order | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select()
      .eq('payos_order_code', orderCode)
      .maybeSingle<Order>()
    assertOk(error, 'read')

    return data
  }

  async savePaymentLink(
    id: string,
    link: Pick<Order, 'payos_order_code' | 'checkout_url' | 'qr_code'>
  ): Promise<void> {
    const { error } = await supabase.from(TABLE).update(this.touched(link)).eq('id', id)
    assertOk(error, 'update')
  }

  /** Returns false when the order was not pending any more, so only one caller ever gets true. */
  async markPaid(id: string): Promise<boolean> {
    const { data, error } = await supabase
      .from(TABLE)
      .update(this.touched({ status: OrderStatus.Paid, paid_at: new Date().toISOString() }))
      .eq('id', id)
      .eq('status', OrderStatus.Pending)
      .select('id')
    assertOk(error, 'update')

    return (data ?? []).length === 1
  }

  async saveHandlerResult(id: string, status: HandlerStatus, attempts: number): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update(this.touched({ handler_status: status, handler_attempts: attempts }))
      .eq('id', id)
    assertOk(error, 'update')
  }

  private touched<T extends Partial<Order>>(changes: T): T & { updated_at: string } {
    return { ...changes, updated_at: new Date().toISOString() }
  }
}

export default new OrderRepository()

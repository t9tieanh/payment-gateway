import { HandlerStatus } from '~/enums/handlerStatus.enum';
import { OrderStatus } from '~/enums/orderStatus.enum';
import { Order } from '~/types/order';

export interface OrderDto {
    id: string;
    referenceId: string;
    amount: number;
    description: string | null;
    status: OrderStatus;
    checkoutUrl: string | null;
    qrCode: string | null;
    paidAt: string | null;
    handlerStatus: HandlerStatus;
}

export const toOrderDto = (order: Order): OrderDto => ({
    id: order.id,
    referenceId: order.reference_id,
    amount: order.amount,
    description: order.description,
    status: order.status,
    checkoutUrl: order.checkout_url,
    qrCode: order.qr_code,
    paidAt: order.paid_at,
    handlerStatus: order.handler_status,
});

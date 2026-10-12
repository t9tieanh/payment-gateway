import { isUUID } from 'class-validator';
import { CreateOrderDto } from '~/dto/request/order.dto';
import ApiError from '~/middleware/ApiError';
import { OrderStatus } from '~/enums/orderStatus.enum';
import { OrderDto, toOrderDto } from '~/dto/response/order.dto';
import orderRepository from '~/repositories/order.repository';
import payosService from '../utils/payos.service';

class OrderService {
    async createOrder(app: string, orderData: CreateOrderDto): Promise<OrderDto> {
        const order = await orderRepository.findOrCreate({
            app,
            reference_id: orderData.referenceId,
            amount: orderData.amount,
            description: orderData.description ?? null,
        });

        if (order.status === OrderStatus.Paid)
            throw new ApiError(409, `Order ${orderData.referenceId} is already paid`);

        if (order.amount !== orderData.amount)
            throw new ApiError(409, `Order ${orderData.referenceId} already exists with a different amount`);

        if (order.checkout_url)
            return toOrderDto(order);

        const payment = await payosService.createPayment({
            amount: order.amount,
            orderId: order.id,
            description: order.description,
        });

        return toOrderDto({ ...order, checkout_url: payment.checkoutUrl, qr_code: payment.qrCode });
    }

    async getOrder(app: string, orderId: string): Promise<OrderDto> {
        const order = isUUID(orderId) ? await orderRepository.findById(orderId) : null;
        if (!order || order.app !== app)
            throw new ApiError(404, 'Order not found');

        return toOrderDto(order);
    }
}

export default new OrderService();

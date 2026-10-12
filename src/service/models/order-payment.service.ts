import ApiError from '~/middleware/ApiError';
import { StatusCodes } from 'http-status-codes';
import payosService from '../utils/payos.service';
import { appRegistry } from '~/config/apps';
import { HandlerStatus } from '~/enums/handlerStatus.enum';
import orderRepository from '~/repositories/order.repository';
import { paymentHandlerFactory } from '~/service/payment-handler/impl/payment-handler.factory';
import Logger from '~/utils/logger';
import { Webhook } from '@payos/node';

class OrderPaymentService {
    async handlePayosWebhook(body: Webhook): Promise<void> {
        const webhookData = await payosService.verifyWebhook(body);

        const order = await orderRepository.findByPayosOrderCode(webhookData.orderCode);

        // PayOS probes the webhook URL with a sample orderCode when the URL is registered
        if (!order) {
            Logger.info(`PayOS webhook: no order for orderCode ${webhookData.orderCode}, acknowledged`);
            return;
        }

        if (order.amount !== webhookData.amount)
            throw new ApiError(StatusCodes.BAD_REQUEST, 'Amount does not match the order');

        const paid = await orderRepository.markPaid(order.id);
        if (!paid) {
            Logger.info(`PayOS webhook: order ${order.id} already paid, skipping`);
            return;
        }

        Logger.info(`PayOS webhook: order ${order.id} paid (app=${order.app})`);

        void this.runPaymentHandler(order.id);
    }

    private async runPaymentHandler(orderId: string): Promise<void> {
        try {
            const order = await orderRepository.findById(orderId);
            if (!order)
                throw new Error('order not found');

            const app = appRegistry.findByCode(order.app);
            if (!app) {
                Logger.error(`Payment handler skipped: app ${order.app} of order ${orderId} is not configured`);
                await orderRepository.saveHandlerResult(orderId, HandlerStatus.Failed, 0);
                return;
            }

            await paymentHandlerFactory.for(app.handler).handle(order, app);
        } catch (err) {
            Logger.error(`Payment handler crashed for order ${orderId}: ${err}`);
        }
    }
}

export default new OrderPaymentService();

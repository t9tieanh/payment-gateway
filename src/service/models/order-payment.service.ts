import payosService, { PayosService } from '../utils/payos.service';
import { appRegistry } from '~/config/apps';
import { HandlerStatus } from '~/enums/handlerStatus.enum';
import { PaymentAlertKind } from '~/enums/paymentAlertKind.enum';
import orderRepository from '~/repositories/order.repository';
import paymentAlertService from '~/service/alert/payment-alert.service';
import { paymentHandlerFactory } from '~/service/payment-handler/impl/payment-handler.factory';
import { Order } from '~/types/order';
import Logger from '~/utils/logger';
import { Webhook } from '@payos/node';

class OrderPaymentService {
    async handlePayosWebhook(body: Webhook): Promise<void> {
        const webhookData = await payosService.verifyWebhook(body);
        const received = {
            payosOrderCode: webhookData.orderCode,
            receivedAmount: webhookData.amount,
            transferDescription: webhookData.description || null,
        };

        const order = await orderRepository.findByPayosOrderCode(webhookData.orderCode);

        // PayOS probes the webhook URL with a sample orderCode when the URL is registered
        if (!order) {
            Logger.info(`PayOS webhook: no order for orderCode ${webhookData.orderCode}, acknowledged`);
            if (webhookData.orderCode !== PayosService.SAMPLE_ORDER_CODE)
                void paymentAlertService.notify(paymentAlertService.build(PaymentAlertKind.OrderNotFound, received));
            return;
        }

        // Acknowledged: a signed webhook with the wrong amount stays wrong however often PayOS resends it
        if (order.amount !== webhookData.amount) {
            Logger.error(`PayOS webhook: order ${order.id} expects ${order.amount}, received ${webhookData.amount}`);
            void paymentAlertService.notify(paymentAlertService.build(PaymentAlertKind.AmountMismatch, {
                ...paymentAlertService.fieldsOf(order),
                ...received,
            }));
            return;
        }

        const paid = await orderRepository.markPaid(order.id);
        if (!paid) {
            Logger.info(`PayOS webhook: order ${order.id} already paid, skipping`);
            return;
        }

        Logger.info(`PayOS webhook: order ${order.id} paid (app=${order.app})`);

        void this.runPaymentHandler(order.id);
    }

    private async runPaymentHandler(orderId: string): Promise<void> {
        let order: Order | null = null;
        try {
            order = await orderRepository.findById(orderId);
            if (!order)
                throw new Error('order not found');

            const app = appRegistry.findByCode(order.app);
            if (!app) {
                Logger.error(`Payment handler skipped: app ${order.app} of order ${orderId} is not configured`);
                await orderRepository.saveHandlerResult(orderId, HandlerStatus.Failed, 0);
                void paymentAlertService.notify(
                    paymentAlertService.build(PaymentAlertKind.AppNotConfigured, paymentAlertService.fieldsOf(order))
                );
                return;
            }

            const handler = paymentHandlerFactory.for(app.handler);
            const outcome = await handler.handle(order, app);
            if (outcome.status === HandlerStatus.Failed) {
                void paymentAlertService.notify(paymentAlertService.build(PaymentAlertKind.HandlerFailed, {
                    ...paymentAlertService.fieldsOf(order),
                    handlerKind: handler.kind,
                    handlerAttempts: outcome.attempts,
                    error: outcome.lastError,
                }));
            }
        } catch (err) {
            Logger.error(`Payment handler crashed for order ${orderId}: ${err}`);
            const fields = order ? paymentAlertService.fieldsOf(order) : { orderId };
            void paymentAlertService.notify(
                paymentAlertService.build(PaymentAlertKind.HandlerCrashed, { ...fields, error: String(err) })
            );
        }
    }
}

export default new OrderPaymentService();

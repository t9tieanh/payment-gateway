import { Request, Response, NextFunction } from 'express';
import orderService from '~/service/models/order.service';
import sendResponse from '~/dto/response/send-response';
import ApiError from '~/middleware/ApiError';
import orderPaymentService from '~/service/models/order-payment.service';
import Logger from '~/utils/logger';
import { Webhook } from '@payos/node';

class OrderController {
    async createOrder(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.appProfile)
                throw new ApiError(401, 'Invalid API key');

            const newOrder = await orderService.createOrder(req.appProfile.code, req.data);
            sendResponse(res, {
                code: 200,
                message: 'Order created',
                result: newOrder
            });
        } catch (error) {
            next(error);
        }
    }

    async getOrder(req: Request, res: Response, next: NextFunction) {
        try {
            if (!req.appProfile)
                throw new ApiError(401, 'Invalid API key');

            const order = await orderService.getOrder(req.appProfile.code, req.params.id as string);
            sendResponse(res, {
                code: 200,
                message: 'Order fetched',
                result: order
            });
        } catch (error) {
            next(error);
        }
    }

    async payosWebhook(req: Request, res: Response) {
        try {
            await orderPaymentService.handlePayosWebhook(req.body as Webhook);
            return res.status(200).json({ error: 0, message: 'success', data: null });
        } catch (err) {
            Logger.error(`PayOS webhook failed: ${err}`);
            const status = err instanceof ApiError ? err.status : 500;
            const isClientError = status >= 400 && status < 500;
            return res.status(isClientError ? 400 : 500).json({
                error: -1,
                message: isClientError && err instanceof Error ? err.message : 'Webhook processing failed',
                data: null,
            });
        }
    }
}

export default new OrderController();

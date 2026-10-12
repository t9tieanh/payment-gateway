import { Router } from 'express';
import orderController from '~/controllers/order.controller';
import validateDto from '~/middleware/validateDto.midleware';
import { CreateOrderDto } from '~/dto/request/order.dto'
import ApiKeyAuthentication from '~/middleware/apiKey.midleware';

export const orderRouter = Router();
orderRouter.post('/payment/payos/webhook', orderController.payosWebhook);
orderRouter.use(ApiKeyAuthentication());

orderRouter.post('/', validateDto(CreateOrderDto), orderController.createOrder);
orderRouter.get('/:id', orderController.getOrder);

export default orderRouter;

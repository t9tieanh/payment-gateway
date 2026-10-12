import express, { Router } from 'express'
import orderRouter from '~/routes/order.route';

const IndexRouter: Router = express.Router()

IndexRouter.use('/orders', orderRouter)

export default IndexRouter

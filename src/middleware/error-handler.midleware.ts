import { StatusCodes } from 'http-status-codes'
import ApiError from './ApiError'
import { Request, Response, NextFunction } from 'express'
import Logger from '~/utils/logger'

// Central error handler: every error passed to next() ends here
export const errorHandlingMiddleware = (err: ApiError, req: Request, res: Response, next: NextFunction) => {
  if (!err.status) err.status = StatusCodes.INTERNAL_SERVER_ERROR

  const responseError = {
    code: err.status,
    message: err.message || StatusCodes[err.status],
    stack: err.stack
  }

  Logger.error(`Error occurred: ${JSON.stringify(responseError)}`)

  // Only 401 keeps its HTTP status; any other error answers 200 with the real status in `code`
  res.status(err.status !== 401 ? StatusCodes.OK : err.status).json(responseError)
}

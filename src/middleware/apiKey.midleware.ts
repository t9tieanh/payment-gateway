import { Request, Response, NextFunction } from 'express';
import ApiError from './ApiError';
import { appRegistry } from '~/config/apps';

const ApiKeyAuthentication = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    const apiKey = req.header('x-api-key');
    const app = apiKey ? appRegistry.findByApiKey(apiKey) : undefined;
    if (!app)
      return next(new ApiError(401, 'Invalid API key'));

    req.appProfile = app;
    next();
  };
}

export default ApiKeyAuthentication;

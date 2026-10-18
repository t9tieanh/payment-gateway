import 'reflect-metadata';
import 'dotenv/config';
import express from 'express';
import { errorHandlingMiddleware } from './middleware/error-handler.midleware'
import { env } from './config/env';
import { appRegistry } from './config/apps';
import indexRoute from '~/routes';
import Logger from './utils/logger';
import payosService from './service/utils/payos.service';
import { alertNotifierFactory } from './service/alert/impl/alert-notifier.factory';

const app = express();

app.use(express.json());

//health check
app.get('/health', (_req, res) => {
  res.status(200).send('OK');
});

app.use(indexRoute);
app.use(errorHandlingMiddleware);

const PORT = env.PORT || 4000;

async function bootstrap() {
  try {
    Logger.info(`Connected apps: ${appRegistry.all().map((profile) => `${profile.code} (${profile.handler})`).join(', ')}`);

    for (const notifier of alertNotifierFactory.all()) {
      if (notifier.isEnabled())
        Logger.info(`Alert ${notifier.channel} enabled`);
      else
        Logger.warn(`Alert ${notifier.channel} disabled: missing configuration`);
    }

    // Must listen before PayOS confirm — PayOS pings the webhook URL
    await new Promise<void>((resolve) => {
      app.listen(PORT, () => {
        Logger.info(`payment-gateway running at http://localhost:${PORT}`);
        resolve();
      });
    });

    // Run in background: PayOS pings the public webhook URL (gateway/tunnel may start after this service).
    if (process.env.PAYOS_CONFIRM_WEBHOOK === 'true') {
      void payosService.confirmWebhookWithRetry().catch((err) => {
        Logger.warn(`PayOS webhook confirm skipped after retries: ${err}`)
      })
    }

  } catch (error) {
    Logger.error(`Bootstrap failed: ${error}`);
    process.exit(1);
  }
}

bootstrap();

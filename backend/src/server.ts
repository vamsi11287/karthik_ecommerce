import { createApp } from './app';
import { connectDatabase } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { getStoreSettings } from './modules/settings/storeSettings.model';

const startServer = async () => {
  try {
    // 1. Connect to Database
    await connectDatabase();

    // 2. Ensure initial store settings exist
    await getStoreSettings();

    // 3. Create Express App
    const app = createApp();

    // 4. Start Listening
    const server = app.listen(env.PORT, () => {
      logger.info(`LUXWEAR E-Commerce Server listening on port ${env.PORT} in ${env.NODE_ENV} mode`);
      logger.info(`API Base URL: http://localhost:${env.PORT}/api/v1`);
    });

    // 5. Automated sweep for 10-minute expired checkout reservations (Amazon/Flipkart model)
    const sweepInterval = setInterval(async () => {
      try {
        const { CheckoutService } = await import('./modules/checkout/checkout.service');
        const released = await CheckoutService.cleanupExpiredReservations();
        if (released > 0) {
          logger.info(`Automated sweep released ${released} expired checkout reservations.`);
        }
      } catch (err) {
        logger.error('Error during expired reservation sweep:', err);
      }
    }, 60 * 1000);

    // 6. Graceful Shutdown handlers
    const shutdown = () => {
      clearInterval(sweepInterval);
      logger.info('Graceful shutdown initiated. Closing server...');
      server.close(() => {
        logger.info('HTTP server closed. Exiting process.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

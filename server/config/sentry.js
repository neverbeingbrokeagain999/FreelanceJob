import * as Sentry from '@sentry/node';
import { logger } from './logger.js';

export const initSentry = (app) => {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.SENTRY_DSN) {
      logger.warn('Sentry DSN not found in environment variables');
      return;
    }

    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      integrations: [
        new Sentry.Integrations.Http({ tracing: true }),
        new Sentry.Integrations.Express({ app }),
        ...Sentry.autoDiscoverNodePerformanceMonitoringIntegrations(),
      ],
      tracesSampleRate: 0.2,
      profilesSampleRate: 0.1,
      beforeSend(event) {
        // Remove sensitive data
        if (event.request && event.request.data) {
          delete event.request.data.password;
          delete event.request.data.token;
        }
        return event;
      }
    });

    // RequestHandler creates a separate execution context
    app.use(Sentry.Handlers.requestHandler());
    // TracingHandler creates a trace for every incoming request
    app.use(Sentry.Handlers.tracingHandler());

    logger.info('Sentry initialized successfully');
  } else {
    logger.info('Sentry initialization skipped in non-production environment');
  }
};

export const captureException = (error, context = {}) => {
  if (process.env.NODE_ENV === 'production' && error) {
    Sentry.withScope((scope) => {
      scope.setExtras(context);
      Sentry.captureException(error);
    });
  } else {
    logger.error('Error:', {
      message: error.message,
      stack: error.stack,
      ...context
    });
  }
};

export default {
  initSentry,
  captureException
};

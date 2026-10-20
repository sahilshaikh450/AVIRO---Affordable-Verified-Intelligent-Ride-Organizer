import * as Sentry from '@sentry/react';

const SENTRY_DSN = process.env.REACT_APP_SENTRY_DSN;

// Error tracking is optional: without REACT_APP_SENTRY_DSN nothing is sent
export const initMonitoring = () => {
  if (!SENTRY_DSN) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: process.env.NODE_ENV,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
};

export const ErrorBoundary = Sentry.ErrorBoundary;

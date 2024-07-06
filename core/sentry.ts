// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
import * as Sentry from "@sentry/node"
import { nodeProfilingIntegration } from "@sentry/profiling-node"

if(process.env.OPTIN_ERROR_REPORTING) {
  Sentry.init({
    dsn: "https://72d7e2f2ba0eeae97f77b368b70d981a@o4507555499409408.ingest.de.sentry.io/4507555551445072",
    integrations: [
      nodeProfilingIntegration(),
    ],
    // Performance Monitoring
    tracesSampleRate: 1.0, //  Capture 100% of the transactions

    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });
}

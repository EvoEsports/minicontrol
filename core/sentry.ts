const Sentry = require('@sentry/node');
const optOut:boolean = (process.env['OPT_OUT_ERROR_REPORTING'] || 'false') == 'true';

if (!process.env['SENTRY_INIT']) {
    if (optOut == false) {
        process.env['SENTRY_INIT'] = 'true';
        Sentry.init({
            release: 'minicontrol@' + process.env.npm_package_version,
            dsn: 'https://72d7e2f2ba0eeae97f77b368b70d981a@o4507555499409408.ingest.de.sentry.io/4507555551445072',
            tracesSampleRate: 1.0,
            profilesSampleRate: 1.0
        });
        console.log('Sending error reports to Sentry.io: ENABLED');
        console.log('\nIf you wish not to send error reports, set environment:\nOPT_OUT_ERROR_REPORTING=true\n');
    } else {
        console.log('Sending error reports to Sentry.io: DISABLED');
    }
}

module.exports = Sentry;

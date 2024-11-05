const Sentry = require('@sentry/node');

if (!process.env['SENTRY_INIT']) {
    if (process.env['DEBUG'] != 'true') {
        process.env['SENTRY_INIT'] = 'true';
        Sentry.init({
            release: 'minicontrol@' + process.env.npm_package_version,
            dsn: 'https://72d7e2f2ba0eeae97f77b368b70d981a@o4507555499409408.ingest.de.sentry.io/4507555551445072',
            tracesSampleRate: 1.0,
            profilesSampleRate: 1.0
        });
        console.log('Debug mode: DISABLED');
        console.log('Sending error reports to Sentry.io: ENABLED');
        console.log('\nIf you wish not to send error reports, set environment:\nDEBUG=true\nDEBUGLEVEL=0\n');
    } else {
        const level = process.env.DEBUGLEVEL || 1;
        console.log('Debug mode: ENABLED, level ' + level);
        console.log('Sending error reports to Sentry.io: DISABLED');
    }
}

module.exports = Sentry;

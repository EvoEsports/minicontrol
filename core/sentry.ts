const Sentry = require("@sentry/node");
const errorReporting: boolean = (process.env.ERROR_REPORTING || "true") === "true";
const debugEnabled: boolean = (process.env.DEBUG || "true") === "true";
let init = false;

if (!init) {
    init = true;
    if (errorReporting && !debugEnabled) {
        Sentry.init({
            release: `minicontrol@${process.env.npm_package_version}`,
            dsn: "https://72d7e2f2ba0eeae97f77b368b70d981a@o4507555499409408.ingest.de.sentry.io/4507555551445072",
            tracesSampleRate: 1.0,
            profilesSampleRate: 1.0,
        });
        console.log("Sending error reports to Sentry.io: ENABLED");
        console.log("\nIf you wish not to send error reports, set environment:\nERROR_REPORTING=false\n");
    } else {
        if (debugEnabled) {
            console.log("Sentry.io error reporting is disabled while DEBUG mode is enabled.");
        }
        console.log("Sending error reports to Sentry.io: DISABLED");
    }
}

module.exports = Sentry;

[Back to Concept](../concept.md)

# log (core/log.ts)

## Table of contents

- [API](#api)
- [Behavior](#behavior)
- [Usage examples](#usage-examples)
- [Notes](#notes)

The `log` module provides a thin wrapper around Node console logging with:
- Optional color parsing for Trackmania `$` color codes (and formatting shortcuts)
- Optional filesystem logging for persistence

## API (default instance)

```ts
import log from "@core/log";
log.debug(str); // Debug-level output
log.info(str);  // Informational output and file write
log.warn(str);  // Warnings
log.error(str); // Errors
```

## Behavior

- `Tm2Console()` converts `$` color and style codes from Trackmania formatting into ANSI sequences for console output based on `ANSILEVEL` environment variable.
- `info()` also writes the message to `userdata/log/YYYY-M-D_console.log` when `WRITELOG=true`.

## Usage examples

```ts
import log from "@core/log";
log.info("Server started");
log.debug("This will be printed if DEBUG env var is set");
```

## Notes
- The console output is sanitized using `removeColors()` when `ansiLevel === 0` so logs remain readable. Use `ANSILEVEL` to adjust color fidelity.
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
 - `info()`, `warn()` and `error()` write to disk when `WRITELOG=true`. Files are written under `userdata/log/` with ISO date filenames: `YYYY-MM-DD_console.log`.
 - `debug()` messages are written to disk only when both `WRITELOG=true` and `DEBUG=true` (to avoid noisy logs).
 - Each line in the log file is a standardized line of the format: `TIMESTAMP [LEVEL] MESSAGE` where `TIMESTAMP` is the UTC ISO timestamp and `LEVEL` is `INFO`, `WARN`, or `ERROR`.
 - `log` instantiates a per-process formatter based on `ANSILEVEL` at startup to avoid re-parsing format codes on every message (optimizes runtime performance).
 - Hue mapping: when converting `$` color codes to 4-bit ANSI colors, MINIcontrol now uses centered 60° sectors (0=red, 60=yellow, 120=green, 180=cyan, 240=blue, 300=magenta) to better approximate 4-bit ANSI colors. Saturation and lightness are used to detect desaturated/very-bright colors and map them to neutral greys or bright white.
 - Hue mapping: when converting `$` color codes to 4-bit ANSI colors, MINIcontrol now uses centered 60° sectors (0=red, 60=yellow, 120=green, 180=cyan, 240=blue, 300=magenta) to better approximate 4-bit ANSI colors. Saturation and perceived luminance are used to detect desaturated/very-bright colors and map them to neutral greys or bright white.
	 - Desaturation threshold: `s < 0.15` — treat as greyscale (map to white/black depending on luminance).
	 - Bright threshold: `luminance >= 0.65` — use bright (ANSI prefix 9).
 - Very bright threshold: `luminance >= 0.93` — map directly to bright white (ANSI 7 with prefix 9).
 - Black threshold: `luminance <= 0.12` — map to black (ANSI 0).
 - Greyscale mid threshold for light gray: `luminance <= 0.60` — map greys to light gray (ANSI 7) when desaturated.

```ts
import log from "@core/log";
log.info("Server started");
log.debug("This will be printed if DEBUG env var is set");
```

## Notes
- The console output is sanitized using `removeColors()` when `ansiLevel === 0` so logs remain readable. Use `ANSILEVEL` to adjust color fidelity.
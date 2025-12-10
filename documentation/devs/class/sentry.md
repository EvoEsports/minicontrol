[Back to Concept](../concept.md)

# Sentry integration (core/sentry.ts)

## Table of contents

- [Controls](#controls)
- [Behavior](#behavior)

MINIcontrol optionally reports errors to Sentry.io. The integration is a single module that initializes Sentry during startup.

## Controls

- `ERROR_REPORTING` (env): `true|false` (default `true`) — toggles error reporting on/off.

If enabled, `sentry.init()` is called with package `release` `minicontrol@${process.env.npm_package_version}`.

Sentry config is basic and intended to be opt-out by environment. You can disable it in runtime by setting `ERROR_REPORTING=false`.
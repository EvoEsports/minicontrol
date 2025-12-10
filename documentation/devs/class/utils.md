[Back to Concept](../concept.md)

# Utilities & helpers (core/utils.ts)

## Table of contents

- [Common functions](#common-functions)
- [Important helpers](#important-helpers)
- [Best practices](#best-practices)

`core/utils.ts` contains many commonly used helper functions across the core and plugins. These utilities are safe to import and use in plugins.

## Common functions

### sleep(ms: number)
Simple sleep helper.

```ts
await sleep(200);
```

### randomInt(min, max)
Return random integer in range [min, max].

### uuidv4()
Generate a RFC4122 v4 UUID.

### processColorString(str, prefix="")
Map `¤color¤` style markers (used internally for logging) into Trackmania color codes (`$rgb`) or optional prefix.

Useful when building `tmc` console messages to maintain colorization.

### chunkArray(array, chunkSize)
Split an array into sub-arrays of size `chunkSize`.

### modLightness(color, percent)
Adjust color luminance and return new hex string.

### rgb2hsl / hsl2rgb
Conversion helpers used by `modLightness`.

### getCountryFromPath(path)
Return the country part of a map path string (handles ManiaPlanet / TMF path semantics).

### parseEntries(entries)
Convert an array of entry structures (from the API) into a key->value map, using `castType` to normalize numbers/booleans.

### htmlEntities(str)
Important for Manialinks:
- Escapes XML reserved characters (`<`, `>`, `&`, `"`, `'`)
- Removes Trackmania link formatting `$l[...]` and highlight codes `$l` and `$h`
- Replaces double hyphens `--` with an HTML entity to avoid XML comment trouble

**Use this when rendering user content in Twing templates or Manialinks**

```ts
title = htmlEntities(map.Name);
```

### removeLinks / removeColors
Helpers to strip link and color formatting.

### clone(obj)
Return deep clone using JSON serialization.

### formatTime(ms)
Return Trackmania formatted time string for given milliseconds. Uses `tm.Time` helper.

### castType(value, type?)
Convert a string into the requested type. If `type` is not provided, the function guesses the type (true/false/null/number/string).

### setMemStart / memInfo
Helpers for memory measurement and reporting useful for GC debugging.

### isDocker()
Detect if process runs inside Docker container.

### getCallerName()
Helper that logs the call site invoking code using V8 stack trace utilities (used for debugging and `tmc.cli` trace behavior when DEBUGLEVEL >= 3).

### escapeRegex / loginToUuid / uuidToLogin
Misc helpers to escape regex patterns and convert login <-> uuid encodings.

---

Best practices:
- Always use `htmlEntities()` when injecting user-provided content into Manialinks and templates.
- Use `removeColors()` to compute string comparisons or localeCompare without formatting codes.
- Prefer `parseEntries()` to convert API array payloads into objects rather than manual parsing.
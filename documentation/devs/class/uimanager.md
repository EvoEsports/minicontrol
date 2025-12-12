[Back to Concept](../concept.md)

# UiManager

UiManager is an adapter that handles the lifecycle of Manialinks and UI-related events. It acts as the single point for sending/managing Manialinks (widgets, windows, list windows etc.) to the server, converts templates for compatibility (e.g., Trackmania vs TmForever), and maintains a global and per-player manialink registry.

Most plugin code will use higher-level UI classes such as `Widget`, `Window` or `ListWindow`. You rarely need to operate with `UiManager` directly, but it is useful to understand the lifecycle and API when building custom UI components or when you need to manipulate the UI outside of those classes.

We use Twig as our template language. See Twig docs for the syntax and features: https://twig.symfony.com/doc/3.x/templates.html

Manialinks in MINIcontrol use the manialink v3 markup. For general ManiaScript / UI concepts refer to the official tutorial: https://wiki.trackmania.io/en/ManiaScript/UI-Manialinks/

> Note: Use the safe elements across supported games: `<frame>`, `<quad>`, `<label>`, `<entry>`, `<textedit>`. You can create high-quality clickable, focused areas using `focusareacolor1`/`focusareacolor2` attributes on `label` elements.

---

## Table of Contents

- [Key concepts](#key-concepts)
- [Where to access](#where-to-access)
- [Important methods and behavior](#important-methods-and-behavior)
  - [Lifecycle](#lifecycle)
  - [Rendering, display and lifecycle](#rendering-display-and-lifecycle)
  - [Actions management](#actions-management)
  - [Clipboard helper](#clipboard-helper)
  - [UI Modules & TmForever custom UI](#ui-modules--tmforever-custom-ui)
  - [Misc](#misc)
- [Examples](#examples)
- [Performance tips & notes](#performance-tips--notes)
- [Troubleshooting](#troubleshooting)
- [Related classes & docs](#related-classes--docs)

---

## Key concepts

- Public vs Player-specific manialinks
  - Public manialinks are shown to all players by default. They are registered in `UiManager.publicManialinks`.
  - Player-specific manialinks are delivered to a single player (by login) and are stored in `UiManager.playerManialinks[login]`.
  - The manager ensures that duplicates are cleaned up — if a new manialink with the same id is displayed, the old one is destroyed automatically.

- Hiding and toggles
  - The manager supports a ‘hide all manialinks’ toggle (answer code `-2`) per player. When activated the manager hides manialinks to prevent spam. When a player toggles the state it is stored in `UiManager.hiddenManialinks`.
  - Plugins / templates can provide an action to toggle hiding with `action="-2"`. for users this is bind to pressing F7 key.

- Action handlers
  - Use the UiManager action registry to register callback handlers for events emitted by manialinks. Use `tmc.ui.addAction(callback, data)` to create an action id, then use that id in templates. The manager will call the registered callback on click.

- TmForever compatibility
  - For TmForever the manager has a conversion step that transforms`pos`/`size` attributes into `posn`/`sizen` with appropriate scaling and maps `z-index` to the third coordinate. This conversion happens using `UiManager.convert()` (called automatically when sending manialinks).

---

## Where to access

Use the runtime global: `tmc.ui`. For example in plugin TypeScript code:

```ts
// show a Widget via UI manager
const widget = new Widget("widget.xml.twig", import.meta.dir);
await tmc.ui.displayManialink(widget);
```

Most UI classes will have `display()` convenience methods that internally call `tmc.ui.displayManialink()` for you.

---

## Important methods and behavior

Below are the most relevant methods available on `UiManager` with descriptions and small examples.
For all method signatures below assume access via `tmc.ui`.

### Lifecycle
- `init()` (internal): sets up event handlers and registers TmForever HUD settings. Called by the core at startup.
- `afterInit()` (internal): finishes initialization actions such as sending the global manialink and synchronizing HUD settings.

### Rendering, display and lifecycle
- `displayManialink(manialink: Manialink)`
  - Register and show a manialink. Handles both public and per-player manialinks. Destroys older manialinks with the same id.
  - For player-specific manialinks, if the manialink is an instance of `Window`, all existing `Window` manialinks for that player are destroyed first.
  - Example:
  ```ts
  const widget = new Widget("widget.xml.twig", import.meta.dir);
  await tmc.ui.displayManialink(widget);
  ```

- `displayManialinks(manialinks: Manialink[])`
  - Equivalent to calling `displayManialink` multiple times, but optimized and sends calls in batches (chunked) to avoid flooding the server.
  - Example (using UI objects, preferred):
  ```ts
  const w1 = new Widget('a.xml.twig', import.meta.dir);
  const w2 = new Widget('b.xml.twig', import.meta.dir);
  await tmc.ui.displayManialinks([w1, w2]);
  ```
  - Under the hood: UiManager renders each Manialink, builds the XML call array and uses `tmc.server.multisend()` in batches to efficiently dispatch them.
  - If you need a fully manual approach, build an array of calls and call `tmc.server.multisend(calls)` directly. This is useful if you already have XML and don't need UiManager to render/track objects.
  - See the UI System Examples for a `multisend` example: [UI System — Example: Batch display manialinks (multisend)](../ui-system.md#example-4-batch-display-manialinks-multisend)

- `refreshManialink(manialink: Manialink)`
  - Re-renders and sends the existing manialink again (keep the same id). Useful when only the data changed.

- `hideManialink(manialink: Manialink)`
  - Hides a manialink without destroying it (sends an empty manialink id payload). Useful for toggling visibility without destroying references.

- `destroyManialink(manialink: Manialink, hide = true)`
  - Destroy and cleanup a manialink. This removes action handlers from the internal registry, calls `manialink.cleanReferences()` (which plugin Manialink objects should implement), and removes it from the public or player maps. If `hide` is true, calls `hideManialink()` first.

### Actions management
- `addAction(callback: CallableFunction, data: any): string`
  - Register an action that can be used by templates. Returns an action id. When the user clicks an element with that action, the callback runs with (login, data, entries) arguments.
  - Example:
  ```ts
  const action = tmc.ui.addAction((login, data) => {
      // callback code
  }, { plugin: "example" });
  // use `action` in your template e.g. <label action="{action}" />
  ```

- `removeAction(actionId: string)`
  - Remove previously registered action. This is typically called by the manialink `destroy()` method.

### Clipboard helper
- `setClipboard(login: string, text: string)`
  - Convenience method to set the clipboard for a specific player (sends a manialink with a script call to `System.ClipboardSet`). The method properly escapes quotes and replaces dangerous sequences like `--` to avoid script comment injection.
  - Example:
  ```ts
  tmc.ui.setClipboard(playerLogin, "https://example.com/download/123");
  ```

### UI Modules & TmForever custom UI
- `getUiProperties()`
  - Fetch UI module properties from the server (used in Trackmania for finer UI adjustments).
- `setUiProperty(id: string, property: string, value: any)`
  - Set a property for a specific UI module (e.g., scale, position or visibility). If the module is not found in the local cache this method logs an error.
- `sendUiProperties()`
  - Push the locally modified UI module properties back to the server using `Common.UIModules.SetProperties`.

For TmForever there is a small set of HUD elements that can be toggled using a custom UI feature. UiManager keeps a `tmnfCustomUi` object (default values defined in code), and exposes helpers:

- `setCustomUI(key: string, value: boolean)` — update a tmnf custom UI key and send it to the server
- `getCustomUI()` — returns the current map of tmnf custom UI keys
- `syncTmfHudSettings()` — reads the registered `tmf.hud.*` settings and synchronize the manager state

These functions are used to implement HUD toggling for TmForever and to send the correct custom UI object in a `SendDisplayManialinkPage` call.

### Misc
- `uuid(): string` — returns a unique id for manialinks. Prefixed with `tmc` for non TmForever games.
- `convert(text: string): string` — For TmForever only: convert legacy pos/size attributes to `posn`/`sizen` and transforms `z-index` values. This is run automatically when sending manialinks via `UiManager`.

---

## Examples

### Display a public widget
```ts
import Widget from "../core/ui/widget";

const widget = new Widget("widget.xml.twig", import.meta.dir);
await tmc.ui.displayManialink(widget);
```

### Register and use actions
```ts
const actionId = tmc.ui.addAction((login, data, entries) => {
  tmc.cli(`${login} clicked`);
  // you can use the passed `data` as context
}, { some: "payload" });

// in your template
// <label action="{actionId}" text="Click me" />

// When the manialink is destroyed, the UiManager will call removeAction automatically
```

### Use clipboard helper
```ts
tmc.ui.setClipboard("playerLogin", "https://example.com/maps/123");
```

### Hiding manialinks (from the built-in global manialink)
The manager sends a default global manialink with a label action set to `-2`. Players can toggle the hidden state; the manager will store it and will avoid sending manialinks to players with hidden state enabled.

---

## Performance tips & notes

- `displayManialinks` chunks multiple manialinks to avoid server flooding. The internal chunk size is set to 15 calls per batch and uses `tmc.server.multisend()`.
- Avoid re-rendering a manialink every frame; use `refreshManialink()` only when you need to update content.
- Actions are stored internally in a hash table. Always clean resources and let your manialink `destroy()` method remove them.

## Troubleshooting

- If pos/size attributes appear wrong in TmForever, confirm that the template uses standard `pos`/`size` and let UiManager `convert()` run. For advanced control prefer to use `posn/sizen` explicitly when authoring templates for TmForever.
- If a player cannot see your manialink, check `hiddenManialinks`, and whether the manialink `canHide` flag exists in the manialink class. Players that have hidden manialinks won't see public manialinks that allow hiding.

---

## Related classes & docs

- [Widget Class](./widget.md) — Persistent HUD widgets that use `UiManager` indirectly
- [Window Class](./window.md) — Temporary dialogs and overlays
- [ListWindow Class](./listwindow.md) — Paginated data table helpers (extends `Window`)
- [UI System Overview](../ui-system.md) — Full guide to templates, classes, and examples
- `core/uimanager.ts` — Implementation reference (source code): `core/uimanager.ts`

Other related manager docs:
- [PlayerManager](playermanager.md) — Player helper functions and login list retrieval
- [SettingsManager](settingsmanager.md) — HUD and persistent settings used by UiManager (tmf.hud.* settings)
- [Maps Manager](maps.md) — Example usage of `ListWindow` and UI for maps listing
- [Chat & Commands](chatcmd.md) — Interactions with ListWindow and UI-based help pages

If you want more examples added (e.g., ListWindow batching, multi-recipient updates), tell me which examples and I'll add them to this doc. ✅

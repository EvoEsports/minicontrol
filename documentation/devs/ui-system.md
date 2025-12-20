[Back to Concept](concept.md)

# UI System Documentation

MINIcontrol provides a powerful UI system for creating in-game interfaces using Manialink XML. The system is built on top of the Twing template engine and provides several base classes for different UI patterns.

## Table of Contents

- [Overview](#overview)
- [Class Hierarchy](#class-hierarchy)
- [Base Class: Manialink](#base-class-manialink)
- [Widget Class](#widget-class)
- [Window Class](#window-class)
- [ListWindow Class](#listwindow-class)
- [Confirm Dialog](#confirm-dialog)
- [UI Utilities](#ui-utilities)
- [JSX Renderer & Forge](./ui2.md) • [Forge API](./forge.md)
- [Template System](#template-system)
- [Examples](#examples)

---

## Overview

The UI system consists of four main classes:

- **Manialink**: Base class for all UI elements
- **Widget**: For persistent UI elements (HUD widgets, buttons)
- **Window**: For temporary dialogs and overlays
- **ListWindow**: For paginated data tables with sorting and actions

All UI classes use **Twing templates** (Twig for TypeScript) to render Manialink XML, which is the format used by Trackmania for in-game interfaces.

---

## Class Hierarchy

```
Manialink (base class)
  ├── Widget (persistent UI elements)
  ├── Window (temporary dialogs)
  │     └── ListWindow (paginated data tables)
  └── Confirm (confirmation dialogs)
## Base Class: Manialink
```

## Best Practices

The `Manialink` class is the foundation for all UI elements.

### Constructor

```typescript
constructor(login?: string, baseDir?: string)
```

**Parameters:**
- `login` (optional): Target player login. If undefined, displays to all players.
- `baseDir` (optional): Base directory for template resolution (use `import.meta.dirname` in plugins).

### Core Properties

```typescript
id: string                  // Unique identifier (auto-generated)
size: MlSize               // { width: number, height: number }
pos: MlPos                 // { x: number, y: number, z: number }
template: string           // Path to Twing template file
layer: string              // "normal" | "ScoresTable" | "ScreenIn3d" | "altmenu" | "cutscene"
recipient: string          // Target player login (undefined = all players)
title: string              // Window/Widget title
data: object               // Custom data passed to template
actions: object            // UI action callbacks
```

### Core Methods

#### `display()`
Displays the Manialink to the target player(s).

```typescript
await manialink.display();
```

#### `hide()`
Hides the Manialink from the target player(s).

```typescript
await manialink.hide();
```

#### `destroy(hide = true)`
Destroys the Manialink and optionally hides it.

```typescript
await manialink.destroy();
```

#### `render()`
Renders the template with current data. Usually called internally by `display()`.

```typescript
const xml = await manialink.render();
```

### Position and Size

Position coordinates use Manialink units (1 unit ≈ 1% of screen width/height):

```typescript
// Center of screen
manialink.pos = { x: 0, y: 0, z: 1 };

// Top-right corner
manialink.pos = { x: 120, y: 80, z: 1 };

// Standard window size
manialink.size = { width: 100, height: 100 };
```

### Actions

Actions are callbacks triggered by player interactions:

```typescript
const manialink = new Manialink();

// Register an action
manialink.actions.myAction = tmc.ui.addAction(
    this.handleClick.bind(this),
    "optional-data"
);

async handleClick(login: string, data: any) {
    tmc.chat(`Player ${login} clicked! Data: ${data}`);
}
```

In your template:
```xml
<label text="Click Me" action="{{ actions.myAction }}" />
```

---

## Widget Class

Widgets are **persistent UI elements** displayed on the HUD (e.g., buttons, status displays).

### Constructor

```typescript
constructor(path = "core/templates/widget.xml.twig", baseDir?: string)
```

**Parameters:**
- `path`: Template path (defaults to standard widget template)
- `baseDir`: Base directory for template resolution

### Default Properties

```typescript
size: MlSize = { width: 32, height: 50 }  // Smaller than windows
recipient: undefined                       // Displays to all players by default
```

### Helper Methods

#### `setOpenAction(action: CallableFunction)`
Sets the action triggered when the widget title is clicked.

```typescript
widget.setOpenAction(this.onWidgetClick.bind(this));

async onWidgetClick(login: string) {
    tmc.chat(`${login} clicked the widget!`);
}
```

#### `setOpenActionId(actionId: string)`
Sets a pre-existing action ID for the widget title click.

```typescript
const actionId = tmc.ui.addAction(callback, data);
widget.setOpenActionId(actionId);
```

#### `setData(data: any)`
Sets custom data for the template.

```typescript
widget.setData({
    recordCount: 42,
    currentRank: 5,
    playerName: "Example"
});
```

### Example: Simple Widget

```typescript
import Plugin from "@core/plugins";
import Widget from "@core/ui/widget";

export default class StatusWidget extends Plugin {
    widget?: Widget;

    async onStart() {
        // Create widget
        this.widget = new Widget("statusWidget.xml.twig", import.meta.dirname);

        // Configure position and size
        this.widget.pos = { x: 120, y: -65, z: 10 };
        this.widget.size = { width: 30, height: 10 };
        this.widget.title = "Status";

        // Set custom data
        this.widget.data = {
            playersOnline: tmc.players.length,
            serverName: tmc.server.name
        };

        // Display to all players
        await this.widget.display();
    }

    async onUnload() {
        await this.widget?.destroy();
    }
}
```

**Template** (`statusWidget.xml.twig`):
```xml
{% extends "core/templates/widget.xml.twig" %}

{% block content %}
<frame pos="2 -2" z-index="1">
    <label pos="0 0" text="Players: {{ data.playersOnline }}" textsize="1.5" />
    <label pos="0 -4" text="Server: {{ data.serverName }}" textsize="1.2" />
</frame>
{% endblock %}
```

---

## Window Class

Windows are **temporary dialogs** displayed to individual players.

### Constructor

```typescript
constructor(login: string)
```

**Parameters:**
- `login`: Target player login (required)

### Features

- Automatically adds a **close action** bound to `destroy()`
- Targeted to a specific player
- Uses `core/templates/window.xml.twig` by default

### Example: Simple Window

```typescript
import Window from "@core/ui/window";

const window = new Window(login);
window.title = "Welcome!";
window.size = { width: 80, height: 40 };
window.pos = { x: -40, y: 20, z: 50 };

window.data = {
    message: "Welcome to the server!",
    motd: "Have fun racing!"
};

await window.display();
```

---

## ListWindow Class

ListWindow extends Window to provide **paginated data tables** with sorting, filtering, and row actions.

### Constructor

```typescript
constructor(login: string)
```

### Core Properties

```typescript
items: any[]               // Data items to display
pageSize: number          // Items per page (default: 15)
sortColumn: string        // Current sort column key
listActions: string[]     // Available row actions (e.g., ["View", "Delete"])
```

### Configuration Methods

#### `setColumns(columns: Column[])`
Defines table columns.

```typescript
interface Column {
    key: string;           // Property key in item object
    title: string;         // Column header text
    width: number;         // Column width in Manialink units
    type?: "entry";        // Optional: makes column editable
    action?: string;       // Optional: makes column clickable
}

window.setColumns([
    { key: "rank", title: "Rank", width: 10 },
    { key: "nickname", title: "Player", width: 50 },
    { key: "time", title: "Time", width: 20 }
]);
```

#### `setItems(items: any[])`
Sets the data items to display.

```typescript
window.setItems([
    { rank: 1, nickname: "Player1", time: "1:23.456" },
    { rank: 2, nickname: "Player2", time: "1:24.789" },
    // ...
]);
```

#### `setActions(actions: string[])`
Defines row actions (buttons displayed for each row).

```typescript
window.setActions(["View", "Delete", "Edit"]);
```

### Pagination & Sorting

Pagination and sorting are **handled automatically**:
- Click column headers to sort
- Use pagination buttons (start, prev, next, end)
- Override `doSort()` for custom sorting logic

### Event Handlers

Override these methods to handle user interactions:

#### `onAction(login: string, action: string, item: any)`
Called when a row action is clicked.

```typescript
async onAction(login: string, action: string, item: any) {
    if (action === "Delete") {
        // Show confirmation dialog
        const confirm = new Confirm(
            login,
            `Delete ${item.nickname}?`,
            this.handleDelete.bind(this),
            [item.id]
        );
        await confirm.display();
    } else if (action === "View") {
        // Show details window
        tmc.chat(`Viewing details for ${item.nickname}`);
    }
}
```

#### `onPageItemsUpdate(items: any[])`
Called when page changes (useful for loading additional data).

```typescript
async onPageItemsUpdate(items: any[]) {
    // Load additional data for visible items
    for (const item of items) {
        item.extraData = await fetchExtraData(item.id);
    }
}
```

#### `onApply(login: string, answer: any, entries: any)`
Called when apply button is clicked (if using `addApplyButtons()`).

```typescript
async onApply(login: string, answer: any, entries: any) {
    // Process form submission
    this.parseEntries(entries); // Populates items with entry values
    await this.save();
    await this.hide();
}
```

### Complete Example: Records Window

```typescript
import ListWindow from "@core/ui/listwindow";
import Confirm from "@core/ui/confirm";
import Plugin from "@core/plugins";

export default class RecordsPlugin extends Plugin {
    async cmdRecords(login: string) {
        const records = await this.getRecords();

        const window = new RecordsWindow(login, records);
        window.size = { width: 100, height: 100 };
        window.title = `Server Records [${records.length}]`;

        await window.display();
    }
}

class RecordsWindow extends ListWindow {
    constructor(login: string, records: any[]) {
        super(login);

        // Configure columns
        this.setColumns([
            { key: "rank", title: "Rank", width: 10 },
            { key: "nickname", title: "Player", width: 50 },
            { key: "time", title: "Time", width: 20 },
        ]);

        // Set data
        this.setItems(records);

        // Add actions (buttons for each row)
        this.setActions(["View", "Delete"]);
    }

    async onAction(login: string, action: string, item: any) {
        if (action === "Delete") {
            const confirm = new Confirm(
                login,
                `Delete record from ${item.nickname}?`,
                this.deleteRecord.bind(this),
                [item.id]
            );
            await confirm.display();
        } else if (action === "View") {
            tmc.chat(`Viewing record details for ${item.nickname}`);
        }
    }

    async deleteRecord(login: string, recordId: number) {
        await Score.destroy({ where: { id: recordId } });
        tmc.chat("Record deleted!");

        // Refresh the list
        await tmc.chatCmd.execute(login, "/records");
    }
}
```

---

## Confirm Dialog

The `Confirm` class extends `Widget` and provides a standardized confirmation dialog for destructive or important actions.

### Constructor

```typescript
constructor(login: string, question: string, callback: CallableFunction, params: any)
```

**Parameters:**
- `login`: Target player login (required)
- `question`: Question text to display to the user
- `callback`: Function to call when user confirms
- `params`: Array of parameters to pass to the callback

### Properties

```typescript
title: string = "Confirm required"  // Dialog title
size = { width: 90, height: 40 }   // Default size
pos = { x: 0, y: 20, z: 10 }       // Centered position
```

### Behavior

- Displays a dialog with the question and two buttons: **Confirm** and **Cancel**
- Clicking **Confirm** executes the callback with provided params
- Clicking **Cancel** or close button dismisses the dialog
- Automatically destroys itself after user interaction

### Example: Confirm Delete Action

```typescript
import Confirm from "@core/ui/confirm";
import ListWindow from "@core/ui/listwindow";

class RecordsWindow extends ListWindow {
    async onAction(login: string, action: string, item: any) {
        if (action === "Delete") {
            // Show confirmation dialog
            const confirm = new Confirm(
                login,
                `Delete record from ${item.nickname}? (no undo)`,
                this.deleteRecord.bind(this),
                [item.id]
            );
            await confirm.display();
        }
    }

    async deleteRecord(recordId: number) {
        await Score.destroy({ where: { id: recordId } });
        tmc.chat("Record deleted!");
    }
}
```

### Example: Confirm Map Removal

```typescript
import Confirm from "@core/ui/confirm";

export default class MapsPlugin extends Plugin {
    async cmdRemove(login: string, args: string[]) {
        const mapUid = args[0];
        const map = tmc.maps.getMap(mapUid);

        if (!map) {
            tmc.chat("Map not found!", login);
            return;
        }

        const confirm = new Confirm(
            login,
            `Remove ${map.Name} from server?`,
            this.executeRemove.bind(this),
            [login, mapUid]
        );
        await confirm.display();
    }

    async executeRemove(login: string, mapUid: string) {
        await tmc.server.call("RemoveMap", [mapUid]);
        tmc.chat(`Map removed!`, login);
    }
}
```

### Best Practices

1. **Use for Destructive Actions**: Always use Confirm for actions that can't be undone (delete, ban, kick, etc.)

2. **Clear Question Text**: Make the question specific and include context:
   ```typescript
   // ✅ Good: Specific and clear
   new Confirm(login, `Ban player ${nickname}? (permanent)`, ...)

   // ❌ Bad: Vague
   new Confirm(login, "Are you sure?", ...)
   ```

3. **Bind Callback Context**: Always bind your callback to preserve `this` context:
   ```typescript
   // ✅ Good: Preserves context
   new Confirm(login, question, this.callback.bind(this), params)

   // ❌ Bad: Loses context
   new Confirm(login, question, this.callback, params)
   ```

4. **Pass All Required Data**: Include all necessary data in params array:
   ```typescript
   // ✅ Good: All data included
   new Confirm(login, question, this.callback.bind(this), [itemId, itemName, login])

   // ❌ Bad: Relying on closure can cause issues
   new Confirm(login, question, () => this.callback(itemId), [])
   ```

---

## UI Utilities

The UI Manager provides several utility methods for working with the UI system.

### Copy to Clipboard

Sets the player's clipboard content using ManiaScript.

```typescript
tmc.ui.setClipboard(login: string, text: string)
```

**Parameters:**
- `login`: Target player login
- `text`: Text to copy to clipboard

**Example: Copy Map UID**

```typescript
export default class MapsPlugin extends Plugin {
    async cmdCopyUid(login: string) {
        const mapUid = tmc.maps.currentMap.UId;
        tmc.ui.setClipboard(login, mapUid);
        tmc.chat(`Map UID copied to clipboard!`, login);
    }
}
```

**Example: Copy Server Join Link**

```typescript
export default class InfoPlugin extends Plugin {
    async cmdCopyLink(login: string) {
        const joinLink = `tmtp://#join=${tmc.server.login}`;
        tmc.ui.setClipboard(login, joinLink);
        tmc.chat(`Join link copied! Share it with friends.`, login);
    }
}
```

**Example: In ListWindow Action**

```typescript
class MapsWindow extends ListWindow {
    async onAction(login: string, action: string, item: any) {
        if (action === "Copy UID") {
            tmc.ui.setClipboard(login, item.UId);
            tmc.chat(`$o${item.Name}$z UID copied!`, login);
        }
    }
}
```

### Implementation Details

- Uses ManiaScript's `System.ClipboardSet()` function
- Works in Trackmania (ManiaScript supported)
- May not work in older ManiaPlanet titles
- Text is automatically escaped for XML safety
- Double-hyphens (`--`) are replaced with em-dashes to prevent XML comment issues

### Escaping User Input

When displaying user-generated content (nicknames, map names, chat messages) in Manialinks, always use `htmlEntities()` to prevent XML injection and formatting issues.

```typescript
import { htmlEntities } from "@core/utils";
```

**What it does:**
- Escapes special XML characters (`<`, `>`, `&`, `"`, `'`, etc.)
- Removes or sanitizes Trackmania formatting codes (`$l`, `$h` for links/highlights)
- Prevents double-hyphen (`--`) from breaking XML comments
- Converts Unicode characters to HTML entities

**Example: Safe Window Title**

```typescript
import { htmlEntities } from "@core/utils";

const window = new RecordsWindow(login);
// ✅ Good: Escape user input
window.title = `Records for ${htmlEntities(map.Name)}`;

// ❌ Bad: Raw user input (can break XML)
window.title = `Records for ${map.Name}`;
```

**Example: Safe List Items**

```typescript
const records = await this.getRecords();

const items = records.map(record => ({
    rank: record.rank,
    // ✅ Good: Escape nickname
    nickname: htmlEntities(record.player.nickname),
    // ✅ Good: Escape custom nickname if present
    customNick: htmlEntities(record.player.customNick ?? ""),
    time: formatTime(record.time)
}));

window.setItems(items);
```

**Example: Safe Data for Templates**

```typescript
widget.data = {
    // ✅ Good: Escape all user-generated content
    playerName: htmlEntities(player.nickname),
    mapName: htmlEntities(tmc.maps.currentMap.Name),
    serverName: htmlEntities(tmc.server.name)
};
```

**When to use `htmlEntities()`:**
- Player nicknames (always)
- Map names (always)
- Server names (always)
- Any user input or external data
- Custom text from database

**When NOT to use `htmlEntities()`:**
- Trackmania formatting codes you want to preserve (use in template instead)
- Pre-formatted time strings from `formatTime()`
- Numeric values
- Hardcoded strings in your code

**Related Utilities:**

```typescript
// Remove Trackmania color/formatting codes
import { removeColors } from "@core/utils";
const plainText = removeColors("$f00Red$z text");  // "Red text"

// Remove link formatting codes
import { removeLinks } from "@core/utils";
const noLinks = removeLinks("$l[url]Link$l text");  // "Link text"
```

---

## Template System

Templates are written in **Twing** (Twig syntax for TypeScript) and render to Manialink XML.

### Template Resolution

When you set `manialink.template = "mytemplate.xml.twig"`:

1. **Path with separators** (e.g., `"core/templates/widget.xml.twig"`):
   - Resolved relative to project root (`process.cwd()`)

2. **Bare filename** (e.g., `"widget.xml.twig"`):
   - If `baseDir` was provided: resolved relative to `baseDir`
   - Otherwise: uses stack inspection to find caller directory (plugins)
   - Fallback: project root

**Best Practice**: Pass `import.meta.dirname` as `baseDir` in plugin constructors:

```typescript
export default class MyPlugin extends Plugin {
    async onStart() {
        // ✅ Good: explicit baseDir
        const widget = new Widget("mywidget.xml.twig", import.meta.dirname);

        // ❌ Avoid: relies on stack inspection (error-prone)
        const widget2 = new Widget("mywidget.xml.twig");
    }
}
```

### Base Templates

MINIcontrol provides base templates you can extend:

#### `core/templates/widget.xml.twig`
Standard widget with title bar and content area.

```xml
{% extends "core/templates/widget.xml.twig" %}

{% block content %}
    <!-- Your widget content here -->
{% endblock %}
```

#### `core/templates/window.xml.twig`
Standard window with title, close button, and content area.

```xml
{% extends "core/templates/window.xml.twig" %}

{% block content %}
    <!-- Your window content here -->
{% endblock %}
```

#### `core/templates/list.xml.twig`
Complete data table with pagination (used by ListWindow).

### Available Template Variables

Templates have access to these variables:

```typescript
{
    id: string,              // Manialink ID
    layer: string,           // Display layer
    size: { width, height }, // Size in units
    pos: { x, y, z },       // Position coordinates
    actions: object,         // Action IDs for callbacks
    colors: object,          // Theme colors from settings
    data: object,            // Custom data from your code
    title: string,           // Title text
    game: string,            // Game name ("Trackmania", etc.)
    recipient: string        // Target player login
}
```

### Custom Templates

Create custom templates in your plugin directory:

**`myPlugin/myWidget.xml.twig`**:
```xml
{% extends "core/templates/widget.xml.twig" %}

{% block content %}
<frame pos="2 -2" z-index="1">
    <label pos="0 0" text="$o{{ data.title }}" textsize="2" />
    <label pos="0 -5" text="{{ data.subtitle }}" textsize="1.5" />

    {% for item in data.items %}
    <label pos="0 -{{ 10 + loop.index * 5 }}"
           text="{{ item.name }}"
           action="{{ actions['item_' ~ loop.index] }}" />
    {% endfor %}
</frame>
{% endblock %}

{% block maniascript %}
<script><![CDATA[
    main() {
        // Custom ManiaScript code
    }
]]></script>
{% endblock %}
```

**Usage**:
```typescript
const widget = new Widget("myWidget.xml.twig", import.meta.dirname);
widget.data = {
    title: "My Widget",
    subtitle: "Powered by MINIcontrol",
    items: [
        { name: "Item 1" },
        { name: "Item 2" }
    ]
};

// Register actions for items
widget.actions.item_1 = tmc.ui.addAction(this.onClick.bind(this), 1);
widget.actions.item_2 = tmc.ui.addAction(this.onClick.bind(this), 2);

await widget.display();
```

---

## Examples

### Example 1: Menu Button Widget

```typescript
import Plugin from "@core/plugins";
import Widget from "@core/ui/widget";

export default class MenuPlugin extends Plugin {
    menuButton?: Widget;

    async onStart() {
        this.menuButton = new Widget("menuButton.xml.twig", import.meta.dirname);
        this.menuButton.pos = { x: 120, y: -65, z: 10 };
        this.menuButton.size = { width: 12, height: 5 };
        this.menuButton.setOpenAction(this.toggleMenu.bind(this));
        await this.menuButton.display();
    }

    async toggleMenu(login: string) {
        tmc.chat(`${login} opened the menu`);
        // Show menu window...
    }

    async onUnload() {
        await this.menuButton?.destroy();
    }
}
```

### Example 2: Player List Window

```typescript
import Plugin from "@core/plugins";
import ListWindow from "@core/ui/listwindow";

export default class PlayersPlugin extends Plugin {
    async cmdPlayers(login: string) {
        const players = tmc.players.map((p, i) => ({
            rank: i + 1,
            nickname: p.nickname,
            login: p.login,
            zone: p.path
        }));

        const window = new PlayersWindow(login, players);
        await window.display();
    }
}

class PlayersWindow extends ListWindow {
    constructor(login: string, players: any[]) {
        super(login);

        this.title = `Players Online [${players.length}]`;
        this.size = { width: 120, height: 100 };
        this.pos = { x: -60, y: 50, z: 50 };

        this.setColumns([
            { key: "rank", title: "#", width: 8 },
            { key: "nickname", title: "Nickname", width: 60 },
            { key: "zone", title: "Location", width: 40 }
        ]);

        this.setItems(players);
        this.setActions(["Kick", "Ban"]);
    }

    async onAction(login: string, action: string, item: any) {
        if (!tmc.admins.includes(login)) {
            tmc.chat("Admin only!", login);
            return;
        }

        if (action === "Kick") {
            await tmc.server.call("Kick", [item.login]);
        } else if (action === "Ban") {
            await tmc.server.call("Ban", [item.login]);
        }
    }
}
```

### Example 3: Editable Settings Window

```typescript
class SettingsWindow extends ListWindow {
    constructor(login: string, settings: any[]) {
        super(login);

        this.title = "Server Settings";

        // Editable columns (type: "entry")
        this.setColumns([
            { key: "name", title: "Setting", width: 40 },
            { key: "value", title: "Value", width: 30, type: "entry" }
        ]);

        this.setItems(settings);
        this.addApplyButtons(); // Adds Apply/Cancel buttons
    }

    async onApply(login: string, answer: any, entries: any) {
        // Parse entry values into items
        this.parseEntries(entries);

        // Save updated settings
        for (const item of this.items) {
            await tmc.settings.set(item.name, item.value);
        }

        tmc.chat("Settings saved!", login);
        await this.hide();
    }
}
```

---

### Example 4: Batch display manialinks (multisend)

When you need to display many Manialinks or send UI updates to many players at once, use `tmc.server.multisend()` to bundle calls and send them in a single transport round-trip. This reduces latency and avoids flooding the server with sequential calls.

Example: build a set of per-player display calls and send them in one batch:

```ts
const xmlContent = `<?xml version="1.0" encoding="UTF-8"?><manialinks>...your generated xml...</manialinks>`;

const logins = ["player1", "player2", "player3"];
const calls = logins.map((login) => ["SendDisplayManialinkPageToLogin", login, xmlContent, 0, false]);

// Dispatch all sends in a single request
await tmc.server.multisend(calls);
```

Tip: If you are dealing with Manialink objects, prefer `tmc.ui.displayManialinks(manialinkArray)`. UiManager renders, chunk-sizes (to avoid flooding), and uses `multisend()` internally for best performance.

---

## Best Practices

### 1. Always Clean Up UI Elements

```typescript
export default class MyPlugin extends Plugin {
    widget?: Widget;

    async onStart() {
        this.widget = new Widget();
        await this.widget.display();
    }

    async onUnload() {
        // ✅ Always destroy UI in onUnload
        await this.widget?.destroy();
        this.widget = undefined;
    }
}
```

### 2. Use `import.meta.dirname` for Plugin Templates

```typescript
// ✅ Good: explicit baseDir
const widget = new Widget("mywidget.xml.twig", import.meta.dirname);

// ❌ Avoid: relies on stack inspection
const widget = new Widget("mywidget.xml.twig");
```

### 3. Store Per-Player Windows in a Map

```typescript
export default class MyPlugin extends Plugin {
    windows: Map<string, Window> = new Map();

    async showWindow(login: string) {
        // Close existing window if any
        const existing = this.windows.get(login);
        if (existing) {
            await existing.destroy();
        }

        // Create new window
        const window = new MyWindow(login);
        this.windows.set(login, window);
        await window.display();
    }

    async onUnload() {
        // Clean up all windows
        for (const window of this.windows.values()) {
            await window.destroy();
        }
        this.windows.clear();
    }
}
```

### 4. Use Z-Index to Layer UI Elements

```typescript
// Background layer
widget.pos.z = 1;

// Foreground layer
window.pos.z = 50;

// Overlay (highest priority)
modal.pos.z = 100;
```

### 5. Responsive Positioning

```typescript
// Center horizontally
widget.pos.x = 0;

// Anchor to right side
widget.pos.x = 120;

// Anchor to bottom
widget.pos.y = -80;
```
---


## Troubleshooting

### Template Not Found

**Error**: `Failed to load template mytemplate.xml.twig`

**Solution**: Check template path resolution:
1. Verify file exists in expected location
2. Pass `import.meta.dirname` as `baseDir` parameter
3. Use full path from project root (e.g., `core/plugins/myplugin/template.xml.twig`)

### Action Not Triggering

**Problem**: Clicking UI element does nothing

**Solution**:
1. Verify action is registered: `manialink.actions.myAction = tmc.ui.addAction(...)`
2. Check template references action correctly: `action="{{ actions.myAction }}"`
3. Ensure callback is bound: `this.callback.bind(this)`

### ListWindow Not Displaying Items

**Problem**: Empty table appears

**Solution**:
1. Call `setColumns()` before `setItems()`
2. Verify item objects have properties matching column keys
3. Ensure `display()` is called after configuration

### Window Hidden Behind Other UI

**Problem**: Window appears but is not clickable

**Solution**: Increase z-index:
```typescript
window.pos.z = 100; // Higher z-index = foreground
```

---

## Related Documentation

- [Plugin Development Guide](./plugins.md)
- [Manialink XML Reference](https://doc.maniaplanet.com/creation/manialink/index.html)
- [Twing Template Engine](https://nightlycommit.github.io/twing/)


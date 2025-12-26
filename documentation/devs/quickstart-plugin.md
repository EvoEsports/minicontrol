[Back to Concept](concept.md)

# Quickstart: Creating a plugin for MINIcontrol

This guide shows the minimal steps required to create, install and test a simple plugin using the MINIcontrol framework.

## Steps

1. Create a plugin folder (recommended under `userdata/plugins/` for development):

```bash
mkdir -p userdata/plugins/example-plugin
```

2. Create `manifest.json` in the plugin folder. Minimal manifest:

```json
{
    "id": "example-plugin",
    "name": "Example Plugin",
    "version": "0.1.0",
    "requiresMinicontrolVersion": "^0.12.0",
    "date": "2025-12-10"
}
```

3. Create an `index.ts` file that exports a default class extending `Plugin` (found at `core/plugins/index.ts`). Example skeleton:

```ts
import Plugin from '@core/plugins';

export default class ExamplePlugin extends Plugin {
    async onLoad() {
        // Register listeners and commands here
        this.addListener('TMC.PlayerConnect', this.onPlayerConnect, this);
    }

    async onStart() {
        // Called after MiniControl is fully started
    }

    async onUnload() {
        // Cleanup resources here
    }

    async onPlayerConnect(player: any) {
        tmc.chat(`Welcome ${player.nickname}!`);
    }
}
```

4. Install the plugin (copying folder into `userdata/plugins`) if you're developing outside the runtime (PluginLoader will validate manifest):

```ts
const loader = new PluginLoader();
await loader.install('path/to/your/local/plugin');
```

5. Test the plugin features

-   Use chat commands you registered
-   Click widget UI elements
-   Check logs and manifest validation messages if the plugin did not load

---

## Tips & Troubleshooting

-   Use `import.meta.dirname` to ensure Twing template resolution finds your templates.
-   If MiniControl refuses to load your plugin, check the `requiresMinicontrolVersion` range in `manifest.json` and your installed `tmc.version`.
-   Use `tmc.cli()` and `tmc.debug()` to write helpful debug messages.
-   If the loader reports missing dependencies, ensure dependent plugins are present and satisfy semver ranges.

---

## Example

You can find a complete minimal example plugin in the repo under `documentation/devs/example-plugin`

Happy hacking! 🎉

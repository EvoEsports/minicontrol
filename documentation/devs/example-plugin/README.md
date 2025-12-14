# Example Plugin

This sample plugin demonstrates several features for plugin authors:

- Registering commands (public and admin)
- Demonstrating ListWindow and Widget UIs
- Using `tmc.billMgr` to create SendBill transactions and lifecycle callbacks
- Using settings and colors via `this.addSetting` and `this.addColor`
- Using `tmc.ui.setClipboard` to copy text into player's clipboard

Commands:

- `/ex-hello` — Greet the player with greeting from `example.greeting` setting
- `/ex-msg <target> <message>` — Send a private chat message to `target`
- `/ex-list` — Show a ListWindow of connected players
- `/ex-copy` — Copy the current map UID into player's clipboard
- `//ex-bill <target> <amount> <message>` — Admin-only command: create a bill to `target` for `amount` with message
- `//ex-admin` — Admin-only example command

Developer notes:

- The plugin uses `import.meta.dirnamename` to resolve its template paths.
- Settings and colors registered using plugin base methods will be cleaned up automatically on plugin destroy.

How to test:

1) Start the controller
2) Ensure `userdata/plugins/example-plugin` exists or install it via `tmc.installPlugin("path/to/example-plugin")`.
3) Run `await tmc.loadPlugin('example-plugin')` during runtime.
4) Try `/ex-hello` or `/ex-list` from the in-game chat. For admin commands, use an admin account and `//ex-bill`.

